import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { sendWorkflowExecution } from "@/inngest/utils";
import ky from "ky";
import { NodeType } from "@/generated/prisma";

const VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || "fb-lead-verify-token";
const FB_API = "https://graph.facebook.com/v20.0";

/**
 * GET — Facebook webhook verification handshake.
 * Facebook sends hub.mode, hub.verify_token, hub.challenge.
 * We echo back hub.challenge if the verify token matches.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

type FacebookLeadgenEntry = {
  id: string;
  time: number;
  changes: Array<{
    value: {
      leadgen_id: string;
      page_id: string;
      form_id: string;
      ad_id?: string;
      adgroup_id?: string;
    };
    field: string;
  }>;
};

type FacebookLeadgenWebhook = {
  object: string;
  entry: FacebookLeadgenEntry[];
};

type FacebookLeadData = {
  id: string;
  created_time: string;
  field_data: Array<{ name: string; values: string[] }>;
  form_id: string;
  page_id: string;
  ad_id?: string;
};

/**
 * POST — Receive Facebook leadgen webhook events.
 * Parses the lead, fetches full field data from Graph API,
 * and triggers the associated workflow.
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get("workflowId");

    if (!workflowId) {
      return NextResponse.json({ error: "Missing workflowId" }, { status: 400 });
    }

    const body = await request.json() as FacebookLeadgenWebhook;

    if (body.object !== "page") {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field !== "leadgen") continue;

        const { leadgen_id: leadgenId, page_id: pageId } = change.value;

        // Look up the workflow's FACEBOOK_LEAD_TRIGGER node to get the credential
        const triggerNode = await prisma.node.findFirst({
          where: {
            workflowId,
            type: NodeType.FACEBOOK_LEAD_TRIGGER,
          },
        });

        if (!triggerNode) {
          console.warn(`No FACEBOOK_LEAD_TRIGGER node in workflow ${workflowId}`);
          continue;
        }

        const nodeData = triggerNode.data as { credentialId?: string };
        if (!nodeData.credentialId) {
          console.warn(`FACEBOOK_LEAD_TRIGGER node has no credentialId in workflow ${workflowId}`);
          continue;
        }

        const credential = await prisma.credential.findUnique({
          where: { id: nodeData.credentialId },
        });

        if (!credential) {
          console.error(`Credential ${nodeData.credentialId} not found`);
          continue;
        }

        const userToken = decrypt(credential.value);

        // Exchange user token for page access token
        const pageData = await ky
          .get(`${FB_API}/${pageId}`, {
            searchParams: { access_token: userToken, fields: "access_token" },
          })
          .json<{ access_token: string }>()
          .catch(() => null);

        const pageToken = pageData?.access_token ?? userToken;

        // Fetch the full lead data
        const lead = await ky
          .get(`${FB_API}/${leadgenId}`, {
            searchParams: {
              access_token: pageToken,
              fields: "id,created_time,field_data,form_id,page_id,ad_id",
            },
          })
          .json<FacebookLeadData>()
          .catch(() => null);

        if (!lead) {
          console.error(`Failed to fetch lead data for leadgen_id ${leadgenId}`);
          continue;
        }

        // Flatten field_data into a key-value map
        const fields: Record<string, string> = {};
        for (const field of lead.field_data ?? []) {
          fields[field.name] = field.values[0] ?? "";
        }

        // Trigger the workflow
        await sendWorkflowExecution({
          workflowId,
          initialData: {
            facebookLead: {
              leadId: lead.id,
              formId: lead.form_id,
              pageId: lead.page_id,
              adId: lead.ad_id,
              createdTime: lead.created_time,
              fields,
              raw: lead,
            },
          },
        });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Facebook leads webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
