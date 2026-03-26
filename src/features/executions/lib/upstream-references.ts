import type { Edge, Node } from "@xyflow/react";

export type UpstreamReference = {
  id: string;
  label: string;
  references: Array<{
    label: string;
    template: string;
  }>;
};

const NODE_TYPE_LABELS: Record<string, string> = {
  WEBHOOK_TRIGGER: "Webhook",
  FACEBOOK_LEAD_TRIGGER: "Facebook Lead",
  HTTP_REQUEST: "HTTP Request",
  GOOGLE_FORM_TRIGGER: "Google Form",
  STRIPE_TRIGGER: "Stripe",
  SCHEDULE_TRIGGER: "Schedule",
  MANUAL_TRIGGER: "Manual",
  OPENAI: "OpenAI",
  GEMINI: "Gemini",
  ANTHROPIC: "Anthropic",
  GMAIL: "Gmail",
  GOOGLE_SHEETS: "Google Sheets",
  GOOGLE_DRIVE: "Google Drive",
  NOTION: "Notion",
  AIRTABLE: "Airtable",
  SLACK: "Slack",
  DISCORD: "Discord",
  TELEGRAM: "Telegram",
  SEND_EMAIL: "Send Email",
  SEND_SMS: "Send SMS",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK_PAGE: "Facebook Page",
  MCP_TOOL: "MCP Tool",
};

const getNodeLabel = (node: Node) => {
  const nodeTypeLabel =
    NODE_TYPE_LABELS[node.type ?? ""] ?? node.type ?? "Node";
  const description =
    typeof node.data?.description === "string"
      ? node.data.description
      : typeof node.data?.variableName === "string"
        ? node.data.variableName
        : "";

  return description
    ? `${nodeTypeLabel} - ${description}`
    : `${nodeTypeLabel} (${node.id.slice(-6)})`;
};

export const buildUpstreamReferences = (
  nodeId: string,
  edges: Edge[],
  nodes: Node[],
): UpstreamReference[] => {
  const visited = new Set<string>();
  const references: UpstreamReference[] = [];

  const walk = (targetId: string, depth: number) => {
    if (depth > 5) {
      return;
    }

    const inboundEdges = edges.filter((edge) => edge.target === targetId);

    for (const edge of inboundEdges) {
      if (visited.has(edge.source)) {
        continue;
      }

      visited.add(edge.source);
      const sourceNode = nodes.find(
        (candidate) => candidate.id === edge.source,
      );
      if (!sourceNode) {
        continue;
      }

      const variableName =
        typeof sourceNode.data?.variableName === "string"
          ? sourceNode.data.variableName
          : undefined;

      const nodeReferences: UpstreamReference["references"] = [
        {
          label: "Node output",
          template: `{{$node.${sourceNode.id}.output}}`,
        },
        {
          label: "JSON node output",
          template: `{{json $node.${sourceNode.id}.output}}`,
        },
      ];

      if (variableName) {
        nodeReferences.unshift({
          label: `Legacy alias: ${variableName}`,
          template: `{{${variableName}}}`,
        });
        nodeReferences.push({
          label: `JSON alias: ${variableName}`,
          template: `{{json ${variableName}}}`,
        });
      }

      references.push({
        id: sourceNode.id,
        label: getNodeLabel(sourceNode),
        references: nodeReferences,
      });

      walk(sourceNode.id, depth + 1);
    }
  };

  walk(nodeId, 0);
  return references;
};
