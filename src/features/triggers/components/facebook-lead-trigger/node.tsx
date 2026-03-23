"use client";

import { type NodeProps, type Node, useReactFlow } from "@xyflow/react";
import { memo, useCallback, useState } from "react";
import { Meta } from "@lobehub/icons";
import { BaseTriggerNode } from "../base-trigger-node";
import {
  FacebookLeadTriggerDialog,
  type FacebookLeadTriggerFormValues,
  type FacebookLeadSampleData,
} from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchFacebookLeadTriggerRealtimeToken } from "./actions";
import { FACEBOOK_LEAD_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/facebook-lead-trigger";

// ─── Node data type ────────────────────────────────────────────────────────────

export type FacebookLeadTriggerData = {
  // Connection config
  credentialId?: string;
  pageId?: string;
  pageName?: string;
  formId?: string;
  formName?: string;

  // Sample / captured response (mirrors webhook-trigger shape)
  sampleResponseRaw?: unknown;
  sampleResponseSimple?: Record<string, string>;
  sampleResponseAdvanced?: Record<string, unknown>;
  lastSampleCapturedAt?: string;
  savedResponses?: Record<
    string,
    { type: "simple" | "advanced" | "raw"; data: unknown; createdAt: string }
  >;
};

type FacebookLeadTriggerNodeType = Node<FacebookLeadTriggerData>;

// ─── Component ────────────────────────────────────────────────────────────────

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

  // Persist connection config (credential, page, form) back into node data
  const handleSubmit = useCallback(
    (values: FacebookLeadTriggerFormValues) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === props.id
            ? { ...node, data: { ...node.data, ...values } }
            : node,
        ),
      );
    },
    [props.id, setNodes],
  );

  // Persist captured sample data back into node data (like webhook does for savedResponses)
  const handleSampleChange = useCallback(
    (sample: FacebookLeadSampleData) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === props.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  sampleResponseRaw: sample.raw,
                  sampleResponseSimple: sample.simple,
                  sampleResponseAdvanced: sample.advanced,
                  lastSampleCapturedAt: sample.lastSampleCapturedAt,
                  savedResponses: sample.savedResponses,
                },
              }
            : node,
        ),
      );
    },
    [props.id, setNodes],
  );

  const nodeData = props.data;

  // Friendly description shown on the canvas node card
  const description = nodeData?.pageName
    ? `${nodeData.pageName}${nodeData.formName ? ` · ${nodeData.formName}` : ""}`
    : "Not configured";

  return (
    <>
      <FacebookLeadTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nodeId={props.id}
        onSubmit={handleSubmit}
        onSampleChange={handleSampleChange}
        defaultValues={{
          // connection
          credentialId: nodeData?.credentialId,
          pageId: nodeData?.pageId,
          pageName: nodeData?.pageName,
          formId: nodeData?.formId,
          formName: nodeData?.formName,
          // sample
          raw: nodeData?.sampleResponseRaw,
          simple: nodeData?.sampleResponseSimple,
          advanced: nodeData?.sampleResponseAdvanced,
          lastSampleCapturedAt: nodeData?.lastSampleCapturedAt,
          savedResponses: nodeData?.savedResponses,
        }}
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
