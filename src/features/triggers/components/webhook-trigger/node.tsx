import { Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { memo, useCallback, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { WebhookIcon } from "lucide-react";
import { WebhookTriggerDialog } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { WEBHOOK_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/webhook-trigger";
import { fetchWebhookTriggerRealtimeToken } from "./actions";

type WebhookTriggerData = {
  description?: string;
  sampleResponseRaw?: unknown;
  sampleResponseSimple?: Record<string, unknown>;
  sampleResponseAdvanced?: Record<string, unknown>;
  lastSampleCapturedAt?: string;
  savedResponses?: Record<string, { type: "simple" | "advanced" | "raw"; data: unknown; createdAt: string }>;
  webhookSecret?: string;
  webhookHistory?: Array<{ receivedAt: string; body: unknown; headers?: Record<string, string>; method?: string; query?: Record<string, string> }>;
};

type WebhookTriggerNodeType = Node<WebhookTriggerData>;

export const WebhookTriggerNode = memo((props: NodeProps<WebhookTriggerNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: WEBHOOK_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchWebhookTriggerRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSavedResponsesChange = useCallback(
    (savedResponses: Record<string, { type: "simple" | "advanced" | "raw"; data: unknown; createdAt: string }>) => {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === props.id ? { ...n, data: { ...n.data, savedResponses } } : n,
        ),
      );
    },
    [props.id, setNodes],
  );

  const handleDescriptionChange = useCallback(
    (description: string) => {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === props.id ? { ...n, data: { ...n.data, description } } : n,
        ),
      );
    },
    [props.id, setNodes],
  );

  const handleWebhookSecretChange = useCallback(
    (webhookSecret: string) => {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === props.id ? { ...n, data: { ...n.data, webhookSecret } } : n,
        ),
      );
    },
    [props.id, setNodes],
  );

  const nodeData = props.data;
  const description =
    nodeData?.description ??
    "When an HTTP POST is received";

  return (
    <>
      <WebhookTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nodeId={props.id}
        defaultValues={nodeData}
        onSavedResponsesChange={handleSavedResponsesChange}
        onDescriptionChange={handleDescriptionChange}
        onWebhookSecretChange={handleWebhookSecretChange}
      />
      <BaseTriggerNode
        {...props}
        icon={WebhookIcon}
        name="Webhook"
        description={description}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

WebhookTriggerNode.displayName = "WebhookTriggerNode";
