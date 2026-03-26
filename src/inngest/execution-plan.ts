import {
  type Connection,
  type Node,
  NodeType,
  type Workflow,
} from "@/generated/prisma";
import { topologicalSort } from "./utils";

type WorkflowWithGraph = Workflow & {
  nodes: Node[];
  connections: Connection[];
};

type ExecutionRuntimeMetadata = {
  triggerNodeId?: string;
  triggerType?: NodeType;
};

export const EXECUTION_METADATA_KEY = "__nodebase";

const TRIGGER_NODE_TYPES = new Set<NodeType>([
  NodeType.MANUAL_TRIGGER,
  NodeType.GOOGLE_FORM_TRIGGER,
  NodeType.STRIPE_TRIGGER,
  NodeType.WEBHOOK_TRIGGER,
  NodeType.SCHEDULE_TRIGGER,
  NodeType.FACEBOOK_LEAD_TRIGGER,
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getRuntimeMetadata = (initialData: unknown): ExecutionRuntimeMetadata => {
  if (!isRecord(initialData)) {
    return {};
  }

  const metadata = initialData[EXECUTION_METADATA_KEY];
  if (!isRecord(metadata)) {
    return {};
  }

  return {
    triggerNodeId:
      typeof metadata.triggerNodeId === "string"
        ? metadata.triggerNodeId
        : undefined,
    triggerType:
      typeof metadata.triggerType === "string"
        ? (metadata.triggerType as NodeType)
        : undefined,
  };
};

export const attachExecutionMetadata = (
  initialData: Record<string, unknown> | undefined,
  metadata: ExecutionRuntimeMetadata,
) => {
  const base = isRecord(initialData) ? { ...initialData } : {};
  const existing = getRuntimeMetadata(base);

  base[EXECUTION_METADATA_KEY] = {
    ...existing,
    ...metadata,
  };

  return base;
};

export const stripExecutionMetadata = (initialData: unknown) => {
  if (!isRecord(initialData)) {
    return {};
  }

  const { [EXECUTION_METADATA_KEY]: _metadata, ...cleanInitialData } =
    initialData;
  return cleanInitialData;
};

const getTriggerNodes = (nodes: Node[]) =>
  nodes.filter((node) => TRIGGER_NODE_TYPES.has(node.type));

const getReachableNodeIds = (
  startNodeId: string,
  connections: Connection[],
) => {
  const outgoing = new Map<string, string[]>();

  for (const connection of connections) {
    const targets = outgoing.get(connection.fromNodeId) ?? [];
    targets.push(connection.toNodeId);
    outgoing.set(connection.fromNodeId, targets);
  }

  const visited = new Set<string>();
  const queue = [startNodeId];

  while (queue.length > 0) {
    const currentNodeId = queue.shift();
    if (!currentNodeId || visited.has(currentNodeId)) {
      continue;
    }

    visited.add(currentNodeId);
    for (const nextNodeId of outgoing.get(currentNodeId) ?? []) {
      if (!visited.has(nextNodeId)) {
        queue.push(nextNodeId);
      }
    }
  }

  return visited;
};

const resolveTriggerNode = (
  workflow: WorkflowWithGraph,
  metadata: ExecutionRuntimeMetadata,
) => {
  if (metadata.triggerNodeId) {
    const node = workflow.nodes.find(
      (candidate) => candidate.id === metadata.triggerNodeId,
    );
    if (!node) {
      throw new Error(
        `Trigger node "${metadata.triggerNodeId}" was not found in this workflow`,
      );
    }

    if (!TRIGGER_NODE_TYPES.has(node.type)) {
      throw new Error(`Node "${metadata.triggerNodeId}" is not a trigger node`);
    }

    return node;
  }

  const triggerNodes = getTriggerNodes(workflow.nodes);

  if (metadata.triggerType) {
    const matchingNodes = triggerNodes.filter(
      (candidate) => candidate.type === metadata.triggerType,
    );

    if (matchingNodes.length === 1) {
      return matchingNodes[0];
    }

    if (matchingNodes.length > 1) {
      throw new Error(
        `Workflow has multiple ${metadata.triggerType} nodes. Dispatch must specify triggerNodeId.`,
      );
    }
  }

  const manualTrigger = triggerNodes.find(
    (candidate) => candidate.type === NodeType.MANUAL_TRIGGER,
  );
  if (manualTrigger) {
    return manualTrigger;
  }

  if (triggerNodes.length === 1) {
    return triggerNodes[0];
  }

  if (triggerNodes.length === 0) {
    throw new Error("Workflow does not contain a runnable trigger node");
  }

  throw new Error(
    "Workflow has multiple trigger nodes. Dispatch must specify which trigger to run.",
  );
};

export const planWorkflowExecution = (
  workflow: WorkflowWithGraph,
  initialData: unknown,
) => {
  const metadata = getRuntimeMetadata(initialData);
  const triggerNode = resolveTriggerNode(workflow, metadata);
  const reachableNodeIds = getReachableNodeIds(
    triggerNode.id,
    workflow.connections,
  );
  const reachableNodes = workflow.nodes.filter((node) =>
    reachableNodeIds.has(node.id),
  );
  const reachableConnections = workflow.connections.filter(
    (connection) =>
      reachableNodeIds.has(connection.fromNodeId) &&
      reachableNodeIds.has(connection.toNodeId),
  );

  return {
    triggerNode,
    nodes: topologicalSort(reachableNodes, reachableConnections),
  };
};
