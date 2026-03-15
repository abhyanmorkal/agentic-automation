"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { TelegramDialog, type TelegramFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchTelegramRealtimeToken } from "./actions";
import { TELEGRAM_CHANNEL_NAME } from "@/inngest/channels/telegram";

type TelegramNodeData = { chatId?: string; message?: string; credentialId?: string; variableName?: string };
type TelegramNodeType = Node<TelegramNodeData>;

export const TelegramNode = memo((props: NodeProps<TelegramNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: TELEGRAM_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchTelegramRealtimeToken,
  });

  const handleSubmit = (values: TelegramFormValues) => {
    setNodes((nodes) => nodes.map((n) => n.id === props.id ? { ...n, data: { ...n.data, ...values } } : n));
  };

  const description = props.data?.chatId
    ? `Chat: ${props.data.chatId}`
    : "Not configured";

  return (
    <>
      <TelegramDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleSubmit} defaultValues={props.data} />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/telegram.svg"
        name="Telegram"
        status={nodeStatus}
        description={description}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

TelegramNode.displayName = "TelegramNode";
