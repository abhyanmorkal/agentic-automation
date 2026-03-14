import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { ClockIcon } from "lucide-react";
import { ScheduleTriggerDialog, type ScheduleTriggerFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { SCHEDULE_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/schedule-trigger";
import { fetchScheduleTriggerRealtimeToken } from "./actions";

const PRESET_LABELS: Record<string, string> = {
  "* * * * *":    "Every minute",
  "*/5 * * * *":  "Every 5 minutes",
  "*/15 * * * *": "Every 15 minutes",
  "*/30 * * * *": "Every 30 minutes",
  "0 * * * *":    "Every hour",
  "0 */6 * * *":  "Every 6 hours",
  "0 9 * * *":    "Every day at 9 AM UTC",
  "0 12 * * *":   "Every day at 12 PM UTC",
  "0 18 * * *":   "Every day at 6 PM UTC",
  "0 9 * * 1-5":  "Every weekday at 9 AM UTC",
  "0 9 * * 1":    "Every Monday at 9 AM UTC",
  "0 8 * * 0":    "Every Sunday at 8 AM UTC",
  "0 9 1 * *":    "1st of month at 9 AM UTC",
};

type ScheduleTriggerNodeData = {
  cronExpression?: string;
  notes?: string;
};

type ScheduleTriggerNodeType = Node<ScheduleTriggerNodeData>;

export const ScheduleTriggerNode = memo(
  (props: NodeProps<ScheduleTriggerNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: SCHEDULE_TRIGGER_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchScheduleTriggerRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const handleSubmit = (values: ScheduleTriggerFormValues) => {
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
    const description = nodeData?.notes
      ? nodeData.notes
      : nodeData?.cronExpression
        ? (PRESET_LABELS[nodeData.cronExpression] ?? nodeData.cronExpression)
        : "Click settings to set a schedule";

    return (
      <>
        <ScheduleTriggerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
        <BaseTriggerNode
          {...props}
          icon={ClockIcon}
          name="Schedule"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  },
);

ScheduleTriggerNode.displayName = "ScheduleTriggerNode";
