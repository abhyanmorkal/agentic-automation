import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import {
  verifyFacebookSignature,
  verifyStripeSignature,
} from "@/lib/webhook-security";

test("facebook webhook signature passes with matching secret", () => {
  process.env.FACEBOOK_APP_SECRET = "facebook-secret";
  const body = Buffer.from('{"hello":"world"}', "utf8");
  const signature = `sha256=${crypto
    .createHmac("sha256", "facebook-secret")
    .update(body)
    .digest("hex")}`;

  assert.equal(verifyFacebookSignature(body, signature), true);
});

test("facebook webhook signature fails when tampered", () => {
  process.env.FACEBOOK_APP_SECRET = "facebook-secret";
  const body = Buffer.from('{"hello":"world"}', "utf8");

  assert.equal(verifyFacebookSignature(body, "sha256=bad"), false);
});

test("stripe webhook signature passes with matching secret and fresh timestamp", () => {
  process.env.STRIPE_WEBHOOK_SECRET = "stripe-secret";
  const body = Buffer.from('{"id":"evt_123"}', "utf8");
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac("sha256", "stripe-secret")
    .update(`${timestamp}.${body.toString("utf8")}`)
    .digest("hex");

  assert.equal(
    verifyStripeSignature(body, `t=${timestamp},v1=${signature}`),
    true,
  );
});

test("stripe webhook signature fails when stale", () => {
  process.env.STRIPE_WEBHOOK_SECRET = "stripe-secret";
  const body = Buffer.from('{"id":"evt_123"}', "utf8");
  const timestamp = Math.floor(Date.now() / 1000) - 600;
  const signature = crypto
    .createHmac("sha256", "stripe-secret")
    .update(`${timestamp}.${body.toString("utf8")}`)
    .digest("hex");

  assert.equal(
    verifyStripeSignature(body, `t=${timestamp},v1=${signature}`),
    false,
  );
});
