"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { Google } from "@lobehub/icons";
import { BaseExecutionNode } from "../base-execution-node";
import { GmailDialog, type GmailFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchGmailRealtimeToken } from "./actions";
import { GMAIL_CHANNEL_NAME } from "@/inngest/channels/gmail";

type GmailNodeData = { to?: string; subject?: string; credentialId?: string; variableName?: string; body?: string };
type GmailNodeType = Node<GmailNodeData>;

export const GmailNode = memo((props: NodeProps<GmailNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GMAIL_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGmailRealtimeToken,
  });

  const handleSubmit = (values: GmailFormValues) => {
    setNodes((nodes) => nodes.map((n) => n.id === props.id ? { ...n, data: { ...n.data, ...values } } : n));
  };

  const description = props.data?.to
    ? `To: ${props.data.to.slice(0, 40)}`
    : "Not configured";

  return (
    <>
      <GmailDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleSubmit} defaultValues={props.data} />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={Google.Color}
        name="Gmail"
        status={nodeStatus}
        description={description}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

GmailNode.displayName = "GmailNode";
