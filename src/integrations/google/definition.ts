import { CredentialType } from "@/generated/prisma";
import type { ConnectorDefinition } from "../core/definitions";

export const googleConnectorDefinition = {
  id: "google",
  name: "Google",
  credentialTypes: [CredentialType.GOOGLE_OAUTH],
  credentialLabel: "Google account",
  logoPath: "/logos/google.svg",
  oauthStartPath: "/api/auth/google",
} satisfies ConnectorDefinition;
