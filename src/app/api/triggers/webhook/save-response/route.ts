import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { NodeType } from "@/generated/prisma";

type RequestBody = {
  workflowId: string;
  nodeId: string;
  name: string;
  type: "simple" | "advanced" | "raw";
  data: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.workflowId || !body.nodeId || !body.name || !body.type) {
      return NextResponse.json(
        { error: "workflowId, nodeId, name and type are required" },
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
    const saved = (nodeData.savedResponses ?? {}) as Record<
      string,
      { type: string; data: unknown; createdAt: string }
    >;

    const updatedSaved = {
      ...saved,
      [body.name]: {
        type: body.type,
        data: body.data,
        createdAt: new Date().toISOString(),
      },
    };

    await prisma.node.update({
      where: { id: node.id },
      data: {
        data: {
          ...nodeData,
          savedResponses: updatedSaved,
        } as any,
      },
    });

    return NextResponse.json(
      {
        savedResponses: updatedSaved,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Webhook save-response error:", error);
    return NextResponse.json(
      { error: "Failed to save webhook response" },
      { status: 500 },
    );
  }
}

