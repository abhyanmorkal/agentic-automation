"use client";

import { Google } from "@lobehub/icons";
import {
  type Node,
  type NodeProps,
  useEdges,
  useNodes,
  useReactFlow,
} from "@xyflow/react";
import { memo, useMemo, useState } from "react";
import { buildVariableTreeFromContext } from "@/features/executions/lib/variable-tree";
import type { WorkflowContext } from "@/features/executions/types";
import { GOOGLE_SHEETS_CHANNEL_NAME } from "@/inngest/channels/google-sheets";
import { useNodeStatus } from "../../hooks/use-node-status";
import { BaseExecutionNode } from "../base-execution-node";
import { fetchGoogleSheetsRealtimeToken } from "./actions";
import { GoogleSheetsDialog, type GoogleSheetsFormValues } from "./dialog";
import type { UpstreamSource } from "./types";

export type { UpstreamSource } from "./types";

type GoogleSheetsNodeData = {
  spreadsheetId?: string;
  sheetTitle?: string;
  range?: string;
  action?: "append" | "read" | "update" | "delete" | "clear" | "create_sheet";
  credentialId?: string;
  variableName?: string;
  values?: string;
  sourceVariable?: string;
  columnMappings?: Record<string, string | undefined>;
  readFilter?: { column: string; operator: string; value: string };
  readOutputMapping?: Record<string, string>;
  selectedResponseName?: string;
  updateRowNumber?: string;
  deleteRowNumber?: string;
  newSheetName?: string;
  context?: WorkflowContext;
};
type GoogleSheetsNodeType = Node<GoogleSheetsNodeData>;

/**
 * Human-readable label for a node type used in the Source Data dropdown.
 */
const NODE_TYPE_LABELS: Record<string, string> = {
  WEBHOOK_TRIGGER: "Webhook",
  FACEBOOK_LEAD_TRIGGER: "Facebook Lead",
  HTTP_REQUEST: "HTTP Request",
  GOOGLE_FORM_TRIGGER: "Google Form",
  STRIPE_TRIGGER: "Stripe",
  SCHEDULE_TRIGGER: "Schedule",
  MANUAL_TRIGGER: "Manual",
};

/**
 * The runtime variable key used in execution context for each trigger type.
 */
const NODE_TYPE_VAR_KEY: Record<string, string> = {
  WEBHOOK_TRIGGER: "webhook",
  FACEBOOK_LEAD_TRIGGER: "facebookLead",
  HTTP_REQUEST: "httpRequest",
  GOOGLE_FORM_TRIGGER: "googleForm",
  STRIPE_TRIGGER: "stripe",
  SCHEDULE_TRIGGER: "schedule",
  MANUAL_TRIGGER: "manual",
};

function flattenObject(
  obj: Record<string, unknown>,
  prefix = "",
  depth = 0,
): { key: string; label: string; example?: string }[] {
  if (depth > 3) return [];
  const fields: { key: string; label: string; example?: string }[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean"
    ) {
      fields.push({ key: path, label: path, example: String(v) });
    } else if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      fields.push(
        ...flattenObject(v as Record<string, unknown>, path, depth + 1),
      );
    }
  }
  return fields;
}

