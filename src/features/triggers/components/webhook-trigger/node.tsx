import { NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { WebhookIcon } from "lucide-react";
import { WebhookTriggerDialog } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { WEBHOOK_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/webhook-trigger";
import { fetchWebhookTriggerRealtimeToken } from "./actions";

export const WebhookTriggerNode = memo((props: NodeProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: WEBHOOK_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchWebhookTriggerRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  return (
    <>
      <WebhookTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      <BaseTriggerNode
        {...props}
        icon={WebhookIcon}
        name="Webhook"
        description="When an HTTP POST is received"
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

WebhookTriggerNode.displayName = "WebhookTriggerNode";
