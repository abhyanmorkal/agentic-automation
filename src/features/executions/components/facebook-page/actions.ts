"use server";

import { type Realtime } from "@inngest/realtime";
import { facebookPageChannel } from "@/inngest/channels/facebook-page";
import { safeGetToken } from "@/inngest/get-token";

export type FacebookPageToken = Realtime.Token<typeof facebookPageChannel, ["status"]>;

export async function fetchFacebookPageRealtimeToken(): Promise<FacebookPageToken | null> {
  return safeGetToken(facebookPageChannel(), ["status"]) as Promise<FacebookPageToken | null>;
}
