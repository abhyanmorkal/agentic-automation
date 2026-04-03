"use server";

import type { Realtime } from "@inngest/realtime";
import { switchChannel } from "@/inngest/channels/switch";
import { safeGetToken } from "@/inngest/get-token";

export type SwitchToken = Realtime.Token<typeof switchChannel, ["status"]>;

export async function fetchSwitchRealtimeToken(): Promise<SwitchToken | null> {
  return safeGetToken(switchChannel(), [
    "status",
  ]) as Promise<SwitchToken | null>;
}
