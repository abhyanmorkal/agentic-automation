"use server";

import { auth } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";
import prisma from "@/lib/db";
import { type Realtime } from "@inngest/realtime";
import { facebookLeadTriggerChannel } from "@/inngest/channels/facebook-lead-trigger";
import { safeGetToken } from "@/inngest/get-token";
import { headers } from "next/headers";
import ky from "ky";

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

export async function fetchFacebookPages(credentialId: string): Promise<FacebookPage[]> {
  const session = await getSession();
  const accessToken = await getDecryptedCredential(credentialId, session.user.id);

  const response = await ky
    .get("https://graph.facebook.com/v20.0/me/accounts", {
      searchParams: {
        access_token: accessToken,
        fields: "id,name,category,access_token",
        limit: "50",
      },
    })
    .json<{ data: FacebookPage[] }>();

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
    .get(`https://graph.facebook.com/v20.0/${pageId}`, {
      searchParams: {
        access_token: userToken,
        fields: "access_token",
      },
    })
    .json<{ access_token: string; id: string }>();

  const pageToken = pageResponse.access_token;

  const formsResponse = await ky
    .get(`https://graph.facebook.com/v20.0/${pageId}/leadgen_forms`, {
      searchParams: {
        access_token: pageToken,
        fields: "id,name,status,leads_count",
        limit: "50",
      },
    })
    .json<{ data: FacebookLeadForm[] }>();

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
    .get(`https://graph.facebook.com/v20.0/${pageId}`, {
      searchParams: {
        access_token: userToken,
        fields: "access_token",
      },
    })
    .json<{ access_token: string }>();

  const pageToken = pageResponse.access_token;

  const leadsResponse = await ky
    .get(`https://graph.facebook.com/v20.0/${formId}/leads`, {
      searchParams: {
        access_token: pageToken,
        limit: "1",
        fields: "id,created_time,field_data,form_id",
      },
    })
    .json<{ data: FacebookSampleLead[] }>();

  return leadsResponse.data[0] ?? null;
}
