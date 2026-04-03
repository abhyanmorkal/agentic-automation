"use client";

import {
  type Node,
  type NodeProps,
  Position,
  useReactFlow,
} from "@xyflow/react";
import { GitBranchIcon } from "lucide-react";
import { memo, useState } from "react";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { IF_CHANNEL_NAME } from "@/inngest/channels/if";
import { useNodeStatus } from "../../hooks/use-node-status";
import { BaseExecutionNode } from "../base-execution-node";
import { fetchIfRealtimeToken } from "./actions";
import { IfDialog, type IfFormValues } from "./dialog";

type IfNodeData = IfFormValues;
type IfNodeType = Node<IfNodeData>;

export const IfNode = memo((props: NodeProps<IfNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IF_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchIfRealtimeToken,
  });

  const handleSubmit = (values: IfFormValues) => {
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

  const description = props.data?.operator
    ? `${props.data.operator.replaceAll("_", " ")}`
    : "Branch not configured";

  return (
    <>
      <IfDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={GitBranchIcon}
        name="IF"
        description={description}
        status={nodeStatus}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
        showDefaultSourceHandle={false}
        customHandles={
          <>
            <BaseHandle
              id="true"
              type="source"
              position={Position.Right}
              style={{ top: "35%" }}
            />
            <span className="absolute right-4 top-[24%] text-[10px] font-medium text-emerald-600">
              True
            </span>
            <BaseHandle
              id="false"
              type="source"
              position={Position.Right}
              style={{ top: "65%" }}
            />
            <span className="absolute right-4 top-[56%] text-[10px] font-medium text-rose-600">
              False
            </span>
          </>
        }
      />
    </>
  );
});

IfNode.displayName = "IfNode";
