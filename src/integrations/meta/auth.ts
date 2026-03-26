import { NonRetriableError } from "inngest";
import ky, { HTTPError } from "ky";
import type { StepTools } from "@/features/executions/types";
import { CredentialType } from "@/generated/prisma";
import {
  getDecryptedCredentialValue,
  loadCredential,
  loadCredentialForUser,
} from "../core/credentials";

export const META_GRAPH_API_VERSION = "v22.0";
export const META_GRAPH_API_BASE_URL = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

type LoadMetaCredentialOptions = {
  credentialId: string;
  userId: string;
  step: StepTools;
  nodeName: string;
};

type LoadMetaCredentialForUserOptions = {
  credentialId: string;
  userId: string;
};

type LoadMetaPageAccessTokenOptions = LoadMetaCredentialForUserOptions & {
  pageId: string;
};

export const getMetaGraphUrl = (path: string) =>
  `${META_GRAPH_API_BASE_URL}/${path.replace(/^\/+/, "")}`;

export const parseMetaApiError = async (error: unknown): Promise<never> => {
  if (error instanceof HTTPError) {
    const body = (await error.response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };

    throw new Error(
      body.error?.message ?? `Meta API error (${error.response.status})`,
    );
  }

  throw error;
};

export const loadMetaAccessToken = async ({
  credentialId,
  userId,
  step,
  nodeName,
}: LoadMetaCredentialOptions) => {
  const credential = await loadCredential({
    credentialId,
    userId,
    step,
    nodeName,
    expectedType: CredentialType.META_ACCESS_TOKEN,
  });

  return getDecryptedCredentialValue(credential);
};

export const getMetaAccessTokenForUser = async ({
  credentialId,
  userId,
}: LoadMetaCredentialForUserOptions) => {
  const credential = await loadCredentialForUser({
    credentialId,
    userId,
    expectedType: CredentialType.META_ACCESS_TOKEN,
  });

  return getDecryptedCredentialValue(credential);
};

export const getMetaPageAccessToken = async ({
  credentialId,
  userId,
  pageId,
}: LoadMetaPageAccessTokenOptions) => {
  const userToken = await getMetaAccessTokenForUser({ credentialId, userId });

  const pageResponse = await ky
    .get(getMetaGraphUrl(pageId), {
      searchParams: {
        access_token: userToken,
        fields: "access_token",
      },
    })
    .json<{ access_token: string }>()
    .catch(parseMetaApiError);

  if (!pageResponse.access_token) {
    throw new NonRetriableError("Meta page access token is missing");
  }

  return pageResponse.access_token;
};