export const GoogleSheetsNode = memo(
  (props: NodeProps<GoogleSheetsNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();
    const edges = useEdges();
    const nodes = useNodes();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: GOOGLE_SHEETS_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchGoogleSheetsRealtimeToken,
    });

    const handleSubmit = (values: GoogleSheetsFormValues) => {
      setNodes((ns) =>
        ns.map((n) =>
          n.id === props.id ? { ...n, data: { ...n.data, ...values } } : n,
        ),
      );
    };

    const availableVariables = useMemo(() => {
      const context =
        (props.data?.context as WorkflowContext | undefined) ?? {};
      const sourceVariable =
        (props.data?.sourceVariable as string | undefined) ?? "webhook";
      return buildVariableTreeFromContext(
        context as WorkflowContext,
        sourceVariable,
      );
    }, [props.data]);

    // Discover ALL upstream nodes (traverse edges backward, recursively up to 5 levels)
    const upstreamSources = useMemo((): UpstreamSource[] => {
      const visited = new Set<string>();
      const sources: UpstreamSource[] = [];

      function walk(targetId: string, depth: number) {
        if (depth > 5) return;
        const inbound = edges.filter((e) => e.target === targetId);
        for (const edge of inbound) {
          if (visited.has(edge.source)) continue;
          visited.add(edge.source);
          const srcNode = nodes.find((n) => n.id === edge.source);
          if (!srcNode || !srcNode.type) continue;

          const nodeType = srcNode.type;
          const varKey =
            NODE_TYPE_VAR_KEY[nodeType] ??
            nodeType.toLowerCase().replace(/_/g, "");
          const label =
            NODE_TYPE_LABELS[nodeType] ?? nodeType.replace(/_/g, " ");
          const nodeData = srcNode.data as Record<string, unknown> | undefined;

          // Extract saved response names - handle both Webhook (savedResponses)
          // and Facebook Lead (sampleResponseSimple/sampleResponseAdvanced) patterns
          const saved = nodeData?.savedResponses as
            | Record<string, unknown>
            | undefined;
          let savedResponseNames = saved ? Object.keys(saved) : [];

          // Facebook Lead trigger stores data differently
          if (
            savedResponseNames.length === 0 &&
            nodeType === "FACEBOOK_LEAD_TRIGGER"
          ) {
            const hasSample =
              nodeData?.sampleResponseSimple ||
              nodeData?.sampleResponseAdvanced;
            if (hasSample) {
              // Synthesize virtual "response" entries that match what the dialog expects
              savedResponseNames = [];
              if (nodeData?.sampleResponseSimple)
                savedResponseNames.push("Simple");
              if (nodeData?.sampleResponseAdvanced)
                savedResponseNames.push("Advanced");
            }
          }

          // Use the node name or try a description
          const nodeName =
            (nodeData?.description as string) ||
            (nodeData?.pageName as string) ||
            "";
          const displayLabel = nodeName
            ? `${label} - ${nodeName}`
            : `${label} (${srcNode.id.slice(-6)})`;

          sources.push({
            nodeId: srcNode.id,
            nodeType,
            label: displayLabel,
            variableKey: varKey,
            savedResponseNames,
          });

          // Continue walking upstream
          walk(edge.source, depth + 1);
        }
      }

      walk(props.id, 0);
      return sources;
    }, [props.id, edges, nodes]);

    // Build saved response fields for the selected source + selected response name
    const {
      savedResponseFields,
      savedResponseFieldsByName,
      activeResponseName,
      allResponseNames,
    } = useMemo(() => {
      const empty = {
        savedResponseFields: [] as {
          key: string;
          label: string;
          example?: string;
        }[],
        savedResponseFieldsByName: {} as Record<
          string,
          { key: string; label: string; example?: string }[]
        >,
        activeResponseName: undefined as string | undefined,
        allResponseNames: [] as string[],
      };

      // Find the currently selected source
      const selectedSource = props.data?.sourceVariable ?? "webhook";
      const sourceNode =
        upstreamSources.find((s) => s.variableKey === selectedSource) ??
        upstreamSources[0];

      if (!sourceNode) return empty;

      const srcNodeData = nodes.find((n) => n.id === sourceNode.nodeId)?.data as
        | Record<string, unknown>
        | undefined;

      // Handle Webhook-style savedResponses
      const saved = srcNodeData?.savedResponses as
        | Record<string, { data?: Record<string, unknown> | unknown }>
        | undefined;

      // Handle Facebook Lead-style sample data
      if (!saved && sourceNode.nodeType === "FACEBOOK_LEAD_TRIGGER") {
        const names = sourceNode.savedResponseNames;
        if (names.length === 0) return empty;

        const userSelected = props.data?.selectedResponseName;
        const preferredName =
          userSelected && names.includes(userSelected)
            ? userSelected
            : (names[0] ?? "Simple");
        const fieldsByName = Object.fromEntries(
          names.map((name) => {
            const dataKey =
              name === "Simple"
                ? "sampleResponseSimple"
                : "sampleResponseAdvanced";
            const sampleData = srcNodeData?.[dataKey] as
              | Record<string, unknown>
              | undefined;
            return [
              name,
              sampleData && typeof sampleData === "object"
                ? flattenObject(sampleData)
                : [],
            ];
          }),
        );

        // Map virtual response names to actual data properties
        const dataKey =
          preferredName === "Simple"
            ? "sampleResponseSimple"
            : "sampleResponseAdvanced";
        const data = srcNodeData?.[dataKey] as
          | Record<string, unknown>
          | undefined;

        if (!data || typeof data !== "object") {
          return {
            savedResponseFields: [],
            savedResponseFieldsByName: fieldsByName,
            activeResponseName: preferredName,
            allResponseNames: names,
          };
        }

        const fields = flattenObject(data);
        return {
          savedResponseFields: fields,
          savedResponseFieldsByName: fieldsByName,
          activeResponseName: preferredName,
          allResponseNames: names,
        };
      }

      if (!saved) return empty;

      const names = Object.keys(saved);
      if (names.length === 0) return empty;

      // Use user-selected response name, or fall back to first available
      const userSelected = props.data?.selectedResponseName;
      const preferredName =
        userSelected && names.includes(userSelected)
          ? userSelected
          : names.includes("Response A")
            ? "Response A"
            : (names[0] ?? "Simple");
      const fieldsByName = Object.fromEntries(
        names.map((name) => {
          const responseData = saved[name]?.data;
          return [
            name,
            responseData && typeof responseData === "object"
              ? flattenObject(responseData as Record<string, unknown>)
              : [],
          ];
        }),
      );

      const selected = saved[preferredName];
      const data = selected?.data;

      if (!data || typeof data !== "object") {
        return {
          savedResponseFields: [],
          savedResponseFieldsByName: fieldsByName,
          activeResponseName: preferredName,
          allResponseNames: names,
        };
      }

      const fields = flattenObject(data as Record<string, unknown>);
      return {
        savedResponseFields: fields,
        savedResponseFieldsByName: fieldsByName,
        activeResponseName: preferredName,
        allResponseNames: names,
      };
    }, [
      props.data?.sourceVariable,
      props.data?.selectedResponseName,
      upstreamSources,
      nodes,
    ]);

    const ACTION_LABELS: Record<string, string> = {
      append: "Add Row",
      read: "Get Row(s)",
      update: "Update Row",
      delete: "Delete Row",
      clear: "Clear Range",
      create_sheet: "Create Sheet Tab",
    };
    const actionLabel = ACTION_LABELS[props.data?.action ?? "append"] ?? props.data?.action ?? "append";
    const description = props.data?.spreadsheetId
      ? `${actionLabel} — ${props.data.sheetTitle || props.data.range || ""}`
      : "Not configured";

    return (
      <>
        <GoogleSheetsDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={props.data}
          availableVariables={availableVariables}
          upstreamSources={upstreamSources}
          savedResponseFields={savedResponseFields}
          savedResponseFieldsByName={savedResponseFieldsByName}
          activeResponseName={activeResponseName}
          allResponseNames={allResponseNames}
        />
        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={Google.Color}
          name="Google Sheets"
          status={nodeStatus}
          description={description}
          onSettings={() => setDialogOpen(true)}
          onDoubleClick={() => setDialogOpen(true)}
        />
      </>
    );
  },
);

GoogleSheetsNode.displayName = "GoogleSheetsNode";

