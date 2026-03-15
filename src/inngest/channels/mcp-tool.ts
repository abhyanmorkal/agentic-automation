import { channel, topic } from "@inngest/realtime";

export const MCP_TOOL_CHANNEL_NAME = "mcp-tool-execution";

export const mcpToolChannel = channel(MCP_TOOL_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );
