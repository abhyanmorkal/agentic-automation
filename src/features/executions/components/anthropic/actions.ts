"use server";

import { type Realtime } from "@inngest/realtime";
import { anthropicChannel } from "@/inngest/channels/anthropic";
import { safeGetToken } from "@/inngest/get-token";

export type AnthropicToken = Realtime.Token<typeof anthropicChannel, ["status"]>;

export async function fetchAnthropicRealtimeToken(): Promise<AnthropicToken | null> {
  return safeGetToken(anthropicChannel(), ["status"]) as Promise<AnthropicToken | null>;
}
