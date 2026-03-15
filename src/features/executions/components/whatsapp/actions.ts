"use server";

import { type Realtime } from "@inngest/realtime";
import { whatsappChannel } from "@/inngest/channels/whatsapp";
import { safeGetToken } from "@/inngest/get-token";

export type WhatsAppToken = Realtime.Token<typeof whatsappChannel, ["status"]>;

export async function fetchWhatsAppRealtimeToken(): Promise<WhatsAppToken | null> {
  return safeGetToken(whatsappChannel(), ["status"]) as Promise<WhatsAppToken | null>;
}
