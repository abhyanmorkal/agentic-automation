import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { ifChannel } from "@/inngest/channels/if";

type IfData = {
  variableName?: string;
  leftValue?: string;
  operator?:
    | "equals"
    | "not_equals"
    | "contains"
    | "greater_than"
    | "less_than"
    | "is_truthy"
    | "is_falsy";
  rightValue?: string;
};

const compileValue = (
  template: string | undefined,
  context: Record<string, unknown>,
) => Handlebars.compile(template || "")(context).trim();

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toTruthy = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (["", "0", "false", "null", "undefined", "no"].includes(normalized)) {
    return false;
  }

  return true;
};

const evaluateCondition = ({
  left,
  right,
  operator,
}: {
  left: string;
  right: string;
  operator: NonNullable<IfData["operator"]>;
}) => {
  switch (operator) {
    case "equals":
      return left === right;
    case "not_equals":
      return left !== right;
    case "contains":
      return left.includes(right);
    case "greater_than": {
      const leftNumber = toNumber(left);
      const rightNumber = toNumber(right);
      if (leftNumber === null || rightNumber === null) {
        return false;
      }
      return leftNumber > rightNumber;
    }
    case "less_than": {
      const leftNumber = toNumber(left);
      const rightNumber = toNumber(right);
      if (leftNumber === null || rightNumber === null) {
        return false;
      }
      return leftNumber < rightNumber;
    }
    case "is_truthy":
      return toTruthy(left);
    case "is_falsy":
      return !toTruthy(left);
  }
};

export const ifExecutor: NodeExecutor<IfData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(ifChannel().status({ nodeId, status: "loading" }));

  try {
    const result = await step.run("if-condition", async () => {
      if (!data.leftValue) {
        throw new NonRetriableError("IF node: Left value is required");
      }

      if (!data.operator) {
        throw new NonRetriableError("IF node: Operator is required");
      }

      if (
        !["is_truthy", "is_falsy"].includes(data.operator) &&
        !data.rightValue
      ) {
        throw new NonRetriableError("IF node: Right value is required");
      }

      const left = compileValue(data.leftValue, context);
      const right = compileValue(data.rightValue, context);
      const passed = evaluateCondition({
        left,
        right,
        operator: data.operator,
      });
      const branch = passed ? "true" : "false";
      const output = {
        result: passed,
        branch,
        operator: data.operator,
        leftValue: left,
        rightValue: right,
      };

      return {
        context: data.variableName
          ? {
              ...context,
              [data.variableName]: output,
            }
          : context,
        output,
        nextOutputs: [branch],
      };
    });

    await publish(ifChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(ifChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
