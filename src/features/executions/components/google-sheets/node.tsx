"use client";

import { useReactFlow, useEdges, useNodes, type Node, type NodeProps } from "@xyflow/react";
import { memo, useMemo, useState } from "react";
import { Google } from "@lobehub/icons";
import { BaseExecutionNode } from "../base-execution-node";
import { GoogleSheetsDialog, type GoogleSheetsFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchGoogleSheetsRealtimeToken } from "./actions";
import { GOOGLE_SHEETS_CHANNEL_NAME } from "@/inngest/channels/google-sheets";
import { buildVariableTreeFromContext } from "@/features/executions/lib/variable-tree";
import type { WorkflowContext } from "@/features/executions/types";

type GoogleSheetsNodeData = {
  spreadsheetId?: string;
  sheetTitle?: string;
  range?: string;
  action?: "append" | "read";
  credentialId?: string;
  variableName?: string;
  values?: string;
  sourceVariable?: string;
  columnMappings?: Record<string, string | undefined>;
  context?: WorkflowContext;
};
type GoogleSheetsNodeType = Node<GoogleSheetsNodeData>;

export const GoogleSheetsNode = memo((props: NodeProps<GoogleSheetsNodeType>) => {
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
    setNodes((ns) => ns.map((n) => n.id === props.id ? { ...n, data: { ...n.data, ...values } } : n));
  };

  const availableVariables = useMemo(() => {
    const context = (props.data?.context as WorkflowContext | undefined) ?? {};
    const sourceVariable = (props.data?.sourceVariable as string | undefined) ?? "webhook";
    return buildVariableTreeFromContext(context as WorkflowContext, sourceVariable);
  }, [props.data]);

  const { savedResponseFields, activeResponseName } = useMemo(() => {
    // Find upstream webhook trigger node by traversing edges
    const upstreamIds = new Set(
      edges.filter((e) => e.target === props.id).map((e) => e.source),
    );
    const webhookNode = nodes.find(
      (n) => upstreamIds.has(n.id) && n.type === "WEBHOOK_TRIGGER",
    );

    const saved = (webhookNode?.data as any)?.savedResponses as
      | Record<string, { data?: Record<string, unknown> | unknown }>
      | undefined;

    if (!saved) {
      return {
        savedResponseFields: [] as { key: string; label: string; example?: string }[],
        activeResponseName: undefined as string | undefined,
      };
    }

    const names = Object.keys(saved);
    if (names.length === 0) {
      return {
        savedResponseFields: [] as { key: string; label: string; example?: string }[],
        activeResponseName: undefined as string | undefined,
      };
    }

    const preferredName = names.includes("Response A") ? "Response A" : names[0]!;
    const selected = saved[preferredName];
    const data = selected?.data;

    if (!data || typeof data !== "object") {
      return {
        savedResponseFields: [] as { key: string; label: string; example?: string }[],
        activeResponseName: preferredName,
      };
    }

    const fields: { key: string; label: string; example?: string }[] = [];

    function flatten(obj: Record<string, unknown>, prefix = "", depth = 0) {
      if (depth > 3) return;
      for (const [k, v] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${k}` : k;
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
          fields.push({ key: path, label: path, example: String(v) });
        } else if (v !== null && typeof v === "object" && !Array.isArray(v)) {
          flatten(v as Record<string, unknown>, path, depth + 1);
        }
      }
    }

    flatten(data as Record<string, unknown>);

    return { savedResponseFields: fields, activeResponseName: preferredName };
  }, [props.id, edges, nodes]);

  const description = props.data?.spreadsheetId
    ? `${props.data.action ?? "append"} · ${props.data.range ?? ""}`
    : "Not configured";

  return (
    <>
      <GoogleSheetsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
        availableVariables={availableVariables}
        savedResponseFields={savedResponseFields}
        activeResponseName={activeResponseName}
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
});

GoogleSheetsNode.displayName = "GoogleSheetsNode";
