import type { NodeExecutor } from "@/features/executions/types";
import { scheduleTriggerChannel } from "@/inngest/channels/schedule-trigger";

type ScheduleTriggerData = {
  cronExpression?: string;
  timezone?: string;
  preset?: string;
  notes?: string;
};

export const scheduleTriggerExecutor: NodeExecutor<ScheduleTriggerData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    scheduleTriggerChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  const result = await step.run("schedule-trigger", async () => {
    return {
      ...context,
      schedule: {
        triggeredAt: new Date().toISOString(),
        cronExpression: data.cronExpression,
        timezone: data.timezone || "UTC",
      },
    };
  });

  await publish(
    scheduleTriggerChannel().status({
      nodeId,
      status: "success",
    }),
  );

  return result;
};
