import assert from "node:assert/strict";
import test from "node:test";
import { createOAuthState, verifyOAuthState } from "@/lib/oauth-state";

test("oauth state roundtrip succeeds for matching provider", () => {
  process.env.ENCRYPTION_KEY = "test-secret";

  const created = createOAuthState({
    userId: "user_123",
    name: "Test User",
    provider: "google",
    mode: "popup",
  });

  const verified = verifyOAuthState(created.state, "google");

  assert.equal(verified.userId, "user_123");
  assert.equal(verified.provider, "google");
  assert.equal(verified.mode, "popup");
  assert.equal(verified.nonce, created.nonce);
});

test("oauth state rejects tampered signatures", () => {
  process.env.ENCRYPTION_KEY = "test-secret";

  const created = createOAuthState({
    userId: "user_123",
    name: "Test User",
    provider: "google",
    mode: "popup",
  });

  const [payload, signature] = created.state.split(".");
  const tampered = `${payload}.${signature}x`;

  assert.throws(
    () => verifyOAuthState(tampered, "google"),
    /Invalid OAuth state signature/,
  );
});

test("oauth state rejects mismatched provider", () => {
  process.env.ENCRYPTION_KEY = "test-secret";

  const created = createOAuthState({
    userId: "user_123",
    name: "Test User",
    provider: "google",
    mode: "popup",
  });

  assert.throws(
    () => verifyOAuthState(created.state, "facebook"),
    /OAuth state payload is incomplete/,
  );
});
