import type { NodeExecutor } from "@/features/executions/types";
import { manualTriggerChannel } from "@/inngest/channels/manual-trigger";

type TestInput = { key: string; value: string };

type ManualTriggerData = {
  notes?: string;
  testInputs?: TestInput[];
};

export const manualTriggerExecutor: NodeExecutor<ManualTriggerData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    manualTriggerChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  const result = await step.run("manual-trigger", async () => {
    const injected: Record<string, string> = {};
    for (const input of data.testInputs ?? []) {
      if (input.key?.trim()) {
        injected[input.key.trim()] = input.value;
      }
    }
    return { ...context, ...injected };
  });

  await publish(
    manualTriggerChannel().status({
      nodeId,
      status: "success",
    }),
  );

  return result;
};
