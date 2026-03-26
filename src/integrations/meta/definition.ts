import { CredentialType } from "@/generated/prisma";
import type { ConnectorDefinition } from "../core/definitions";

export const metaConnectorDefinition = {
  id: "meta",
  name: "Meta",
  credentialTypes: [CredentialType.META_ACCESS_TOKEN],
  credentialLabel: "Meta account",
  credentialPlaceholder: "Select connected Meta account",
  setupHint:
    "Connect your Meta account to use Facebook Pages, Instagram, WhatsApp, and lead triggers.",
  logoPath: "/logos/facebook.svg",
  auth: {
    connectLabel: "Connect with Facebook",
    oauthStartPath: "/api/auth/facebook",
  },
} satisfies ConnectorDefinition;
