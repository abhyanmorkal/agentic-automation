import ky from "ky";
import { type NextRequest, NextResponse } from "next/server";
import { NodeType } from "@/generated/prisma";
import { sendWorkflowExecution } from "@/inngest/utils";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { decodeTriggerToken } from "@/lib/trigger-token";
import { verifyFacebookSignature } from "@/lib/webhook-security";

const VERIFY_TOKEN =
  process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || "fb-lead-verify-token";
const FB_API = "https://graph.facebook.com/v22.0";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const triggerToken = searchParams.get("token");

  if (
    mode === "subscribe" &&
    token === VERIFY_TOKEN &&
    challenge &&
    triggerToken &&
    decodeTriggerToken(triggerToken)
  ) {
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

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const triggerToken = searchParams.get("token");
    const payload = triggerToken ? decodeTriggerToken(triggerToken) : null;

    if (!payload) {
      return NextResponse.json(
        { error: "Missing or invalid trigger token" },
        { status: 400 },
      );
    }

    const rawBody = Buffer.from(await request.arrayBuffer());
    if (
      !verifyFacebookSignature(
        rawBody,
        request.headers.get("x-hub-signature-256"),
      )
    ) {
      return NextResponse.json(
        { error: "Invalid Facebook signature" },
        { status: 401 },
      );
    }

    const body = JSON.parse(rawBody.toString("utf8")) as FacebookLeadgenWebhook;

    if (body.object !== "page") {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const triggerNode = await prisma.node.findFirst({
      where: {
        id: payload.nodeId,
        workflowId: payload.workflowId,
        type: NodeType.FACEBOOK_LEAD_TRIGGER,
      },
    });

    if (!triggerNode) {
      return NextResponse.json(
        { error: "Facebook Lead trigger node not found for this token" },
        { status: 404 },
      );
    }

    const nodeData = triggerNode.data as { credentialId?: string };
    if (!nodeData.credentialId) {
      return NextResponse.json(
        { error: "Facebook Lead trigger is missing a credential" },
        { status: 400 },
      );
    }

    const credential = await prisma.credential.findUnique({
      where: { id: nodeData.credentialId },
    });

    if (!credential) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 },
      );
    }

    const userToken = decrypt(credential.value);

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field !== "leadgen") continue;

        const { leadgen_id: leadgenId, page_id: pageId } = change.value;

        const pageData = await ky
          .get(`${FB_API}/${pageId}`, {
            searchParams: { access_token: userToken, fields: "access_token" },
          })
          .json<{ access_token: string }>()
          .catch(() => null);

        if (!pageData?.access_token) {
          console.error(
            `[facebook-leads] Failed to fetch page access token for pageId=${pageId} in workflow=${payload.workflowId}.`,
          );
          continue;
        }

        const lead = await ky
          .get(`${FB_API}/${leadgenId}`, {
            searchParams: {
              access_token: pageData.access_token,
              fields: "id,created_time,field_data,form_id,ad_id",
            },
          })
          .json<FacebookLeadData>()
          .catch(() => null);

        if (!lead) {
          console.error(
            `Failed to fetch lead data for leadgen_id ${leadgenId}`,
          );
          continue;
        }

        if (!lead.page_id && pageId) {
          lead.page_id = pageId;
        }

        const fields: Record<string, string> = {};
        for (const field of lead.field_data ?? []) {
          fields[field.name] = field.values[0] ?? "";
        }

        await sendWorkflowExecution({
          workflowId: payload.workflowId,
          triggerNodeId: triggerNode.id,
          triggerType: NodeType.FACEBOOK_LEAD_TRIGGER,
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
