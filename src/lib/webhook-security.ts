import crypto from "node:crypto";

const safeCompare = (provided: string, expected: string) => {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  return (
    providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  );
};

export const verifyFacebookSignature = (
  rawBody: Buffer,
  signatureHeader: string | null,
) => {
  const appSecret = process.env.FACEBOOK_APP_SECRET?.trim();

  if (!appSecret) {
    throw new Error(
      "FACEBOOK_APP_SECRET is required to verify Facebook webhooks",
    );
  }

  if (!signatureHeader) {
    return false;
  }

  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex")}`;

  return safeCompare(signatureHeader, expectedSignature);
};

export const verifyStripeSignature = (
  rawBody: Buffer,
  signatureHeader: string | null,
) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is required to verify Stripe webhooks",
    );
  }

  if (!signatureHeader) {
    return false;
  }

  const parts = signatureHeader
    .split(",")
    .reduce<Record<string, string[]>>((acc, part) => {
      const [key, value] = part.split("=", 2);
      if (!key || !value) {
        return acc;
      }

      const entries = acc[key] ?? [];
      entries.push(value);
      acc[key] = entries;
      return acc;
    }, {});

  const timestamp = parts.t?.[0];
  const signatures = parts.v1 ?? [];

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody.toString("utf8")}`;
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(signedPayload)
    .digest("hex");

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    return false;
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);
  if (ageSeconds > 300) {
    return false;
  }

  return signatures.some((signature) =>
    safeCompare(signature, expectedSignature),
  );
};
