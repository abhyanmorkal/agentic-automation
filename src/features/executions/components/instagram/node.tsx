"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { Meta } from "@lobehub/icons";
import { BaseExecutionNode } from "../base-execution-node";
import { InstagramDialog, type InstagramFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchInstagramRealtimeToken } from "./actions";
import { INSTAGRAM_CHANNEL_NAME } from "@/inngest/channels/instagram";

type InstagramNodeData = { igUserId?: string; imageUrl?: string; caption?: string; credentialId?: string; variableName?: string };
type InstagramNodeType = Node<InstagramNodeData>;

export const InstagramNode = memo((props: NodeProps<InstagramNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: INSTAGRAM_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchInstagramRealtimeToken,
  });

  const handleSubmit = (values: InstagramFormValues) => {
    setNodes((nodes) => nodes.map((n) => n.id === props.id ? { ...n, data: { ...n.data, ...values } } : n));
  };

  const description = props.data?.caption
    ? props.data.caption.slice(0, 50)
    : "Not configured";

  return (
    <>
      <InstagramDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleSubmit} defaultValues={props.data} />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={Meta.Color}
        name="Instagram"
        status={nodeStatus}
        description={description}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

InstagramNode.displayName = "InstagramNode";
