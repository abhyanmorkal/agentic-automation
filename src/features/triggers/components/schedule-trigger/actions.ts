"use server";

import { type Realtime } from "@inngest/realtime";
import { scheduleTriggerChannel } from "@/inngest/channels/schedule-trigger";
import { safeGetToken } from "@/inngest/get-token";

export type ScheduleTriggerToken = Realtime.Token<typeof scheduleTriggerChannel, ["status"]>;

export async function fetchScheduleTriggerRealtimeToken(): Promise<ScheduleTriggerToken | null> {
  return safeGetToken(scheduleTriggerChannel(), ["status"]) as Promise<ScheduleTriggerToken | null>;
}
