"use server";

import { type Realtime } from "@inngest/realtime";
import { stripeTriggerChannel } from "@/inngest/channels/stripe-trigger";
import { safeGetToken } from "@/inngest/get-token";

export type StripeTriggerToken = Realtime.Token<typeof stripeTriggerChannel, ["status"]>;

export async function fetchStripeTriggerRealtimeToken(): Promise<StripeTriggerToken | null> {
  return safeGetToken(stripeTriggerChannel(), ["status"]) as Promise<StripeTriggerToken | null>;
}
