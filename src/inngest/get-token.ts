"use server";

import { getSubscriptionToken } from "@inngest/realtime";
import { inngest } from "@/inngest/client";

/**
 * Wraps getSubscriptionToken and returns null when Inngest is not configured
 * (missing INNGEST_SIGNING_KEY, dev server not running, etc.)
 * This prevents 500 errors on every page load in environments without Inngest.
 */
export async function safeGetToken(
  channel: Parameters<typeof getSubscriptionToken>[1]["channel"],
  topics: string[],
) {
  try {
    return await getSubscriptionToken(inngest, { channel, topics: topics as [string, ...string[]] });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Inngest] Realtime token unavailable — is `npm run inngest:dev` running?",
        (err as Error).message,
      );
    }
    return null;
  }
}
