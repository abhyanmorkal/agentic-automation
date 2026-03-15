"use server";

import { type Realtime } from "@inngest/realtime";
import { notionChannel } from "@/inngest/channels/notion";
import { safeGetToken } from "@/inngest/get-token";

export type NotionToken = Realtime.Token<typeof notionChannel, ["status"]>;

export async function fetchNotionRealtimeToken(): Promise<NotionToken | null> {
  return safeGetToken(notionChannel(), ["status"]) as Promise<NotionToken | null>;
}
