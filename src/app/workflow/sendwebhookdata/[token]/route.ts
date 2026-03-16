import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { sendWorkflowExecution } from "@/inngest/utils";
import { NodeType } from "@/generated/prisma";

type TokenPayload = {
  workflowId: string;
  nodeId: string;
};

function decodeToken(rawToken: string): TokenPayload | null {
  try {
    const normalized = rawToken.endsWith("_pc") ? rawToken.slice(0, -3) : rawToken;
    const decoded = Buffer.from(normalized, "base64").toString("utf8");
    const json = decodeURIComponent(decoded);
    const parsed = JSON.parse(json) as TokenPayload;
    if (!parsed.workflowId || !parsed.nodeId) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function parseRequestBody(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return {
        type: "json" as const,
        body: await request.json(),
      };
    } catch {
      return {
        type: "json" as const,
        body: {},
      };
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    const body: Record<string, unknown> = {};
    for (const [key, value] of params.entries()) {
      body[key] = value;
    }
    return {
      type: "form" as const,
      body,
    };
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const body: Record<string, unknown> = {};
    const files: Array<{
      fieldName: string;
      fileName: string;
      size?: number;
      contentType?: string;
    }> = [];

    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        body[key] = value;
      } else {
        const file = value;
        files.push({
          fieldName: key,
          fileName: file.name,
          size: typeof file.size === "number" ? file.size : undefined,
          contentType: typeof file.type === "string" ? file.type : undefined,
        });
      }
    }

    return {
      type: "multipart" as const,
      body,
      files,
    };
  }

  // Fallback: try text
  const text = await request.text().catch(() => "");
  return {
    type: "text" as const,
    body: text ? { raw: text } : {},
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const payload = decodeToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook token" },
        { status: 400 },
      );
    }

    const { workflowId, nodeId } = payload;

    const node = await prisma.node.findFirst({
      where: {
        id: nodeId,
        workflowId,
        type: NodeType.WEBHOOK_TRIGGER,
      },
    });

    if (!node) {
      return NextResponse.json(
        { success: false, error: "Webhook node not found for this token" },
        { status: 404 },
      );
    }

    const url = new URL(request.url);
    const query: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    const parsed = await parseRequestBody(request);

    const webhookData: Record<string, unknown> = {
      body: parsed.body,
      headers: Object.fromEntries(request.headers.entries()),
      method: request.method,
      url: url.toString(),
      path: url.pathname,
      query,
      receivedAt: new Date().toISOString(),
    };

    if ("files" in parsed && parsed.files) {
      webhookData.files = parsed.files;
    }

    const nodeData = (node.data ?? {}) as Record<string, unknown>;
    const updatedData: Record<string, unknown> = {
      ...nodeData,
      sampleResponseRaw: webhookData,
      lastSampleCapturedAt: new Date().toISOString(),
    };

    await prisma.node.update({
      where: { id: node.id },
      data: {
        data: updatedData,
      },
    });

    await sendWorkflowExecution({
      workflowId,
      initialData: {
        webhook: webhookData,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook sendwebhookdata error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process webhook" },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const payload = decodeToken(token);
  if (!payload) {
    return NextResponse.json(
      { success: false, error: "Invalid webhook token" },
      { status: 400 },
    );
  }
  return NextResponse.json(
    { success: true, message: "Webhook endpoint active" },
    { status: 200 },
  );
}

