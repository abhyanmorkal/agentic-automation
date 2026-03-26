import { type NextRequest, NextResponse } from "next/server";
import { NodeType } from "@/generated/prisma";
import { sendWorkflowExecution } from "@/inngest/utils";
import prisma from "@/lib/db";
import { decodeTriggerToken } from "@/lib/trigger-token";
import { verifyStripeSignature } from "@/lib/webhook-security";

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
        type: NodeType.STRIPE_TRIGGER,
      },
    });

    if (!triggerNode) {
      return NextResponse.json(
        {
          success: false,
          error: "Stripe trigger node not found for this token",
        },
        { status: 404 },
      );
    }

    const rawBody = Buffer.from(await request.arrayBuffer());
    const signatureHeader = request.headers.get("stripe-signature");

    if (!verifyStripeSignature(rawBody, signatureHeader)) {
      return NextResponse.json(
        { success: false, error: "Invalid Stripe signature" },
        { status: 401 },
      );
    }

    const body = JSON.parse(rawBody.toString("utf8")) as Record<
      string,
      unknown
    >;

    const stripeData = {
      // Event metadata
      eventId: body.id,
      eventType: body.type,
      timestamp: body.created,
      livemode: body.livemode,
      raw: body.data?.object,
    };

    // Trigger an Inngest job
    await sendWorkflowExecution({
      workflowId: payload.workflowId,
      triggerNodeId: triggerNode.id,
      triggerType: NodeType.STRIPE_TRIGGER,
      initialData: {
        stripe: stripeData,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process Stripe event" },
      { status: 500 },
    );
  }
}
