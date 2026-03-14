"use server";

import { type Realtime } from "@inngest/realtime";
import { manualTriggerChannel } from "@/inngest/channels/manual-trigger";
import { safeGetToken } from "@/inngest/get-token";

export type ManualTriggerToken = Realtime.Token<typeof manualTriggerChannel, ["status"]>;

export async function fetchManualTriggerRealtimeToken(): Promise<ManualTriggerToken | null> {
  return safeGetToken(manualTriggerChannel(), ["status"]) as Promise<ManualTriggerToken | null>;
}
