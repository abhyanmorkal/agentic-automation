import type { NodeExecutor } from "@/features/executions/types";
import { facebookLeadTriggerChannel } from "@/inngest/channels/facebook-lead-trigger";

type FacebookLeadTriggerData = Record<string, unknown>;

export const facebookLeadTriggerExecutor: NodeExecutor<FacebookLeadTriggerData> = async ({
  nodeId,
  data,
  context,
  step,
  publish,
}) => {
  await publish(facebookLeadTriggerChannel().status({ nodeId, status: "loading" }));

  const result = await step.run("facebook-lead-trigger", async () => {
    // If running from an actual webhook, the webhook route provides `context.facebookLead`.
    // If executing manually (e.g. Test Workflow button), we fallback to the saved sample.
    let mergedContext = { ...context };

    if (!mergedContext.facebookLead && data.sampleResponseAdvanced) {
      const advanced = data.sampleResponseAdvanced as {
        leadId?: string;
        formId?: string;
        pageId?: string;
        adId?: string;
        createdTime?: string;
        field_data?: Array<{ name: string; values: string[] }>;
      };

      const fields: Record<string, string> = {};
      for (const field of advanced.field_data ?? []) {
        fields[field.name] = field.values?.[0] ?? "";
      }

      mergedContext = {
        ...mergedContext,
        facebookLead: {
          leadId: advanced.leadId,
          formId: advanced.formId,
          pageId: advanced.pageId,
          adId: advanced.adId,
          createdTime: advanced.createdTime,
          fields,
          raw: data.sampleResponseRaw ?? undefined,
        },
      };
    }

    return mergedContext;
  });

  await publish(facebookLeadTriggerChannel().status({ nodeId, status: "success" }));

  return result;
};
