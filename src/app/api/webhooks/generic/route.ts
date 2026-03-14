import { sendWorkflowExecution } from "@/inngest/utils";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const workflowId = url.searchParams.get("workflowId");

    if (!workflowId) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameter: workflowId" },
        { status: 400 },
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
      workflowId,
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
  return NextResponse.json({ status: "Webhook endpoint active" }, { status: 200 });
}
