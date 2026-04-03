"use server";

import type { Realtime } from "@inngest/realtime";
import { delayChannel } from "@/inngest/channels/delay";
import { safeGetToken } from "@/inngest/get-token";

export type DelayToken = Realtime.Token<typeof delayChannel, ["status"]>;

export async function fetchDelayRealtimeToken(): Promise<DelayToken | null> {
  return safeGetToken(delayChannel(), ["status"]) as Promise<DelayToken | null>;
}
