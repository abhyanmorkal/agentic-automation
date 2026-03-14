"use server";

import { type Realtime } from "@inngest/realtime";
import { webhookTriggerChannel } from "@/inngest/channels/webhook-trigger";
import { safeGetToken } from "@/inngest/get-token";

export type WebhookTriggerToken = Realtime.Token<typeof webhookTriggerChannel, ["status"]>;

export async function fetchWebhookTriggerRealtimeToken(): Promise<WebhookTriggerToken | null> {
  return safeGetToken(webhookTriggerChannel(), ["status"]) as Promise<WebhookTriggerToken | null>;
}
