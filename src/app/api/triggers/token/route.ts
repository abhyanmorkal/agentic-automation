import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { createTriggerToken } from "@/lib/trigger-token";

type RequestBody = {
  workflowId?: string;
  nodeId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;

    if (!body.workflowId || !body.nodeId) {
      return NextResponse.json(
        { error: "workflowId and nodeId are required" },
        { status: 400 },
      );
    }

    const workflow = await prisma.workflow.findUnique({
      where: {
        id: body.workflowId,
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      token: createTriggerToken({
        workflowId: workflow.id,
        nodeId: body.nodeId,
      }),
    });
  } catch (error) {
    console.error("Trigger token generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate trigger token" },
      { status: 500 },
    );
  }
}
