import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { MousePointerIcon } from "lucide-react";
import { ManualTriggerDialog, type ManualTriggerFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { MANUAL_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/manual-trigger";
import { fetchManualTriggerRealtimeToken } from "./actions";

type ManualTriggerNodeData = {
  notes?: string;
  testInputs?: Array<{ key: string; value: string }>;
};

type ManualTriggerNodeType = Node<ManualTriggerNodeData>;

export const ManualTriggerNode = memo(
  (props: NodeProps<ManualTriggerNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: MANUAL_TRIGGER_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchManualTriggerRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const handleSubmit = (values: ManualTriggerFormValues) => {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === props.id) {
            return { ...node, data: { ...node.data, ...values } };
          }
          return node;
        }),
      );
    };

    const nodeData = props.data;
    const fieldCount = nodeData?.testInputs?.filter((r) => r.key.trim() !== "").length ?? 0;
    const description = nodeData?.notes
      ? nodeData.notes
      : fieldCount > 0
        ? `${fieldCount} test field${fieldCount !== 1 ? "s" : ""} configured`
        : "Click settings to add test data";

    return (
      <>
        <ManualTriggerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
        <BaseTriggerNode
          {...props}
          icon={MousePointerIcon}
          name="When clicking 'Execute workflow'"
          status={nodeStatus}
          description={description}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  },
);

ManualTriggerNode.displayName = "ManualTriggerNode";
