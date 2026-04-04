"use client";

import {
  type Node,
  type NodeProps,
  useEdges,
  useNodes,
  useReactFlow,
} from "@xyflow/react";
import { MailIcon } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { SEND_EMAIL_CHANNEL_NAME } from "@/inngest/channels/send-email";
import { useNodeStatus } from "../../hooks/use-node-status";
import { buildUpstreamReferences } from "../../lib/upstream-references";
import { BaseExecutionNode } from "../base-execution-node";
import { fetchSendEmailRealtimeToken } from "./actions";
import { SendEmailDialog, type SendEmailFormValues } from "./dialog";

type SendEmailNodeData = {
  to?: string;
  subject?: string;
  credentialId?: string;
  variableName?: string;
  from?: string;
  body?: string;
};
type SendEmailNodeType = Node<SendEmailNodeData>;

export const SendEmailNode = memo((props: NodeProps<SendEmailNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: SEND_EMAIL_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchSendEmailRealtimeToken,
  });

  const handleSubmit = (values: SendEmailFormValues) => {
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
      <SendEmailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
        upstreamReferences={upstreamReferences}
      />
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
