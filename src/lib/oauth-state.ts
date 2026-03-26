import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

type OAuthProvider = "google" | "facebook";
type OAuthMode = "popup" | "redirect";

type OAuthStatePayload = {
  userId: string;
  name: string;
  provider: OAuthProvider;
  mode: OAuthMode;
  nonce: string;
  exp: number;
};

export type OAuthStateData = Omit<OAuthStatePayload, "exp">;

const OAUTH_STATE_COOKIE_PREFIX = "oauth_state_nonce";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const getOAuthStateSecret = () => {
  const secret =
    process.env.ENCRYPTION_KEY?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "OAuth state signing requires ENCRYPTION_KEY or an auth secret to be configured.",
    );
  }

  return secret;
};

const encodeBase64Url = (value: string) =>
  Buffer.from(value).toString("base64url");

const decodeBase64Url = (value: string) =>
  Buffer.from(value, "base64url").toString("utf8");

const signState = (payload: string) =>
  createHmac("sha256", getOAuthStateSecret())
    .update(payload)
    .digest("base64url");

export const getOAuthStateCookieName = (provider: OAuthProvider) =>
  `${OAUTH_STATE_COOKIE_PREFIX}_${provider}`;

export const createOAuthState = (
  input: Omit<OAuthStatePayload, "nonce" | "exp"> & { nonce?: string },
) => {
  const payload: OAuthStatePayload = {
    ...input,
    nonce: input.nonce ?? randomUUID(),
    exp: Date.now() + OAUTH_STATE_TTL_MS,
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signState(encodedPayload);

  return {
    state: `${encodedPayload}.${signature}`,
    nonce: payload.nonce,
    expiresAt: payload.exp,
  };
};

export const verifyOAuthState = (
  state: string,
  provider: OAuthProvider,
): OAuthStatePayload => {
  const [encodedPayload, signature] = state.split(".");

  if (!encodedPayload || !signature) {
    throw new Error("Invalid OAuth state format");
  }

  const expectedSignature = signState(encodedPayload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    throw new Error("Invalid OAuth state signature");
  }

  const payload = JSON.parse(
    decodeBase64Url(encodedPayload),
  ) as Partial<OAuthStatePayload>;

  if (
    payload.provider !== provider ||
    !payload.userId ||
    !payload.name ||
    !payload.mode ||
    !payload.nonce ||
    typeof payload.exp !== "number"
  ) {
    throw new Error("OAuth state payload is incomplete");
  }

  if (payload.exp < Date.now()) {
    throw new Error("OAuth state has expired");
  }

  return payload as OAuthStatePayload;
};

export const getOAuthStateCookieOptions = (expiresAt: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  expires: new Date(expiresAt),
});
