"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { Notion } from "@lobehub/icons";
import { BaseExecutionNode } from "../base-execution-node";
import { NotionDialog, type NotionFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchNotionRealtimeToken } from "./actions";
import { NOTION_CHANNEL_NAME } from "@/inngest/channels/notion";

type NotionNodeData = { databaseId?: string; title?: string; credentialId?: string; variableName?: string; content?: string };
type NotionNodeType = Node<NotionNodeData>;

export const NotionNode = memo((props: NodeProps<NotionNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: NOTION_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchNotionRealtimeToken,
  });

  const handleSubmit = (values: NotionFormValues) => {
    setNodes((nodes) => nodes.map((n) => n.id === props.id ? { ...n, data: { ...n.data, ...values } } : n));
  };

  const description = props.data?.title
    ? `Title: ${props.data.title.slice(0, 40)}`
    : "Not configured";

  return (
    <>
      <NotionDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleSubmit} defaultValues={props.data} />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={Notion}
        name="Notion"
        status={nodeStatus}
        description={description}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

NotionNode.displayName = "NotionNode";
