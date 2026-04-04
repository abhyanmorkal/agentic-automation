"use client";

import { Google } from "@lobehub/icons";
import {
  type Node,
  type NodeProps,
  useEdges,
  useNodes,
  useReactFlow,
} from "@xyflow/react";
import { memo, useMemo, useState } from "react";
import { GMAIL_CHANNEL_NAME } from "@/inngest/channels/gmail";
import { useNodeStatus } from "../../hooks/use-node-status";
import { buildUpstreamReferences } from "../../lib/upstream-references";
import { BaseExecutionNode } from "../base-execution-node";
import { fetchGmailRealtimeToken } from "./actions";
import { GmailDialog, type GmailFormValues } from "./dialog";

type GmailNodeData = {
  to?: string;
  subject?: string;
  credentialId?: string;
  variableName?: string;
  body?: string;
};
type GmailNodeType = Node<GmailNodeData>;

export const GmailNode = memo((props: NodeProps<GmailNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GMAIL_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGmailRealtimeToken,
  });

  const handleSubmit = (values: GmailFormValues) => {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === props.id ? { ...n, data: { ...n.data, ...values } } : n,
      ),
    );
  };

  const upstreamReferences = useMemo(
    () => buildUpstreamReferences(props.id, edges, nodes),
    [props.id, edges, nodes],
  );

  const description = props.data?.to
    ? `To: ${props.data.to.slice(0, 40)}`
    : "Not configured";

  return (
    <>
      <GmailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
        upstreamReferences={upstreamReferences}
      />
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
