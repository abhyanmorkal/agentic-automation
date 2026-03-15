"use server";

import { type Realtime } from "@inngest/realtime";
import { mcpToolChannel } from "@/inngest/channels/mcp-tool";
import { safeGetToken } from "@/inngest/get-token";

export type McpToolToken = Realtime.Token<typeof mcpToolChannel, ["status"]>;

export async function fetchMcpToolRealtimeToken(): Promise<McpToolToken | null> {
  return safeGetToken(mcpToolChannel(), ["status"]) as Promise<McpToolToken | null>;
}
