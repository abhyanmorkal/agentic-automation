"use server";

import { type Realtime } from "@inngest/realtime";
import { telegramChannel } from "@/inngest/channels/telegram";
import { safeGetToken } from "@/inngest/get-token";

export type TelegramToken = Realtime.Token<typeof telegramChannel, ["status"]>;

export async function fetchTelegramRealtimeToken(): Promise<TelegramToken | null> {
  return safeGetToken(telegramChannel(), ["status"]) as Promise<TelegramToken | null>;
}
