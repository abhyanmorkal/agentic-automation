"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { SendEmailDialog, type SendEmailFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchSendEmailRealtimeToken } from "./actions";
import { SEND_EMAIL_CHANNEL_NAME } from "@/inngest/channels/send-email";
import { MailIcon } from "lucide-react";

type SendEmailNodeData = { to?: string; subject?: string; credentialId?: string; variableName?: string; from?: string; body?: string };
type SendEmailNodeType = Node<SendEmailNodeData>;

export const SendEmailNode = memo((props: NodeProps<SendEmailNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: SEND_EMAIL_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchSendEmailRealtimeToken,
  });

  const handleSubmit = (values: SendEmailFormValues) => {
    setNodes((nodes) => nodes.map((n) => n.id === props.id ? { ...n, data: { ...n.data, ...values } } : n));
  };

  const description = props.data?.to
    ? `To: ${props.data.to.slice(0, 40)}`
    : "Not configured";

  return (
    <>
      <SendEmailDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleSubmit} defaultValues={props.data} />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={MailIcon}
        name="Send Email"
        status={nodeStatus}
        description={description}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

SendEmailNode.displayName = "SendEmailNode";
