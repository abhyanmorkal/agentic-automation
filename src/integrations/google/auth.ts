import ky, { HTTPError } from "ky";
import type { StepTools } from "@/features/executions/types";
import { CredentialType } from "@/generated/prisma";
import {
  getDecryptedCredentialValue,
  loadCredential,
} from "../core/credentials";

type LoadGoogleCredentialOptions = {
  credentialId: string;
  userId: string;
  step: StepTools;
  nodeName: string;
};

export const loadGoogleRefreshToken = async ({
  credentialId,
  userId,
  step,
  nodeName,
}: LoadGoogleCredentialOptions) => {
  const credential = await loadCredential({
    credentialId,
    userId,
    step,
    nodeName,
    expectedType: CredentialType.GOOGLE_OAUTH,
  });

  return getDecryptedCredentialValue(credential);
};

export const getGoogleAccessToken = async (refreshToken: string) => {
  const response = await ky
    .post("https://oauth2.googleapis.com/token", {
      json: {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      },
    })
    .json<{ access_token: string }>();

  return response.access_token;
};

export const parseGoogleApiError = async (error: unknown): Promise<never> => {
  if (error instanceof HTTPError) {
    const body = (await error.response.json().catch(() => ({}))) as {
      error?: {
        code?: number;
        message?: string;
        status?: string;
      };
    };

    const status = body.error?.code ?? error.response.status;
    const message = body.error?.message ?? "Google API request failed";

    throw new Error(`Google API error (${status}): ${message}`);
  }

  throw error;
};
