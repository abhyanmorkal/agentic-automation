"use server";

import { type Realtime } from "@inngest/realtime";
import { googleDriveChannel } from "@/inngest/channels/google-drive";
import { safeGetToken } from "@/inngest/get-token";

export type GoogleDriveToken = Realtime.Token<typeof googleDriveChannel, ["status"]>;

export async function fetchGoogleDriveRealtimeToken(): Promise<GoogleDriveToken | null> {
  return safeGetToken(googleDriveChannel(), ["status"]) as Promise<GoogleDriveToken | null>;
}
