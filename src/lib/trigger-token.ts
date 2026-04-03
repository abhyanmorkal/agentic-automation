import { createHmac, timingSafeEqual } from "node:crypto";

type TriggerTokenPayload = {
  workflowId: string;
  nodeId: string;
  exp: number;
};

type TriggerTokenData = Omit<TriggerTokenPayload, "exp">;

const TRIGGER_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;

const getTriggerTokenSecret = () => {
  const secret =
    process.env.ENCRYPTION_KEY?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "Trigger token signing requires ENCRYPTION_KEY or an auth secret to be configured.",
    );
  }

  return secret;
};

const encodeBase64Url = (value: string) =>
  Buffer.from(value, "utf8").toString("base64url");

const decodeBase64Url = (value: string) =>
  Buffer.from(value, "base64url").toString("utf8");

const signPayload = (encodedPayload: string) =>
  createHmac("sha256", getTriggerTokenSecret())
    .update(encodedPayload)
    .digest("base64url");

export const createTriggerToken = ({
  workflowId,
  nodeId,
}: TriggerTokenData) => {
  const payload: TriggerTokenPayload = {
    workflowId,
    nodeId,
    exp: Date.now() + TRIGGER_TOKEN_TTL_MS,
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
};

export const decodeTriggerToken = (
  rawToken: string,
): TriggerTokenData | null => {
  try {
    const normalized = rawToken.endsWith("_pc")
      ? rawToken.slice(0, -3)
      : rawToken;
    const [encodedPayload, signature] = normalized.split(".");

    if (!encodedPayload || !signature) {
      return null;
    }

    const expectedSignature = signPayload(encodedPayload);
    const provided = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    ) {
      return null;
    }

    const parsed = JSON.parse(
      decodeBase64Url(encodedPayload),
    ) as Partial<TriggerTokenPayload>;

    if (
      !parsed.workflowId ||
      !parsed.nodeId ||
      typeof parsed.exp !== "number" ||
      parsed.exp < Date.now()
    ) {
      return null;
    }

    return {
      workflowId: parsed.workflowId,
      nodeId: parsed.nodeId,
    };
  } catch {
    return null;
  }
};
