import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { NodeType } from "@/generated/prisma";
import {
  buildWebhookSampleViews,
  type WebhookSampleRaw,
} from "@/features/triggers/components/webhook-trigger/formatters";

type RequestBody = {
  workflowId: string;
  nodeId: string;
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
      (n) => n.id === body.nodeId && n.type === NodeType.WEBHOOK_TRIGGER,
    );

    if (!node) {
      return NextResponse.json(
        { error: "Webhook trigger node not found in this workflow" },
        { status: 404 },
      );
    }

    const nodeData = (node.data ?? {}) as Record<string, unknown>;
    const raw = nodeData.sampleResponseRaw as WebhookSampleRaw | undefined;

    if (!raw) {
      return NextResponse.json(
        {
          error:
            "No webhook response captured yet. Send a test webhook to this URL, then click Capture again.",
        },
        { status: 404 },
      );
    }

    const views = buildWebhookSampleViews(raw);

    const updatedData: Record<string, unknown> = {
      ...nodeData,
      sampleResponseRaw: views.raw,
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
    console.error("Webhook sample capture error:", error);
    return NextResponse.json(
      {
        error:
          "Failed to capture webhook response. Check that a webhook has been sent to this URL.",
      },
      { status: 500 },
    );
  }
}

