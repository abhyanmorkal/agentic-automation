import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";
import ky from "ky";
import { NodeType } from "@/generated/prisma";
import { buildFacebookLeadSampleViews, type FacebookLeadSampleRaw } from "@/features/triggers/components/facebook-lead-trigger/formatters";

const FB_API = "https://graph.facebook.com/v22.0";

type RequestBody = {
  workflowId: string;
  nodeId: string;
  credentialId?: string;
  pageId?: string;
  formId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.workflowId || !body.nodeId) {
      return NextResponse.json(
        { error: "workflowId and nodeId are required" },
        { status: 400 },
      );
    }

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflow = await prisma.workflow.findUnique({
      where: {
        id: body.workflowId,
        userId: session.user.id,
      },
      include: {
        nodes: true,
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const node = workflow.nodes.find(
      (n) => n.id === body.nodeId && n.type === NodeType.FACEBOOK_LEAD_TRIGGER,
    );

    if (!node) {
      return NextResponse.json(
        { error: "FACEBOOK_LEAD_TRIGGER node not found in this workflow" },
        { status: 404 },
      );
    }

    const nodeData = (node.data ?? {}) as Record<string, unknown>;

    const credentialId =
      body.credentialId ||
      (typeof nodeData.credentialId === "string" ? nodeData.credentialId : node.credentialId);
    const pageId =
      body.pageId || (typeof nodeData.pageId === "string" ? nodeData.pageId : undefined);
    const formId =
      body.formId || (typeof nodeData.formId === "string" ? nodeData.formId : undefined);

    if (!credentialId || !pageId || !formId) {
      return NextResponse.json(
        { error: "Missing required configuration: credentialId, pageId, formId" },
        { status: 400 },
      );
    }

    const credential = await prisma.credential.findUnique({
      where: {
        id: credentialId,
        userId: session.user.id,
      },
    });

    if (!credential) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    const userToken = decrypt(credential.value);

    // Exchange user token for page access token
    const pageData = await ky
      .get(`${FB_API}/${pageId}`, {
        searchParams: {
          access_token: userToken,
          fields: "access_token",
        },
      })
      .json<{ access_token: string }>()
      .catch((error: unknown) => {
        console.error("Failed to fetch page access token for sample capture", error);
        return null;
      });

    const pageToken = pageData?.access_token ?? userToken;

    // Fetch one recent lead for the form
    const leadsResponse = await ky
      .get(`${FB_API}/${formId}/leads`, {
        searchParams: {
          access_token: pageToken,
          limit: "1",
          fields: "id,created_time,field_data,form_id,page_id,ad_id",
        },
      })
      .json<{ data: FacebookLeadSampleRaw[] }>()
      .catch((error: unknown) => {
        console.error("Failed to fetch sample lead from Facebook", error);
        return null;
      });

    const raw = leadsResponse?.data?.[0];

    if (!raw) {
      return NextResponse.json(
        {
          error: "No sample leads found for this form. Submit the form once, then try again.",
        },
        { status: 404 },
      );
    }

    const views = buildFacebookLeadSampleViews(raw as FacebookLeadSampleRaw);

    const updatedData: Record<string, unknown> = {
      ...nodeData,
      sampleResponseRaw: views.raw as unknown as Record<string, unknown>,
      sampleResponseSimple: views.simple,
      sampleResponseAdvanced: views.advanced,
      lastSampleCapturedAt: new Date().toISOString(),
    };

    await prisma.node.update({
      where: { id: node.id },
      data: {
        data: updatedData,
      },
    });

    return NextResponse.json(
      {
        raw: views.raw,
        simple: views.simple,
        advanced: views.advanced,
        lastSampleCapturedAt: updatedData.lastSampleCapturedAt,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("facebook-lead test capture error", error);
    return NextResponse.json(
      {
        error:
          "Failed to capture sample lead from Facebook. Check your token, permissions, and that the form has at least one submission.",
      },
      { status: 500 },
    );
  }
}

