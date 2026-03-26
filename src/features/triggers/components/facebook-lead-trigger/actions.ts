"use server";

import type { Realtime } from "@inngest/realtime";
import { headers } from "next/headers";
import { facebookLeadTriggerChannel } from "@/inngest/channels/facebook-lead-trigger";
import { safeGetToken } from "@/inngest/get-token";
import {
  fetchMetaLeadForms,
  fetchMetaPages,
  type MetaFacebookLeadField,
  type MetaFacebookLeadForm,
  type MetaFacebookPage,
  type MetaFacebookSampleLead,
  subscribeMetaPageToLeadgenWebhook,
  testMetaConnection,
} from "@/integrations/meta/api";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

export type FacebookLeadTriggerToken = Realtime.Token<
  typeof facebookLeadTriggerChannel,
  ["status"]
>;

export async function fetchFacebookLeadTriggerRealtimeToken(): Promise<FacebookLeadTriggerToken | null> {
  return safeGetToken(facebookLeadTriggerChannel(), [
    "status",
  ]) as Promise<FacebookLeadTriggerToken | null>;
}

export type FacebookPage = MetaFacebookPage;
export type FacebookLeadForm = MetaFacebookLeadForm;
export type FacebookLeadField = MetaFacebookLeadField;
export type FacebookSampleLead = MetaFacebookSampleLead;

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function testFacebookConnection(
  credentialId: string,
): Promise<{ valid: boolean; name?: string; error?: string }> {
  try {
    const session = await getSession();
    const result = await testMetaConnection({
      credentialId,
      userId: session.user.id,
    });

    return { valid: true, name: result.name };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

export async function fetchFacebookPages(
  credentialId: string,
): Promise<FacebookPage[]> {
  const session = await getSession();

  return fetchMetaPages({
    credentialId,
    userId: session.user.id,
  });
}

export async function fetchFacebookLeadForms(
  credentialId: string,
  pageId: string,
): Promise<FacebookLeadForm[]> {
  const session = await getSession();

  return fetchMetaLeadForms({
    credentialId,
    userId: session.user.id,
    pageId,
  });
}

export async function fetchCredentialExpiry(credentialId: string): Promise<{
  expiresAt: string | null;
  daysRemaining: number | null;
  warning: boolean;
}> {
  try {
    const session = await getSession();
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId, userId: session.user.id },
    });
    if (!credential)
      return { expiresAt: null, daysRemaining: null, warning: false };

    const metadata = credential.metadata as { expiresAt?: string } | null;
    const expiresAt = metadata?.expiresAt ?? null;
    if (!expiresAt)
      return { expiresAt: null, daysRemaining: null, warning: false };

    const msRemaining = new Date(expiresAt).getTime() - Date.now();
    const daysRemaining = Math.max(
      0,
      Math.floor(msRemaining / (1000 * 60 * 60 * 24)),
    );
    const warning = daysRemaining <= 7;

    return { expiresAt, daysRemaining, warning };
  } catch {
    return { expiresAt: null, daysRemaining: null, warning: false };
  }
}

/**
 * Automates the process of subscribing the Facebook App to the selected Page's leadgen webhook.
 * This is REQUIRED for Facebook to send "Object: Page" (leadgen) webhooks to our endpoint.
 */
export async function setupFacebookLeadWebhook(
  credentialId: string,
  pageId: string,
) {
  try {
    const session = await getSession();

    await subscribeMetaPageToLeadgenWebhook({
      credentialId,
      userId: session.user.id,
      pageId,
    });

    return { success: true };
  } catch (err) {
    console.error("Facebook lead webhook setup failed:", err);
    throw err;
  }
}
