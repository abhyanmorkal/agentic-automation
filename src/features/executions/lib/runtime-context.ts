import type { NodeType } from "@/generated/prisma";
import type { WorkflowContext } from "../types";

export const EXECUTION_RUNTIME_STATE_KEY = "__nodebaseRuntime";

type RuntimeNodeEntry = {
  id: string;
  name: string;
  type: NodeType;
  output: unknown;
  variableName?: string;
};

type ExecutionRuntimeState = {
  nodes: Record<string, RuntimeNodeEntry>;
  variables: Record<string, unknown>;
};

type RuntimeNode = {
  id: string;
  name: string;
  type: NodeType;
  data: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getVariableName = (node: RuntimeNode) => {
  const data = isRecord(node.data) ? node.data : null;
  const variableName = data?.variableName;

  return typeof variableName === "string" && variableName.length > 0
    ? variableName
    : undefined;
};

const getRuntimeState = (context: WorkflowContext): ExecutionRuntimeState => {
  const state = context[EXECUTION_RUNTIME_STATE_KEY];

  if (!isRecord(state)) {
    return { nodes: {}, variables: {} };
  }

  return {
    nodes: isRecord(state.nodes)
      ? (state.nodes as Record<string, RuntimeNodeEntry>)
      : {},
    variables: isRecord(state.variables)
      ? (state.variables as Record<string, unknown>)
      : {},
  };
};

export const getPublicContext = (context: WorkflowContext): WorkflowContext => {
  const { [EXECUTION_RUNTIME_STATE_KEY]: _runtimeState, ...publicContext } =
    context;
  return publicContext;
};

export const createExecutionContext = (
  initialData: WorkflowContext,
): WorkflowContext => ({
  ...getPublicContext(initialData),
  [EXECUTION_RUNTIME_STATE_KEY]: {
    nodes: {},
    variables: {},
  },
});

const extractNodeOutput = (
  previousContext: WorkflowContext,
  nextContext: WorkflowContext,
  node: RuntimeNode,
) => {
  const variableName = getVariableName(node);
  if (variableName && variableName in nextContext) {
    return nextContext[variableName];
  }

  const changedEntries = Object.entries(nextContext).filter(([key, value]) => {
    if (!(key in previousContext)) {
      return true;
    }

    return previousContext[key] !== value;
  });

  if (changedEntries.length === 0) {
    return null;
  }

  if (changedEntries.length === 1) {
    return changedEntries[0]?.[1];
  }

  return Object.fromEntries(changedEntries);
};

export const attachNodeResultToContext = (
  previousContext: WorkflowContext,
  nextContext: WorkflowContext,
  node: RuntimeNode,
  explicitOutput?: unknown,
) => {
  const previousPublicContext = getPublicContext(previousContext);
  const nextPublicContext = getPublicContext(nextContext);
  const nodeOutput =
    explicitOutput !== undefined
      ? explicitOutput
      : extractNodeOutput(previousPublicContext, nextPublicContext, node);
  const variableName = getVariableName(node);
  const runtimeState = getRuntimeState(previousContext);

  return {
    ...nextPublicContext,
    [EXECUTION_RUNTIME_STATE_KEY]: {
      nodes: {
        ...runtimeState.nodes,
        [node.id]: {
          id: node.id,
          name: node.name,
          type: node.type,
          output: nodeOutput,
          variableName,
        },
      },
      variables: variableName
        ? {
            ...runtimeState.variables,
            [variableName]: nodeOutput,
          }
        : runtimeState.variables,
    },
  } satisfies WorkflowContext;
};

export const getNodeExecutionOutput = (
  context: WorkflowContext,
  nodeId: string,
) => getRuntimeState(context).nodes[nodeId]?.output;

export const getTemplateContext = (context: WorkflowContext) => {
  const publicContext = getPublicContext(context);
  const runtimeState = getRuntimeState(context);
  const nodeReferences = Object.fromEntries(
    Object.entries(runtimeState.nodes).map(([nodeId, nodeEntry]) => [
      nodeId,
      {
        id: nodeEntry.id,
        name: nodeEntry.name,
        type: nodeEntry.type,
        output: nodeEntry.output,
        variableName: nodeEntry.variableName,
      },
    ]),
  );

  return {
    ...publicContext,
    $node: nodeReferences,
    $vars: runtimeState.variables,
    $execution: {
      nodes: nodeReferences,
    },
  };
};
