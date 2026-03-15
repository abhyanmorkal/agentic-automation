"use server";

import { type Realtime } from "@inngest/realtime";
import { sendSmsChannel } from "@/inngest/channels/send-sms";
import { safeGetToken } from "@/inngest/get-token";

export type SendSmsToken = Realtime.Token<typeof sendSmsChannel, ["status"]>;

export async function fetchSendSmsRealtimeToken(): Promise<SendSmsToken | null> {
  return safeGetToken(sendSmsChannel(), ["status"]) as Promise<SendSmsToken | null>;
}
