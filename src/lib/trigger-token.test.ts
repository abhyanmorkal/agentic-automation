import assert from "node:assert/strict";
import test from "node:test";
import { createTriggerToken, decodeTriggerToken } from "@/lib/trigger-token";

test("trigger token roundtrip succeeds", () => {
  process.env.ENCRYPTION_KEY = "test-secret";

  const token = createTriggerToken({
    workflowId: "workflow_123",
    nodeId: "node_456",
  });

  assert.deepEqual(decodeTriggerToken(token), {
    workflowId: "workflow_123",
    nodeId: "node_456",
  });
});

test("trigger token rejects tampering", () => {
  process.env.ENCRYPTION_KEY = "test-secret";

  const token = createTriggerToken({
    workflowId: "workflow_123",
    nodeId: "node_456",
  });

  const [payload, signature] = token.split(".");
  const decodedPayload = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as { workflowId: string; nodeId: string; exp: number };
  decodedPayload.nodeId = "node_999";
  const tamperedPayload = Buffer.from(
    JSON.stringify(decodedPayload),
    "utf8",
  ).toString("base64url");

  assert.equal(decodeTriggerToken(`${tamperedPayload}.${signature}`), null);
});

test("trigger token rejects legacy unsigned payloads", () => {
  const legacyToken = Buffer.from(
    JSON.stringify({ workflowId: "workflow_123", nodeId: "node_456" }),
    "utf8",
  ).toString("base64url");

  assert.equal(decodeTriggerToken(legacyToken), null);
});
