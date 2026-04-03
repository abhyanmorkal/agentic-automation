"use client";

import { type NodeProps, Position, useReactFlow } from "@xyflow/react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import type { ComponentType } from "react";
import { memo, type ReactNode } from "react";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import {
  type NodeStatus,
  NodeStatusIndicator,
} from "@/components/react-flow/node-status-indicator";
import { WorkflowNode } from "@/components/workflow-node";

type AnyIconComponent =
  | LucideIcon
  | ComponentType<{
      className?: string;
      size?: number;
      style?: React.CSSProperties;
    }>;

interface BaseExecutionNodeProps extends NodeProps {
  icon: AnyIconComponent | string;
  name: string;
  description?: string;
  children?: ReactNode;
  status?: NodeStatus;
  onSettings?: () => void;
  onDoubleClick?: () => void;
  customHandles?: ReactNode;
  showDefaultSourceHandle?: boolean;
  showDefaultTargetHandle?: boolean;
}

export const BaseExecutionNode = memo(
  ({
    id,
    icon: Icon,
    name,
    description,
    children,
    status = "initial",
    onSettings,
    onDoubleClick,
    customHandles,
    showDefaultSourceHandle = true,
    showDefaultTargetHandle = true,
  }: BaseExecutionNodeProps) => {
    const { setNodes, setEdges } = useReactFlow();
    const handleDelete = () => {
      setNodes((currentNodes) => {
        const updatedNodes = currentNodes.filter((node) => node.id !== id);
        return updatedNodes;
      });

      setEdges((currentEdges) => {
        const updatedEdges = currentEdges.filter(
          (edge) => edge.source !== id && edge.target !== id,
        );
        return updatedEdges;
      });
    };

    return (
      <WorkflowNode
        name={name}
        description={description}
        onDelete={handleDelete}
        onSettings={onSettings}
      >
        <NodeStatusIndicator status={status} variant="border">
          <BaseNode status={status} onDoubleClick={onDoubleClick}>
            <BaseNodeContent>
              {typeof Icon === "string" ? (
                <Image src={Icon} alt={name} width={16} height={16} />
              ) : (
                <Icon size={16} className="text-muted-foreground" />
              )}
              {children}
              {customHandles}
              {showDefaultTargetHandle ? (
                <BaseHandle
                  id="target-1"
                  type="target"
                  position={Position.Left}
                />
              ) : null}
              {showDefaultSourceHandle ? (
                <BaseHandle
                  id="source-1"
                  type="source"
                  position={Position.Right}
                />
              ) : null}
            </BaseNodeContent>
          </BaseNode>
        </NodeStatusIndicator>
      </WorkflowNode>
    );
  },
);

BaseExecutionNode.displayName = "BaseExecutionNode";
