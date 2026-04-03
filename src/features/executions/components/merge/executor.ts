import { getPublicContext } from "@/features/executions/lib/runtime-context";
import type { NodeExecutor } from "@/features/executions/types";
import { mergeChannel } from "@/inngest/channels/merge";

type MergeData = {
  variableName?: string;
  mode?: "combine";
};

export const mergeExecutor: NodeExecutor<MergeData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(mergeChannel().status({ nodeId, status: "loading" }));

  try {
    const output = await step.run("merge-context", async () => ({
      mode: data.mode || "combine",
      mergedAt: new Date().toISOString(),
      snapshot: getPublicContext(context),
    }));

    await publish(mergeChannel().status({ nodeId, status: "success" }));

    return {
      context: data.variableName
        ? {
            ...context,
            [data.variableName]: output,
          }
        : context,
      output,
    };
  } catch (error) {
    await publish(mergeChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
