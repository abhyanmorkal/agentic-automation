import { CredentialType } from "@/generated/prisma";
import type { ConnectorDefinition } from "../core/definitions";

export const googleConnectorDefinition = {
  id: "google",
  name: "Google",
  credentialTypes: [CredentialType.GOOGLE_OAUTH],
  credentialLabel: "Google account",
  credentialPlaceholder: "Select connected Google account",
  setupHint:
    "Connect your Google account to use Gmail, Sheets, Drive, and other Google actions.",
  logoPath: "/logos/google.svg",
  auth: {
    connectLabel: "Connect with Google",
    oauthStartPath: "/api/auth/google",
  },
} satisfies ConnectorDefinition;
