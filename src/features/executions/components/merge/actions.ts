"use server";

import type { Realtime } from "@inngest/realtime";
import { mergeChannel } from "@/inngest/channels/merge";
import { safeGetToken } from "@/inngest/get-token";

export type MergeToken = Realtime.Token<typeof mergeChannel, ["status"]>;

export async function fetchMergeRealtimeToken(): Promise<MergeToken | null> {
  return safeGetToken(mergeChannel(), ["status"]) as Promise<MergeToken | null>;
}
