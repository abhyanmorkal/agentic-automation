"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { Clock3Icon } from "lucide-react";
import { memo, useState } from "react";
import { DELAY_CHANNEL_NAME } from "@/inngest/channels/delay";
import { useNodeStatus } from "../../hooks/use-node-status";
import { BaseExecutionNode } from "../base-execution-node";
import { fetchDelayRealtimeToken } from "./actions";
import { DelayDialog, type DelayFormValues } from "./dialog";

type DelayNodeData = DelayFormValues;
type DelayNodeType = Node<DelayNodeData>;

export const DelayNode = memo((props: NodeProps<DelayNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: DELAY_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchDelayRealtimeToken,
  });

  const handleSubmit = (values: DelayFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? {
              ...node,
              data: {
                ...node.data,
                ...values,
              },
            }
          : node,
      ),
    );
  };

  const description =
    props.data?.amount && props.data?.unit
      ? `${props.data.amount} ${props.data.unit}`
      : "Delay not configured";

  return (
    <>
      <DelayDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={Clock3Icon}
        name="Delay"
        description={description}
        status={nodeStatus}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

DelayNode.displayName = "DelayNode";
