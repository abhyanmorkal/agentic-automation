"use server";

import { type Realtime } from "@inngest/realtime";
import { instagramChannel } from "@/inngest/channels/instagram";
import { safeGetToken } from "@/inngest/get-token";

export type InstagramToken = Realtime.Token<typeof instagramChannel, ["status"]>;

export async function fetchInstagramRealtimeToken(): Promise<InstagramToken | null> {
  return safeGetToken(instagramChannel(), ["status"]) as Promise<InstagramToken | null>;
}
