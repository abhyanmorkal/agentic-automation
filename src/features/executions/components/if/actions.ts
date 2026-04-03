"use server";

import type { Realtime } from "@inngest/realtime";
import { ifChannel } from "@/inngest/channels/if";
import { safeGetToken } from "@/inngest/get-token";

export type IfToken = Realtime.Token<typeof ifChannel, ["status"]>;

export async function fetchIfRealtimeToken(): Promise<IfToken | null> {
  return safeGetToken(ifChannel(), ["status"]) as Promise<IfToken | null>;
}
