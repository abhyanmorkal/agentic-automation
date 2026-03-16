import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { NodeType } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const workflowId = url.searchParams.get("workflowId");

    if (!workflowId) {
      return NextResponse.json(
        { error: "workflowId is required" },
        { status: 400 },
      );
    }

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflow = await prisma.workflow.findUnique({
      where: {
        id: workflowId,
        userId: session.user.id,
      },
      include: {
        nodes: true,
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const triggerNode = workflow.nodes.find(
      (n) =>
        n.type === NodeType.FACEBOOK_LEAD_TRIGGER &&
        n.data &&
        (n.data as any).sampleResponseSimple,
    );

    if (!triggerNode) {
      return NextResponse.json(
        { error: "No Facebook Lead trigger with a captured sample was found in this workflow" },
        { status: 404 },
      );
    }

    const data = triggerNode.data as any;
    const simple = (data.sampleResponseSimple ?? {}) as Record<string, unknown>;

    return NextResponse.json(
      {
        nodeId: triggerNode.id,
        fields: Object.keys(simple),
        sampleResponseSimple: simple,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("facebook-lead sample fetch error", error);
    return NextResponse.json(
      { error: "Failed to load Facebook Lead sample for this workflow" },
      { status: 500 },
    );
  }
}

