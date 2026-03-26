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
        type: NodeType.GOOGLE_FORM_TRIGGER,
      },
    });

    if (!triggerNode) {
      return NextResponse.json(
        {
          success: false,
          error: "Google Form trigger node not found for this token",
        },
        { status: 404 },
      );
    }

    const body = await request.json();

    const formData = {
      formId: body.formId,
      formTitle: body.formTitle,
      responseId: body.responseId,
      timestamp: body.timestamp,
      respondentEmail: body.respondentEmail,
      responses: body.responses,
      raw: body,
    };

    // Trigger an Inngest job
    await sendWorkflowExecution({
      workflowId: payload.workflowId,
      triggerNodeId: triggerNode.id,
      triggerType: NodeType.GOOGLE_FORM_TRIGGER,
      initialData: {
        googleForm: formData,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Google form webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process Google Form submission" },
      { status: 500 },
    );
  }
}
