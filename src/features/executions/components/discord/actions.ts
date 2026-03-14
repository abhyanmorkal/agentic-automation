"use server";

import { type Realtime } from "@inngest/realtime";
import { discordChannel } from "@/inngest/channels/discord";
import { safeGetToken } from "@/inngest/get-token";

export type DiscordToken = Realtime.Token<typeof discordChannel, ["status"]>;

export async function fetchDiscordRealtimeToken(): Promise<DiscordToken | null> {
  return safeGetToken(discordChannel(), ["status"]) as Promise<DiscordToken | null>;
}
