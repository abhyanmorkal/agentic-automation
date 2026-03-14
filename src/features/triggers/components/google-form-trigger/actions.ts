"use server";

import { type Realtime } from "@inngest/realtime";
import { googleFormTriggerChannel } from "@/inngest/channels/google-form-trigger";
import { safeGetToken } from "@/inngest/get-token";

export type GoogleFormTriggerToken = Realtime.Token<typeof googleFormTriggerChannel, ["status"]>;

export async function fetchGoogleFormTriggerRealtimeToken(): Promise<GoogleFormTriggerToken | null> {
  return safeGetToken(googleFormTriggerChannel(), ["status"]) as Promise<GoogleFormTriggerToken | null>;
}
