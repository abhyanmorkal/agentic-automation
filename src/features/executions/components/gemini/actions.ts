"use server";

import { type Realtime } from "@inngest/realtime";
import { geminiChannel } from "@/inngest/channels/gemini";
import { safeGetToken } from "@/inngest/get-token";

export type GeminiToken = Realtime.Token<typeof geminiChannel, ["status"]>;

export async function fetchGeminiRealtimeToken(): Promise<GeminiToken | null> {
  return safeGetToken(geminiChannel(), ["status"]) as Promise<GeminiToken | null>;
}
