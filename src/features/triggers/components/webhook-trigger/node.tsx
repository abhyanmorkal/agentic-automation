import { Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
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
};

type WebhookTriggerNodeType = Node<WebhookTriggerData>;

export const WebhookTriggerNode = memo((props: NodeProps<WebhookTriggerNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: WEBHOOK_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchWebhookTriggerRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

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
