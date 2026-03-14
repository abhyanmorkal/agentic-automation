"use server";

import { type Realtime } from "@inngest/realtime";
import { openAiChannel } from "@/inngest/channels/openai";
import { safeGetToken } from "@/inngest/get-token";

export type OpenAiToken = Realtime.Token<typeof openAiChannel, ["status"]>;

export async function fetchOpenAiRealtimeToken(): Promise<OpenAiToken | null> {
  return safeGetToken(openAiChannel(), ["status"]) as Promise<OpenAiToken | null>;
}
