"use server";

import { type Realtime } from "@inngest/realtime";
import { httpRequestChannel } from "@/inngest/channels/http-request";
import { safeGetToken } from "@/inngest/get-token";

export type HttpRequestToken = Realtime.Token<typeof httpRequestChannel, ["status"]>;

export async function fetchHttpRequestRealtimeToken(): Promise<HttpRequestToken | null> {
  return safeGetToken(httpRequestChannel(), ["status"]) as Promise<HttpRequestToken | null>;
}
