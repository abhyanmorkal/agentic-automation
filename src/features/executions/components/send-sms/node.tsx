"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { SendSmsDialog, type SendSmsFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchSendSmsRealtimeToken } from "./actions";
import { SEND_SMS_CHANNEL_NAME } from "@/inngest/channels/send-sms";
import { SmartphoneIcon } from "lucide-react";

type SendSmsNodeData = { to?: string; message?: string; credentialId?: string; variableName?: string; from?: string };
type SendSmsNodeType = Node<SendSmsNodeData>;

export const SendSmsNode = memo((props: NodeProps<SendSmsNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: SEND_SMS_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchSendSmsRealtimeToken,
  });

  const handleSubmit = (values: SendSmsFormValues) => {
    setNodes((nodes) => nodes.map((n) => n.id === props.id ? { ...n, data: { ...n.data, ...values } } : n));
  };

  const description = props.data?.to
    ? `To: ${props.data.to}`
    : "Not configured";

  return (
    <>
      <SendSmsDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleSubmit} defaultValues={props.data} />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={SmartphoneIcon}
        name="Send SMS"
        status={nodeStatus}
        description={description}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

SendSmsNode.displayName = "SendSmsNode";
