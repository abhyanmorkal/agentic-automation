"use server";

import { type Realtime } from "@inngest/realtime";
import { airtableChannel } from "@/inngest/channels/airtable";
import { safeGetToken } from "@/inngest/get-token";

export type AirtableToken = Realtime.Token<typeof airtableChannel, ["status"]>;

export async function fetchAirtableRealtimeToken(): Promise<AirtableToken | null> {
  return safeGetToken(airtableChannel(), ["status"]) as Promise<AirtableToken | null>;
}
