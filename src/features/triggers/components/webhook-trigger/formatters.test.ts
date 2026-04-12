import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWebhookFieldPaths,
  buildWebhookSampleViews,
  type WebhookSampleRaw,
} from "./formatters";

test("buildWebhookSampleViews extracts simple scalar body fields", () => {
  const raw: WebhookSampleRaw = {
    body: {
      email: "test@example.com",
      active: true,
      count: 3,
      nested: { city: "Pune" },
    },
    headers: {},
    method: "POST",
    receivedAt: "2026-04-12T00:00:00.000Z",
  };

  const views = buildWebhookSampleViews(raw);

  assert.deepEqual(views.simple, {
    email: "test@example.com",
    active: "true",
    count: "3",
  });
});

test("buildWebhookFieldPaths exposes nested body, query, and selected header paths", () => {
  const raw: WebhookSampleRaw = {
    body: {
      customer: {
        email: "test@example.com",
      },
      items: [{ sku: "abc-123" }],
    },
    headers: {
      "content-type": "application/json",
      "x-webhook-signature": "sha256=abc",
      authorization: "secret",
    },
    method: "POST",
    query: {
      source: "shopify",
    },
    receivedAt: "2026-04-12T00:00:00.000Z",
  };

  const paths = buildWebhookFieldPaths(raw);
  const names = paths.map((item) => item.path);

  assert.ok(names.includes("body.customer.email"));
  assert.ok(names.includes("body.items[0].sku"));
  assert.ok(names.includes("query.source"));
  assert.ok(names.includes("headers.content-type"));
  assert.ok(!names.includes("headers.authorization"));
});
