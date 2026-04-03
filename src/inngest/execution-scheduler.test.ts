import assert from "node:assert/strict";
import test from "node:test";
import { simulateExecutionOrder } from "./execution-scheduler";

test("executes a simple trigger to action flow", () => {
  const order = simulateExecutionOrder({
    triggerNodeId: "trigger",
    nodes: [{ id: "trigger" }, { id: "action" }],
    connections: [
      {
        id: "c1",
        fromNodeId: "trigger",
        toNodeId: "action",
        fromOutput: "main",
      },
    ],
  });

  assert.deepEqual(order, ["trigger", "action"]);
});

test("routes only the true branch for IF", () => {
  const order = simulateExecutionOrder({
    triggerNodeId: "trigger",
    nodes: [
      { id: "trigger" },
      { id: "if-node" },
      { id: "true-action" },
      { id: "false-action" },
    ],
    connections: [
      {
        id: "c1",
        fromNodeId: "trigger",
        toNodeId: "if-node",
        fromOutput: "main",
      },
      {
        id: "c2",
        fromNodeId: "if-node",
        toNodeId: "true-action",
        fromOutput: "true",
      },
      {
        id: "c3",
        fromNodeId: "if-node",
        toNodeId: "false-action",
        fromOutput: "false",
      },
    ],
    selectedOutputsByNodeId: {
      "if-node": ["true"],
    },
  });

  assert.deepEqual(order, ["trigger", "if-node", "true-action"]);
});

test("routes only the false branch for IF", () => {
  const order = simulateExecutionOrder({
    triggerNodeId: "trigger",
    nodes: [
      { id: "trigger" },
      { id: "if-node" },
      { id: "true-action" },
      { id: "false-action" },
    ],
    connections: [
      {
        id: "c1",
        fromNodeId: "trigger",
        toNodeId: "if-node",
        fromOutput: "main",
      },
      {
        id: "c2",
        fromNodeId: "if-node",
        toNodeId: "true-action",
        fromOutput: "true",
      },
      {
        id: "c3",
        fromNodeId: "if-node",
        toNodeId: "false-action",
        fromOutput: "false",
      },
    ],
    selectedOutputsByNodeId: {
      "if-node": ["false"],
    },
  });

  assert.deepEqual(order, ["trigger", "if-node", "false-action"]);
});

test("keeps sequential execution for delay flows", () => {
  const order = simulateExecutionOrder({
    triggerNodeId: "trigger",
    nodes: [{ id: "trigger" }, { id: "delay" }, { id: "action" }],
    connections: [
      {
        id: "c1",
        fromNodeId: "trigger",
        toNodeId: "delay",
        fromOutput: "main",
      },
      {
        id: "c2",
        fromNodeId: "delay",
        toNodeId: "action",
        fromOutput: "main",
      },
    ],
  });

  assert.deepEqual(order, ["trigger", "delay", "action"]);
});

test("waits for all active incoming paths before merge continues", () => {
  const order = simulateExecutionOrder({
    triggerNodeId: "trigger",
    nodes: [
      { id: "trigger" },
      { id: "branch-a" },
      { id: "branch-b" },
      { id: "merge" },
      { id: "after-merge" },
    ],
    connections: [
      {
        id: "c1",
        fromNodeId: "trigger",
        toNodeId: "branch-a",
        fromOutput: "main",
      },
      {
        id: "c2",
        fromNodeId: "trigger",
        toNodeId: "branch-b",
        fromOutput: "secondary",
      },
      {
        id: "c3",
        fromNodeId: "branch-a",
        toNodeId: "merge",
        fromOutput: "main",
      },
      {
        id: "c4",
        fromNodeId: "branch-b",
        toNodeId: "merge",
        fromOutput: "main",
      },
      {
        id: "c5",
        fromNodeId: "merge",
        toNodeId: "after-merge",
        fromOutput: "main",
      },
    ],
  });

  assert.deepEqual(order, [
    "trigger",
    "branch-a",
    "branch-b",
    "merge",
    "after-merge",
  ]);
});

test("uses the default branch when switch has no matching case", () => {
  const order = simulateExecutionOrder({
    triggerNodeId: "trigger",
    nodes: [
      { id: "trigger" },
      { id: "switch-node" },
      { id: "case-action" },
      { id: "default-action" },
    ],
    connections: [
      {
        id: "c1",
        fromNodeId: "trigger",
        toNodeId: "switch-node",
        fromOutput: "main",
      },
      {
        id: "c2",
        fromNodeId: "switch-node",
        toNodeId: "case-action",
        fromOutput: "case-0",
      },
      {
        id: "c3",
        fromNodeId: "switch-node",
        toNodeId: "default-action",
        fromOutput: "default",
      },
    ],
    selectedOutputsByNodeId: {
      "switch-node": ["default"],
    },
  });

  assert.deepEqual(order, ["trigger", "switch-node", "default-action"]);
});

test("merge does not wait for an inactive branch that was never selected", () => {
  const order = simulateExecutionOrder({
    triggerNodeId: "trigger",
    nodes: [
      { id: "trigger" },
      { id: "if-node" },
      { id: "true-action" },
      { id: "false-action" },
      { id: "merge" },
      { id: "after-merge" },
    ],
    connections: [
      {
        id: "c1",
        fromNodeId: "trigger",
        toNodeId: "if-node",
        fromOutput: "main",
      },
      {
        id: "c2",
        fromNodeId: "if-node",
        toNodeId: "true-action",
        fromOutput: "true",
      },
      {
        id: "c3",
        fromNodeId: "if-node",
        toNodeId: "false-action",
        fromOutput: "false",
      },
      {
        id: "c4",
        fromNodeId: "true-action",
        toNodeId: "merge",
        fromOutput: "main",
      },
      {
        id: "c5",
        fromNodeId: "false-action",
        toNodeId: "merge",
        fromOutput: "main",
      },
      {
        id: "c6",
        fromNodeId: "merge",
        toNodeId: "after-merge",
        fromOutput: "main",
      },
    ],
    selectedOutputsByNodeId: {
      "if-node": ["true"],
    },
  });

  assert.deepEqual(order, [
    "trigger",
    "if-node",
    "true-action",
    "merge",
    "after-merge",
  ]);
});
