"use server";

import { type Realtime } from "@inngest/realtime";
import { googleSheetsChannel } from "@/inngest/channels/google-sheets";
import { safeGetToken } from "@/inngest/get-token";

export type GoogleSheetsToken = Realtime.Token<typeof googleSheetsChannel, ["status"]>;

export async function fetchGoogleSheetsRealtimeToken(): Promise<GoogleSheetsToken | null> {
  return safeGetToken(googleSheetsChannel(), ["status"]) as Promise<GoogleSheetsToken | null>;
}
