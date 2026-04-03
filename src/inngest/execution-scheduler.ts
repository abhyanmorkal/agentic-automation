type SchedulableNode = {
  id: string;
};

type SchedulableConnection = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromOutput: string | null | undefined;
};

const normalizeOutputHandle = (handle: string | null | undefined) =>
  handle && handle.length > 0 ? handle : "main";

export class ExecutionScheduler {
  private readonly outgoingConnections = new Map<
    string,
    SchedulableConnection[]
  >();
  private readonly incomingConnections = new Map<
    string,
    SchedulableConnection[]
  >();
  private readonly executionQueue: string[];
  private readonly queuedNodeIds: Set<string>;
  private readonly executedNodeIds = new Set<string>();
  private readonly activeConnectionIds = new Set<string>();

  constructor(
    nodes: SchedulableNode[],
    connections: SchedulableConnection[],
    triggerNodeId: string,
  ) {
    for (const connection of connections) {
      this.outgoingConnections.set(connection.fromNodeId, [
        ...(this.outgoingConnections.get(connection.fromNodeId) ?? []),
        connection,
      ]);
      this.incomingConnections.set(connection.toNodeId, [
        ...(this.incomingConnections.get(connection.toNodeId) ?? []),
        connection,
      ]);
    }

    this.executionQueue = nodes.some((node) => node.id === triggerNodeId)
      ? [triggerNodeId]
      : [];
    this.queuedNodeIds = new Set(this.executionQueue);
  }

  nextNodeId() {
    while (this.executionQueue.length > 0) {
      const nextNodeId = this.executionQueue.shift();
      if (!nextNodeId) {
        continue;
      }

      this.queuedNodeIds.delete(nextNodeId);

      if (this.executedNodeIds.has(nextNodeId)) {
        continue;
      }

      return nextNodeId;
    }

    return null;
  }

  markCompleted(nodeId: string, selectedOutputs?: string[] | null) {
    if (this.executedNodeIds.has(nodeId)) {
      return;
    }

    this.executedNodeIds.add(nodeId);

    const normalizedOutputs =
      Array.isArray(selectedOutputs) && selectedOutputs.length > 0
        ? new Set(
            selectedOutputs.map((handle) => normalizeOutputHandle(handle)),
          )
        : null;

    const nextConnections = (this.outgoingConnections.get(nodeId) ?? []).filter(
      (connection) =>
        !normalizedOutputs ||
        normalizedOutputs.has(normalizeOutputHandle(connection.fromOutput)),
    );

    for (const connection of nextConnections) {
      this.activeConnectionIds.add(connection.id);
    }

    for (const connection of nextConnections) {
      this.enqueueIfReady(connection.toNodeId);
    }
  }

  private enqueueIfReady(nodeId: string) {
    if (this.executedNodeIds.has(nodeId) || this.queuedNodeIds.has(nodeId)) {
      return;
    }

    const activeIncoming = (this.incomingConnections.get(nodeId) ?? []).filter(
      (connection) => this.activeConnectionIds.has(connection.id),
    );

    if (
      activeIncoming.length > 0 &&
      activeIncoming.every((connection) =>
        this.executedNodeIds.has(connection.fromNodeId),
      )
    ) {
      this.executionQueue.push(nodeId);
      this.queuedNodeIds.add(nodeId);
    }
  }
}

export const simulateExecutionOrder = ({
  nodes,
  connections,
  triggerNodeId,
  selectedOutputsByNodeId = {},
}: {
  nodes: SchedulableNode[];
  connections: SchedulableConnection[];
  triggerNodeId: string;
  selectedOutputsByNodeId?: Record<string, string[] | null | undefined>;
}) => {
  const scheduler = new ExecutionScheduler(nodes, connections, triggerNodeId);
  const order: string[] = [];

  while (true) {
    const nodeId = scheduler.nextNodeId();
    if (!nodeId) {
      break;
    }

    order.push(nodeId);
    scheduler.markCompleted(nodeId, selectedOutputsByNodeId[nodeId]);
  }

  return order;
};
