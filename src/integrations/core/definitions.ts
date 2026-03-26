import type { CredentialType } from "@/generated/prisma";

export type ConnectorId = "google" | "meta";

export type ConnectorAuthConfig = {
  connectLabel: string;
  oauthStartPath?: string;
};

export type ConnectorDefinition = {
  id: ConnectorId;
  name: string;
  credentialTypes: CredentialType[];
  credentialLabel: string;
  credentialPlaceholder: string;
  setupHint?: string;
  logoPath: string;
  auth: ConnectorAuthConfig;
};
