"use server";

import { type Realtime } from "@inngest/realtime";
import { slackChannel } from "@/inngest/channels/slack";
import { safeGetToken } from "@/inngest/get-token";

export type SlackToken = Realtime.Token<typeof slackChannel, ["status"]>;

export async function fetchSlackRealtimeToken(): Promise<SlackToken | null> {
  return safeGetToken(slackChannel(), ["status"]) as Promise<SlackToken | null>;
}
