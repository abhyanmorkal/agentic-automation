import type { CredentialType } from "@/generated/prisma";

export type ConnectorId = "google" | "meta";

export type ConnectorDefinition = {
  id: ConnectorId;
  name: string;
  credentialTypes: CredentialType[];
  credentialLabel: string;
  logoPath: string;
  oauthStartPath?: string;
};
