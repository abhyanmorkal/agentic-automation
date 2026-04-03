"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { GitMergeIcon } from "lucide-react";
import { memo, useState } from "react";
import { MERGE_CHANNEL_NAME } from "@/inngest/channels/merge";
import { useNodeStatus } from "../../hooks/use-node-status";
import { BaseExecutionNode } from "../base-execution-node";
import { fetchMergeRealtimeToken } from "./actions";
import { MergeDialog, type MergeFormValues } from "./dialog";

type MergeNodeData = MergeFormValues;
type MergeNodeType = Node<MergeNodeData>;

export const MergeNode = memo((props: NodeProps<MergeNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: MERGE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchMergeRealtimeToken,
  });

  const handleSubmit = (values: MergeFormValues) => {
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

  return (
    <>
      <MergeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={GitMergeIcon}
        name="Merge"
        description="Join active paths"
        status={nodeStatus}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

MergeNode.displayName = "MergeNode";
