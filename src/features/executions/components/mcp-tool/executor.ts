import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { mcpToolChannel } from "@/inngest/channels/mcp-tool";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

type McpToolData = {
  variableName?: string;
  serverUrl?: string;
  toolName?: string;
  arguments?: string;
  authHeader?: string;
};

export const mcpToolExecutor: NodeExecutor<McpToolData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(mcpToolChannel().status({ nodeId, status: "loading" }));

  if (!data.variableName) {
    await publish(mcpToolChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("MCP Tool node: Variable name is missing");
  }
  if (!data.serverUrl) {
    await publish(mcpToolChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("MCP Tool node: Server URL is required");
  }
  if (!data.toolName) {
    await publish(mcpToolChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("MCP Tool node: Tool name is required");
  }

  let parsedArguments: Record<string, unknown> = {};
  if (data.arguments) {
    const resolvedArgs = decode(Handlebars.compile(data.arguments)(context));
    try {
      parsedArguments = JSON.parse(resolvedArgs);
    } catch {
      await publish(mcpToolChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("MCP Tool node: Arguments must be valid JSON");
    }
  }

  try {
    const result = await step.run("mcp-tool-call", async () => {
      const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
      const { SSEClientTransport } = await import("@modelcontextprotocol/sdk/client/sse.js");

      const client = new Client({ name: "litchoo-workflow", version: "1.0.0" });
      const requestHeaders: Record<string, string> = {};
      if (data.authHeader) {
        const [key, ...rest] = data.authHeader.split(":");
        requestHeaders[key.trim()] = rest.join(":").trim();
      }

      const transport = new SSEClientTransport(new URL(data.serverUrl!), {
        eventSourceInit: { headers: requestHeaders } as EventSourceInit,
        requestInit: { headers: requestHeaders },
      });
      await client.connect(transport);

      const toolResult = await client.callTool({
        name: data.toolName!,
        arguments: parsedArguments,
      });

      await client.close();

      const content =
        Array.isArray(toolResult.content) && toolResult.content.length > 0
          ? toolResult.content[0]
          : toolResult.content;

      return {
        ...context,
        [data.variableName!]: { result: content, toolName: data.toolName },
      };
    });

    await publish(mcpToolChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(mcpToolChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
