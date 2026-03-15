"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { McpToolDialog, type McpToolFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchMcpToolRealtimeToken } from "./actions";
import { MCP_TOOL_CHANNEL_NAME } from "@/inngest/channels/mcp-tool";
import { PlugIcon } from "lucide-react";

type McpToolNodeData = { serverUrl?: string; toolName?: string; arguments?: string; authHeader?: string; variableName?: string };
type McpToolNodeType = Node<McpToolNodeData>;

export const McpToolNode = memo((props: NodeProps<McpToolNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: MCP_TOOL_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchMcpToolRealtimeToken,
  });

  const handleSubmit = (values: McpToolFormValues) => {
    setNodes((nodes) => nodes.map((n) => n.id === props.id ? { ...n, data: { ...n.data, ...values } } : n));
  };

  const description = props.data?.toolName
    ? `Tool: ${props.data.toolName}`
    : "Not configured";

  return (
    <>
      <McpToolDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleSubmit} defaultValues={props.data} />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={PlugIcon}
        name="MCP Tool"
        status={nodeStatus}
        description={description}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

McpToolNode.displayName = "McpToolNode";
