import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { switchChannel } from "@/inngest/channels/switch";

type SwitchCase = {
  label?: string;
  value?: string;
};

type SwitchData = {
  variableName?: string;
  sourceValue?: string;
  cases?: SwitchCase[];
};

const compileValue = (
  template: string | undefined,
  context: Record<string, unknown>,
) => Handlebars.compile(template || "")(context).trim();

export const switchExecutor: NodeExecutor<SwitchData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(switchChannel().status({ nodeId, status: "loading" }));

  try {
    const result = await step.run("switch-routing", async () => {
      if (!data.sourceValue) {
        throw new NonRetriableError("Switch node: Source value is required");
      }

      const cases = (data.cases ?? [])
        .map((item, index) => ({
          label: item.label?.trim() || `Case ${index + 1}`,
          value: item.value?.trim() || "",
          output: `case-${index}`,
        }))
        .filter((item) => item.value.length > 0);

      if (cases.length === 0) {
        throw new NonRetriableError("Switch node: Add at least one case");
      }

      const sourceValue = compileValue(data.sourceValue, context);
      const matchedCase = cases.find(
        (item) => sourceValue === compileValue(item.value, context),
      );
      const selectedOutput = matchedCase?.output || "default";

      const output = {
        sourceValue,
        selectedOutput,
        matchedCaseLabel: matchedCase?.label || "Default",
        matchedCaseValue: matchedCase?.value || null,
      };

      return {
        context: data.variableName
          ? {
              ...context,
              [data.variableName]: output,
            }
          : context,
        output,
        nextOutputs: [selectedOutput],
      };
    });

    await publish(switchChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(switchChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
