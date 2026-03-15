"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { Meta } from "@lobehub/icons";
import { BaseExecutionNode } from "../base-execution-node";
import { FacebookPageDialog, type FacebookPageFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchFacebookPageRealtimeToken } from "./actions";
import { FACEBOOK_PAGE_CHANNEL_NAME } from "@/inngest/channels/facebook-page";

type FacebookPageNodeData = { pageId?: string; message?: string; link?: string; credentialId?: string; variableName?: string };
type FacebookPageNodeType = Node<FacebookPageNodeData>;

export const FacebookPageNode = memo((props: NodeProps<FacebookPageNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: FACEBOOK_PAGE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchFacebookPageRealtimeToken,
  });

  const handleSubmit = (values: FacebookPageFormValues) => {
    setNodes((nodes) => nodes.map((n) => n.id === props.id ? { ...n, data: { ...n.data, ...values } } : n));
  };

  const description = props.data?.pageId
    ? `Page: ${props.data.pageId}`
    : "Not configured";

  return (
    <>
      <FacebookPageDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleSubmit} defaultValues={props.data} />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={Meta.Color}
        name="Facebook Page"
        status={nodeStatus}
        description={description}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

FacebookPageNode.displayName = "FacebookPageNode";
