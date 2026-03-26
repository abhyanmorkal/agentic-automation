import { type NextRequest, NextResponse } from "next/server";
import { NodeType } from "@/generated/prisma";
import { sendWorkflowExecution } from "@/inngest/utils";
import prisma from "@/lib/db";
import { decodeTriggerToken } from "@/lib/trigger-token";

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const payload = token ? decodeTriggerToken(token) : null;

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid trigger token",
        },
        { status: 400 },
      );
    }

    const triggerNode = await prisma.node.findFirst({
      where: {
        id: payload.nodeId,
        workflowId: payload.workflowId,
        type: NodeType.WEBHOOK_TRIGGER,
      },
    });

    if (!triggerNode) {
      return NextResponse.json(
        {
          success: false,
          error: "Webhook trigger node not found for this token",
        },
        { status: 404 },
      );
    }

    let body: Record<string, unknown> = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid JSON body" },
          { status: 400 },
        );
      }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await request.text();
      const params = new URLSearchParams(text);
      for (const [key, value] of params.entries()) {
        body[key] = value;
      }
    }

    // Collect useful request metadata
    const webhookData = {
      body,
      headers: {
        "content-type": contentType,
        "user-agent": request.headers.get("user-agent") || "",
        "x-forwarded-for": request.headers.get("x-forwarded-for") || "",
      },
      method: request.method,
      receivedAt: new Date().toISOString(),
    };

    await sendWorkflowExecution({
      workflowId: payload.workflowId,
      triggerNodeId: triggerNode.id,
      triggerType: NodeType.WEBHOOK_TRIGGER,
      initialData: {
        webhook: webhookData,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Generic webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process webhook" },
      { status: 500 },
    );
  }
}

// Allow GET for easy webhook URL verification by some services
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const challenge = url.searchParams.get("hub.challenge");
  if (challenge) {
    return new Response(challenge, { status: 200 });
  }
  return NextResponse.json(
    { status: "Webhook endpoint active" },
    { status: 200 },
  );
}
