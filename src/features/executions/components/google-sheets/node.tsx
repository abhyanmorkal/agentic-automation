"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { Google } from "@lobehub/icons";
import { BaseExecutionNode } from "../base-execution-node";
import { GoogleSheetsDialog, type GoogleSheetsFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchGoogleSheetsRealtimeToken } from "./actions";
import { GOOGLE_SHEETS_CHANNEL_NAME } from "@/inngest/channels/google-sheets";

type GoogleSheetsNodeData = { spreadsheetId?: string; range?: string; action?: "append" | "read"; credentialId?: string; variableName?: string; values?: string };
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

  const description = props.data?.spreadsheetId
    ? `${props.data.action ?? "append"} · ${props.data.range ?? ""}`
    : "Not configured";

  return (
    <>
      <GoogleSheetsDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleSubmit} defaultValues={props.data} />
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
