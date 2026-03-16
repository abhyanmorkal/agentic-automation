"use client";

import { type NodeProps, type Node, useReactFlow } from "@xyflow/react";
import { memo, useState } from "react";
import { Meta } from "@lobehub/icons";
import { BaseTriggerNode } from "../base-trigger-node";
import {
  FacebookLeadTriggerDialog,
  type FacebookLeadTriggerFormValues,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchFacebookLeadTriggerRealtimeToken } from "./actions";
import { FACEBOOK_LEAD_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/facebook-lead-trigger";

type FacebookLeadTriggerData = {
  triggerEvent?: "new_lead_instant" | "new_lead_instant_legacy" | "new_lead";
  credentialId?: string;
  pageId?: string;
  pageName?: string;
  formId?: string;
  formName?: string;
  sampleResponseRaw?: unknown;
  sampleResponseSimple?: Record<string, unknown>;
  sampleResponseAdvanced?: Record<string, unknown>;
  lastSampleCapturedAt?: string;
};

type FacebookLeadTriggerNodeType = Node<FacebookLeadTriggerData>;

export const FacebookLeadTriggerNode = memo((props: NodeProps<FacebookLeadTriggerNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: FACEBOOK_LEAD_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchFacebookLeadTriggerRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: FacebookLeadTriggerFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? { ...node, data: { ...node.data, ...values } }
          : node,
      ),
    );
  };

  const nodeData = props.data;
  const description = nodeData?.pageName
    ? `${nodeData.pageName}${nodeData.formName ? ` · ${nodeData.formName}` : ""}`
    : "Not configured";

  return (
    <>
      <FacebookLeadTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
        nodeId={props.id}
      />
      <BaseTriggerNode
        {...props}
        icon={Meta.Color}
        name="Facebook Lead Ads"
        description={description}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

FacebookLeadTriggerNode.displayName = "FacebookLeadTriggerNode";
