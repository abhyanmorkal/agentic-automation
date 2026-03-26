import { CredentialType } from "@/generated/prisma";
import type { ConnectorDefinition } from "../core/definitions";

export const metaConnectorDefinition = {
  id: "meta",
  name: "Meta",
  credentialTypes: [CredentialType.META_ACCESS_TOKEN],
  credentialLabel: "Meta account",
  logoPath: "/logos/facebook.svg",
  oauthStartPath: "/api/auth/facebook",
} satisfies ConnectorDefinition;
