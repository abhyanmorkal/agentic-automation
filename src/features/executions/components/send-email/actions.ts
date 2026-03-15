"use server";

import { type Realtime } from "@inngest/realtime";
import { sendEmailChannel } from "@/inngest/channels/send-email";
import { safeGetToken } from "@/inngest/get-token";

export type SendEmailToken = Realtime.Token<typeof sendEmailChannel, ["status"]>;

export async function fetchSendEmailRealtimeToken(): Promise<SendEmailToken | null> {
  return safeGetToken(sendEmailChannel(), ["status"]) as Promise<SendEmailToken | null>;
}
