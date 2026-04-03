import {
  type Connection,
  type Node,
  NodeType,
  type Workflow,
} from "@/generated/prisma";
import { planWorkflowExecution } from "@/inngest/execution-plan";
import { topologicalSort } from "@/inngest/utils";
import {
  AppError,
  WorkflowValidationError,
  type WorkflowValidationIssue,
} from "./errors";

type DraftNode = {
  id: string;
  type?: string | null;
  data?: Record<string, unknown> | null;
};

type DraftEdge = {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

type WorkflowWithGraph = Workflow & {
  nodes: Node[];
  connections: Connection[];
};

const TRIGGER_NODE_TYPES = new Set<NodeType>([
  NodeType.MANUAL_TRIGGER,
  NodeType.GOOGLE_FORM_TRIGGER,
  NodeType.STRIPE_TRIGGER,
  NodeType.WEBHOOK_TRIGGER,
  NodeType.SCHEDULE_TRIGGER,
  NodeType.FACEBOOK_LEAD_TRIGGER,
]);

const NODE_FIELD_LABELS: Partial<
  Record<NodeType, Array<{ field: string; label: string }>>
> = {
  [NodeType.OPENAI]: [
    { field: "variableName", label: "Variable name" },
    { field: "credentialId", label: "Credential" },
    { field: "prompt", label: "Prompt" },
  ],
  [NodeType.GEMINI]: [
    { field: "variableName", label: "Variable name" },
    { field: "credentialId", label: "Credential" },
    { field: "prompt", label: "Prompt" },
  ],
  [NodeType.ANTHROPIC]: [
    { field: "variableName", label: "Variable name" },
    { field: "credentialId", label: "Credential" },
    { field: "prompt", label: "Prompt" },
  ],
  [NodeType.HTTP_REQUEST]: [
    { field: "variableName", label: "Variable name" },
    { field: "endpoint", label: "Endpoint" },
    { field: "method", label: "Method" },
  ],
  [NodeType.IF]: [
    { field: "leftValue", label: "Left value" },
    { field: "operator", label: "Operator" },
  ],
  [NodeType.SWITCH]: [
    { field: "sourceValue", label: "Source value" },
    { field: "cases", label: "Cases" },
  ],
  [NodeType.DELAY]: [
    { field: "amount", label: "Amount" },
    { field: "unit", label: "Unit" },
  ],
  [NodeType.SLACK]: [
    { field: "variableName", label: "Variable name" },
    { field: "webhookUrl", label: "Webhook URL" },
    { field: "content", label: "Message content" },
  ],
  [NodeType.DISCORD]: [
    { field: "variableName", label: "Variable name" },
    { field: "webhookUrl", label: "Webhook URL" },
    { field: "content", label: "Message content" },
  ],
  [NodeType.TELEGRAM]: [
    { field: "variableName", label: "Variable name" },
    { field: "credentialId", label: "Credential" },
    { field: "chatId", label: "Chat ID" },
    { field: "message", label: "Message" },
  ],
  [NodeType.NOTION]: [
    { field: "variableName", label: "Variable name" },
    { field: "credentialId", label: "Credential" },
    { field: "databaseId", label: "Database ID" },
    { field: "title", label: "Title" },
  ],
  [NodeType.AIRTABLE]: [
    { field: "variableName", label: "Variable name" },
    { field: "credentialId", label: "Credential" },
    { field: "baseId", label: "Base ID" },
    { field: "tableId", label: "Table ID" },
  ],
  [NodeType.SEND_EMAIL]: [
    { field: "variableName", label: "Variable name" },
    { field: "credentialId", label: "Credential" },
    { field: "to", label: "Recipient" },
    { field: "subject", label: "Subject" },
    { field: "body", label: "Body" },
  ],
  [NodeType.SEND_SMS]: [
    { field: "variableName", label: "Variable name" },
    { field: "credentialId", label: "Credential" },
    { field: "to", label: "Recipient" },
    { field: "message", label: "Message" },
  ],
  [NodeType.GMAIL]: [
    { field: "variableName", label: "Variable name" },
    { field: "credentialId", label: "Credential" },
    { field: "to", label: "Recipient" },
    { field: "subject", label: "Subject" },
  ],
  [NodeType.GOOGLE_SHEETS]: [
    { field: "variableName", label: "Variable name" },
    { field: "credentialId", label: "Credential" },
    { field: "spreadsheetId", label: "Spreadsheet" },
    { field: "sheetTitle", label: "Sheet" },
    { field: "action", label: "Action" },
  ],
  [NodeType.GOOGLE_DRIVE]: [
    { field: "variableName", label: "Variable name" },
    { field: "credentialId", label: "Credential" },
    { field: "action", label: "Action" },
  ],
  [NodeType.WHATSAPP]: [
    { field: "variableName", label: "Variable name" },
    { field: "credentialId", label: "Credential" },
    { field: "phoneNumberId", label: "Phone number ID" },
    { field: "to", label: "Recipient" },
    { field: "message", label: "Message" },
  ],
  [NodeType.INSTAGRAM]: [
    { field: "variableName", label: "Variable name" },
    { field: "credentialId", label: "Credential" },
    { field: "igUserId", label: "Instagram user ID" },
    { field: "imageUrl", label: "Image URL" },
  ],
  [NodeType.FACEBOOK_PAGE]: [
    { field: "variableName", label: "Variable name" },
    { field: "credentialId", label: "Credential" },
    { field: "pageId", label: "Page ID" },
    { field: "message", label: "Message" },
  ],
  [NodeType.SCHEDULE_TRIGGER]: [
    { field: "cronExpression", label: "Cron expression" },
  ],
  [NodeType.FACEBOOK_LEAD_TRIGGER]: [
    { field: "credentialId", label: "Credential" },
    { field: "pageId", label: "Page" },
    { field: "formId", label: "Lead form" },
  ],
  [NodeType.MCP_TOOL]: [
    { field: "variableName", label: "Variable name" },
    { field: "serverUrl", label: "Server URL" },
    { field: "toolName", label: "Tool name" },
  ],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getNodeData = (node: DraftNode | Node) =>
  isRecord(node.data) ? node.data : {};

const getNodeType = (node: DraftNode) => {
  if (!node.type) {
    return null;
  }

  return Object.values(NodeType).includes(node.type as NodeType)
    ? (node.type as NodeType)
    : null;
};

const getNonEmptyString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const hasRequiredValue = (value: unknown) => {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "boolean") {
    return true;
  }

  return value !== null && value !== undefined;
};

const createIssue = (
  message: string,
  issue: Omit<WorkflowValidationIssue, "message"> = {},
): WorkflowValidationIssue => ({
  message,
  ...issue,
});

const assertNoValidationIssues = (issues: WorkflowValidationIssue[]) => {
  if (issues.length > 0) {
    throw new WorkflowValidationError(issues);
  }
};

export const validateWorkflowDraft = ({
  nodes,
  edges,
}: {
  nodes: DraftNode[];
  edges: DraftEdge[];
}) => {
  const issues: WorkflowValidationIssue[] = [];
  const nodeIds = new Set<string>();
  const entryNodes: DraftNode[] = [];
  const variableNames = new Map<string, string>();

  for (const node of nodes) {
    if (!node.id) {
      issues.push(createIssue("Workflow contains a node without an id"));
      continue;
    }

    if (nodeIds.has(node.id)) {
      issues.push(
        createIssue(`Workflow contains duplicate node id "${node.id}"`, {
          nodeId: node.id,
        }),
      );
      continue;
    }

    nodeIds.add(node.id);

    const nodeType = getNodeType(node);
    if (!nodeType) {
      issues.push(
        createIssue(`Node "${node.id}" has an invalid or missing type`, {
          nodeId: node.id,
        }),
      );
      continue;
    }

    if (nodeType === NodeType.INITIAL || TRIGGER_NODE_TYPES.has(nodeType)) {
      entryNodes.push(node);
    }

    const data = getNodeData(node);
    const variableName = getNonEmptyString(data.variableName);
    if (variableName) {
      const existingOwner = variableNames.get(variableName);
      if (existingOwner) {
        issues.push(
          createIssue(
            `Variable name "${variableName}" is used by more than one node`,
            {
              nodeId: node.id,
              field: "variableName",
            },
          ),
        );
      } else {
        variableNames.set(variableName, node.id);
      }
    }

    for (const requirement of NODE_FIELD_LABELS[nodeType] ?? []) {
      if (!hasRequiredValue(data[requirement.field])) {
        issues.push(
          createIssue(`${nodeType}: ${requirement.label} is required`, {
            nodeId: node.id,
            field: requirement.field,
          }),
        );
      }
    }

    if (nodeType === NodeType.SWITCH) {
      const cases = Array.isArray(data.cases) ? data.cases : [];
      const hasConfiguredCase = cases.some(
        (item) =>
          isRecord(item) &&
          typeof item.value === "string" &&
          item.value.trim().length > 0,
      );

      if (!hasConfiguredCase) {
        issues.push(
          createIssue("SWITCH: Add at least one case with a match value", {
            nodeId: node.id,
            field: "cases",
          }),
        );
      }
    }
  }

  if (entryNodes.length !== 1) {
    issues.push(
      createIssue(
        "Workflow must contain exactly one entry node (trigger or initial node)",
      ),
    );
  }

  const edgeKeys = new Set<string>();
  for (const edge of edges) {
    const edgeKey = `${edge.source}:${edge.sourceHandle ?? "main"}->${edge.target}:${edge.targetHandle ?? "main"}`;
    if (edgeKeys.has(edgeKey)) {
      issues.push(
        createIssue("Workflow contains duplicate connections", {
          edgeId: edgeKey,
        }),
      );
    }
    edgeKeys.add(edgeKey);

    if (!nodeIds.has(edge.source)) {
      issues.push(
        createIssue(`Connection source node "${edge.source}" does not exist`, {
          edgeId: edgeKey,
        }),
      );
    }

    if (!nodeIds.has(edge.target)) {
      issues.push(
        createIssue(`Connection target node "${edge.target}" does not exist`, {
          edgeId: edgeKey,
        }),
      );
    }

    if (edge.source === edge.target) {
      issues.push(
        createIssue("Self-referencing connections are not supported", {
          edgeId: edgeKey,
        }),
      );
    }
  }

  if (issues.length === 0) {
    try {
      topologicalSort(
        nodes.map(
          (node) =>
            ({
              id: node.id,
              type: (getNodeType(node) ?? NodeType.INITIAL) as NodeType,
            }) as Node,
        ),
        edges.map(
          (edge) =>
            ({
              fromNodeId: edge.source,
              toNodeId: edge.target,
            }) as Connection,
        ),
      );
    } catch (error) {
      issues.push(
        createIssue(
          error instanceof Error ? error.message : "Workflow graph is invalid",
        ),
      );
    }
  }

  assertNoValidationIssues(issues);
};

export const buildValidatedExecutionPlan = ({
  workflow,
  initialData,
  credentialIds = [],
}: {
  workflow: WorkflowWithGraph;
  initialData: unknown;
  credentialIds?: string[];
}) => {
  validateWorkflowDraft({
    nodes: workflow.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      data: getNodeData(node),
    })),
    edges: workflow.connections.map((connection) => ({
      source: connection.fromNodeId,
      target: connection.toNodeId,
      sourceHandle: connection.fromOutput,
      targetHandle: connection.toInput,
    })),
  });

  const issues: WorkflowValidationIssue[] = [];
  const triggerNodes = workflow.nodes.filter((node) =>
    TRIGGER_NODE_TYPES.has(node.type),
  );
  const actionNodes = workflow.nodes.filter(
    (node) =>
      node.type !== NodeType.INITIAL && !TRIGGER_NODE_TYPES.has(node.type),
  );

  if (triggerNodes.length === 0) {
    issues.push(
      createIssue("Workflow does not contain a runnable trigger node"),
    );
  }

  if (actionNodes.length === 0) {
    issues.push(
      createIssue(
        "Add at least one action node to your workflow, then save and run again.",
      ),
    );
  }

  for (const node of workflow.nodes) {
    const credentialId = getNonEmptyString(getNodeData(node).credentialId);
    if (!credentialId) {
      continue;
    }

    if (!credentialIds.includes(credentialId)) {
      issues.push(
        createIssue(
          `${node.type}: Selected credential was not found for this workflow`,
          {
            nodeId: node.id,
            field: "credentialId",
          },
        ),
      );
    }
  }

  if (issues.length > 0) {
    throw new WorkflowValidationError(issues);
  }

  try {
    const executionPlan = planWorkflowExecution(workflow, initialData);
    const hasReachableActionNode = executionPlan.nodes.some(
      (node) =>
        node.id !== executionPlan.triggerNode.id &&
        !TRIGGER_NODE_TYPES.has(node.type),
    );

    if (!hasReachableActionNode) {
      throw new AppError(
        "WORKFLOW_CONFIGURATION",
        "The selected trigger does not lead to any action nodes.",
      );
    }

    return executionPlan;
  } catch (error) {
    if (error instanceof WorkflowValidationError || error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "WORKFLOW_CONFIGURATION",
      error instanceof Error ? error.message : "Workflow cannot be executed",
    );
  }
};
