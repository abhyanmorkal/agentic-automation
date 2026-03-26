import { NonRetriableError } from "inngest";
import type { StepTools } from "@/features/executions/types";
import type { Credential, CredentialType } from "@/generated/prisma";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

type LoadCredentialOptions = {
  credentialId: string;
  userId: string;
  step: StepTools;
  nodeName: string;
  expectedType?: CredentialType;
};

export const loadCredential = async ({
  credentialId,
  userId,
  step,
  nodeName,
  expectedType,
}: LoadCredentialOptions): Promise<Credential> => {
  const credential = await step.run("get-credential", () =>
    prisma.credential.findUnique({
      where: { id: credentialId, userId },
    }),
  );

  if (!credential) {
    throw new NonRetriableError(`${nodeName}: Credential not found`);
  }

  if (expectedType && credential.type !== expectedType) {
    throw new NonRetriableError(
      `${nodeName}: Credential must be of type ${expectedType}`,
    );
  }

  return credential;
};

export const getDecryptedCredentialValue = (credential: Credential) =>
  decrypt(credential.value);
