"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { AirtableDialog, type AirtableFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchAirtableRealtimeToken } from "./actions";
import { AIRTABLE_CHANNEL_NAME } from "@/inngest/channels/airtable";

type AirtableNodeData = { baseId?: string; tableId?: string; credentialId?: string; variableName?: string; fields?: string };
type AirtableNodeType = Node<AirtableNodeData>;

export const AirtableNode = memo((props: NodeProps<AirtableNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: AIRTABLE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchAirtableRealtimeToken,
  });

  const handleSubmit = (values: AirtableFormValues) => {
    setNodes((nodes) => nodes.map((n) => n.id === props.id ? { ...n, data: { ...n.data, ...values } } : n));
  };

  const description = props.data?.tableId
    ? `Table: ${props.data.tableId}`
    : "Not configured";

  return (
    <>
      <AirtableDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleSubmit} defaultValues={props.data} />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/airtable.svg"
        name="Airtable"
        status={nodeStatus}
        description={description}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

AirtableNode.displayName = "AirtableNode";
