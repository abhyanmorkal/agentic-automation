import type { NodeExecutor } from "@/features/executions/types";
import { facebookLeadTriggerChannel } from "@/inngest/channels/facebook-lead-trigger";

type FacebookLeadTriggerData = Record<string, unknown>;

export const facebookLeadTriggerExecutor: NodeExecutor<FacebookLeadTriggerData> = async ({
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(facebookLeadTriggerChannel().status({ nodeId, status: "loading" }));

  const result = await step.run("facebook-lead-trigger", async () => context);

  await publish(facebookLeadTriggerChannel().status({ nodeId, status: "success" }));

  return result;
};
