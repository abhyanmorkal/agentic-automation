"use server";

import { type Realtime } from "@inngest/realtime";
import { gmailChannel } from "@/inngest/channels/gmail";
import { safeGetToken } from "@/inngest/get-token";

export type GmailToken = Realtime.Token<typeof gmailChannel, ["status"]>;

export async function fetchGmailRealtimeToken(): Promise<GmailToken | null> {
  return safeGetToken(gmailChannel(), ["status"]) as Promise<GmailToken | null>;
}
