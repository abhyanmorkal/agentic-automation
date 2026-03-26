import { createId } from "@paralleldrive/cuid2";
import toposort from "toposort";
import type { Connection, Node, NodeType } from "@/generated/prisma";
import prisma from "@/lib/db";
import { inngest } from "./client";
import { attachExecutionMetadata } from "./execution-plan";

export const topologicalSort = (
  nodes: Node[],
  connections: Connection[],
): Node[] => {
  // If no connections, return node as-is (they're all independent)
  if (connections.length === 0) {
    return nodes;
  }

  // Create edges array for toposort
  const edges: [string, string][] = connections.map((conn) => [
    conn.fromNodeId,
    conn.toNodeId,
  ]);

  // Add nodes with no connections as self-edges to ensure they're included
  const connectedNodeIds = new Set<string>();
  for (const conn of connections) {
    connectedNodeIds.add(conn.fromNodeId);
    connectedNodeIds.add(conn.toNodeId);
  }

  for (const node of nodes) {
    if (!connectedNodeIds.has(node.id)) {
      edges.push([node.id, node.id]);
    }
  }

  // Perform topological sort
  let sortedNodeIds: string[];
  try {
    sortedNodeIds = toposort(edges);
    // Remove duplicates (from self-edges)
    sortedNodeIds = [...new Set(sortedNodeIds)];
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cyclic")) {
      throw new Error("Workflow contains a cycle");
    }
    throw error;
  }

  // Map sorted IDs back to node objects
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return sortedNodeIds
    .map((id) => nodeMap.get(id))
    .filter((node): node is Node => Boolean(node));
};

/**
 * Sends a workflow execution event to Inngest.
 * @param data - The workflow ID and any initial trigger data.
 * @param options.checkActive - When true (default for automatic triggers),
 *   silently skips the execution if the workflow is paused. Set to false for
 *   manual executions so the user can always test regardless of active state.
 */
export const sendWorkflowExecution = async (
  data: {
    workflowId: string;
    triggerNodeId?: string;
    triggerType?: NodeType;
    initialData?: Record<string, unknown>;
    [key: string]: unknown;
  },
  options: { checkActive?: boolean } = { checkActive: true },
) => {
  if (options.checkActive !== false) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: data.workflowId },
      select: { isActive: true },
    });

    if (!workflow?.isActive) {
      return null;
    }
  }

  try {
    const payload = {
      ...data,
      initialData: attachExecutionMetadata(data.initialData, {
        triggerNodeId: data.triggerNodeId,
        triggerType: data.triggerType,
      }),
    };

    return await inngest.send({
      name: "workflows/execute.workflow",
      data: payload,
      id: createId(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Workflow execution failed: Inngest is not reachable. ` +
        `Run "npm run inngest:dev" in a separate terminal to start the local Inngest server. ` +
        `Original error: ${msg}`,
    );
  }
};
