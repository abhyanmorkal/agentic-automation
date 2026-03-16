"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
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
  range?: string;
  action?: "append" | "read";
  credentialId?: string;
  variableName?: string;
  values?: string;
  sourceVariable?: string;
  context?: WorkflowContext;
};
type GoogleSheetsNodeType = Node<GoogleSheetsNodeData>;

export const GoogleSheetsNode = memo((props: NodeProps<GoogleSheetsNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GOOGLE_SHEETS_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGoogleSheetsRealtimeToken,
  });

  const handleSubmit = (values: GoogleSheetsFormValues) => {
    setNodes((nodes) => nodes.map((n) => n.id === props.id ? { ...n, data: { ...n.data, ...values } } : n));
  };

  const availableVariables = useMemo(() => {
    const context = (props.data?.context as WorkflowContext | undefined) ?? {};
    const sourceVariable = (props.data?.sourceVariable as string | undefined) ?? "webhook";
    return buildVariableTreeFromContext(context as WorkflowContext, sourceVariable);
  }, [props.data]);

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
