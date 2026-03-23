"use server";

import { auth } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";
import prisma from "@/lib/db";
import { type Realtime } from "@inngest/realtime";
import { facebookLeadTriggerChannel } from "@/inngest/channels/facebook-lead-trigger";
import { safeGetToken } from "@/inngest/get-token";
import { headers } from "next/headers";
import ky, { HTTPError } from "ky";

export type FacebookLeadTriggerToken = Realtime.Token<typeof facebookLeadTriggerChannel, ["status"]>;

export async function fetchFacebookLeadTriggerRealtimeToken(): Promise<FacebookLeadTriggerToken | null> {
  return safeGetToken(facebookLeadTriggerChannel(), ["status"]) as Promise<FacebookLeadTriggerToken | null>;
}

export type FacebookPage = {
  id: string;
  name: string;
  category: string;
  access_token: string;
};

export type FacebookLeadForm = {
  id: string;
  name: string;
  status: string;
  leads_count?: number;
};

export type FacebookLeadField = {
  name: string;
  values: string[];
};

export type FacebookSampleLead = {
  id: string;
  created_time: string;
  field_data: FacebookLeadField[];
  form_id: string;
};

async function parseFacebookError(error: unknown): Promise<never> {
  if (error instanceof HTTPError) {
    const body = await error.response.json().catch(() => ({})) as { error?: { message?: string; type?: string } };
    const msg = body?.error?.message;
    throw new Error(msg ?? `Facebook API error (${error.response.status})`);
  }
  throw error;
}

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

async function getDecryptedCredential(credentialId: string, userId: string) {
  const credential = await prisma.credential.findUnique({
    where: { id: credentialId, userId },
  });
  if (!credential) throw new Error("Credential not found");
  return decrypt(credential.value);
}

export async function testFacebookConnection(credentialId: string): Promise<{ valid: boolean; name?: string; error?: string }> {
  try {
    const session = await getSession();
    const accessToken = await getDecryptedCredential(credentialId, session.user.id);
    const res = await ky
      .get("https://graph.facebook.com/v22.0/me", {
        searchParams: { access_token: accessToken, fields: "id,name" },
      })
      .json<{ id: string; name?: string }>()
      .catch(parseFacebookError);
    return { valid: true, name: res.name };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}

export async function fetchFacebookPages(credentialId: string): Promise<FacebookPage[]> {
  const session = await getSession();
  const accessToken = await getDecryptedCredential(credentialId, session.user.id);

  const response = await ky
    .get("https://graph.facebook.com/v22.0/me/accounts", {
      searchParams: {
        access_token: accessToken,
        fields: "id,name,category,access_token",
        limit: "50",
      },
    })
    .json<{ data: FacebookPage[] }>()
    .catch(parseFacebookError);

  return response.data;
}

export async function fetchFacebookLeadForms(
  credentialId: string,
  pageId: string,
): Promise<FacebookLeadForm[]> {
  const session = await getSession();
  const userToken = await getDecryptedCredential(credentialId, session.user.id);

  // Exchange user token for page token
  const pageResponse = await ky
    .get(`https://graph.facebook.com/v22.0/${pageId}`, {
      searchParams: {
        access_token: userToken,
        fields: "access_token",
      },
    })
    .json<{ access_token: string; id: string }>()
    .catch(parseFacebookError);

  const pageToken = pageResponse.access_token;

  const formsResponse = await ky
    .get(`https://graph.facebook.com/v22.0/${pageId}/leadgen_forms`, {
      searchParams: {
        access_token: pageToken,
        fields: "id,name,status,leads_count",
        limit: "50",
      },
    })
    .json<{ data: FacebookLeadForm[] }>()
    .catch(parseFacebookError);

  return formsResponse.data;
}

export async function fetchFacebookSampleLead(
  credentialId: string,
  pageId: string,
  formId: string,
): Promise<FacebookSampleLead | null> {
  const session = await getSession();
  const userToken = await getDecryptedCredential(credentialId, session.user.id);

  // Get page access token
  const pageResponse = await ky
    .get(`https://graph.facebook.com/v22.0/${pageId}`, {
      searchParams: {
        access_token: userToken,
        fields: "access_token",
      },
    })
    .json<{ access_token: string }>()
    .catch(parseFacebookError);

  const pageToken = pageResponse.access_token;

  const leadsResponse = await ky
    .get(`https://graph.facebook.com/v22.0/${formId}/leads`, {
      searchParams: {
        access_token: pageToken,
        limit: "1",
        fields: "id,created_time,field_data,form_id",
      },
    })
    .json<{ data: FacebookSampleLead[] }>()
    .catch(parseFacebookError);

  return leadsResponse.data[0] ?? null;
}

export async function fetchCredentialExpiry(
  credentialId: string,
): Promise<{ expiresAt: string | null; daysRemaining: number | null; warning: boolean }> {
  try {
    const session = await getSession();
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId, userId: session.user.id },
    });
    if (!credential) return { expiresAt: null, daysRemaining: null, warning: false };

    const metadata = credential.metadata as { expiresAt?: string } | null;
    const expiresAt = metadata?.expiresAt ?? null;
    if (!expiresAt) return { expiresAt: null, daysRemaining: null, warning: false };

    const msRemaining = new Date(expiresAt).getTime() - Date.now();
    const daysRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60 * 60 * 24)));
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
export async function setupFacebookLeadWebhook(credentialId: string, pageId: string) {
  try {
    const session = await getSession();
    const userToken = await getDecryptedCredential(credentialId, session.user.id);

    // 1. Get Page Access Token (we need this to perform page-level subscriptions)
    const pageRes = await ky
      .get(`https://graph.facebook.com/v22.0/${pageId}`, {
        searchParams: {
          access_token: userToken,
          fields: "access_token",
        },
      })
      .json<{ access_token: string }>()
      .catch(parseFacebookError);

    const pageToken = pageRes.access_token;

    // 2. Subscribe our App to the Page's leadgen field
    // This tells Facebook: "Send leadgen notifications for this page to the App's webhook URL"
    await ky
      .post(`https://graph.facebook.com/v22.0/${pageId}/subscribed_apps`, {
        searchParams: {
          access_token: pageToken,
          subscribed_fields: "leadgen",
        },
      })
      .json()
      .catch(parseFacebookError);

    return { success: true };
  } catch (err) {
    console.error("Facebook lead webhook setup failed:", err);
    throw err;
  }
}
