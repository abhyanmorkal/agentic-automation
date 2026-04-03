"use client";

import {
  type Node,
  type NodeProps,
  Position,
  useReactFlow,
} from "@xyflow/react";
import { RouteIcon } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { SWITCH_CHANNEL_NAME } from "@/inngest/channels/switch";
import { useNodeStatus } from "../../hooks/use-node-status";
import { BaseExecutionNode } from "../base-execution-node";
import { fetchSwitchRealtimeToken } from "./actions";
import { SwitchDialog, type SwitchFormValues } from "./dialog";

type SwitchNodeData = SwitchFormValues;
type SwitchNodeType = Node<SwitchNodeData>;

export const SwitchNode = memo((props: NodeProps<SwitchNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: SWITCH_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchSwitchRealtimeToken,
  });

  const handleSubmit = (values: SwitchFormValues) => {
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

  const configuredCases = useMemo(
    () =>
      (props.data?.cases ?? [])
        .map((item, index) => ({
          label: item.label?.trim() || `Case ${index + 1}`,
          output: `case-${index}`,
        }))
        .filter((item) => item.label.length > 0),
    [props.data?.cases],
  );

  const handles = [...configuredCases, { label: "Default", output: "default" }];
  const description = props.data?.sourceValue
    ? `${handles.length - 1} case${handles.length - 1 !== 1 ? "s" : ""} + default`
    : "Switch not configured";

  return (
    <>
      <SwitchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={RouteIcon}
        name="Switch"
        description={description}
        status={nodeStatus}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
        showDefaultSourceHandle={false}
        customHandles={handles.map((item, index) => {
          const top = `${20 + index * (55 / Math.max(handles.length - 1, 1))}%`;
          return (
            <div key={item.output}>
              <BaseHandle
                id={item.output}
                type="source"
                position={Position.Right}
                style={{ top }}
              />
              <span
                className="absolute right-4 text-[10px] font-medium text-muted-foreground"
                style={{ top: `calc(${top} - 12px)` }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      />
    </>
  );
});

SwitchNode.displayName = "SwitchNode";
