import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { delayChannel } from "@/inngest/channels/delay";

type DelayData = {
  variableName?: string;
  amount?: number | string;
  unit?: "seconds" | "minutes" | "hours";
};

const unitSuffix: Record<NonNullable<DelayData["unit"]>, string> = {
  seconds: "s",
  minutes: "m",
  hours: "h",
};

export const delayExecutor: NodeExecutor<DelayData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(delayChannel().status({ nodeId, status: "loading" }));

  try {
    const result = await step.run("validate-delay", async () => {
      const amount = Number(data.amount);
      if (!Number.isFinite(amount) || amount < 1) {
        throw new NonRetriableError(
          "Delay node: Amount must be greater than 0",
        );
      }

      if (!data.unit) {
        throw new NonRetriableError("Delay node: Unit is required");
      }

      return {
        amount,
        unit: data.unit,
      };
    });

    await step.sleep(
      `delay-${nodeId}`,
      `${result.amount}${unitSuffix[result.unit]}`,
    );

    const output = {
      amount: result.amount,
      unit: result.unit,
      resumedAt: new Date().toISOString(),
    };

    await publish(delayChannel().status({ nodeId, status: "success" }));

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
    await publish(delayChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
