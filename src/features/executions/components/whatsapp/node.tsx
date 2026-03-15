"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { Meta } from "@lobehub/icons";
import { BaseExecutionNode } from "../base-execution-node";
import { WhatsAppDialog, type WhatsAppFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchWhatsAppRealtimeToken } from "./actions";
import { WHATSAPP_CHANNEL_NAME } from "@/inngest/channels/whatsapp";

type WhatsAppNodeData = { to?: string; message?: string; phoneNumberId?: string; credentialId?: string; variableName?: string };
type WhatsAppNodeType = Node<WhatsAppNodeData>;

export const WhatsAppNode = memo((props: NodeProps<WhatsAppNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: WHATSAPP_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchWhatsAppRealtimeToken,
  });

  const handleSubmit = (values: WhatsAppFormValues) => {
    setNodes((nodes) => nodes.map((n) => n.id === props.id ? { ...n, data: { ...n.data, ...values } } : n));
  };

  const description = props.data?.to
    ? `To: ${props.data.to}`
    : "Not configured";

  return (
    <>
      <WhatsAppDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleSubmit} defaultValues={props.data} />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={Meta.Color}
        name="WhatsApp"
        status={nodeStatus}
        description={description}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

WhatsAppNode.displayName = "WhatsAppNode";
