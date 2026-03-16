import type { WorkflowContext } from "../types";

// Reuse the same shape that VariablesHint expects.
export type VariableTree = Record<string, Record<string, string>>;

type WebhookContext = {
  webhook?: {
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
    headers?: Record<string, unknown>;
    receivedAt?: string;
  };
};

type FacebookLeadContext = {
  facebookLead?: {
    leadId?: string;
    formId?: string;
    pageId?: string;
    adId?: string;
    createdTime?: string;
    fields?: Record<string, string>;
  };
};

type KnownContext = WorkflowContext & WebhookContext & FacebookLeadContext;

export function buildVariableTreeFromContext(
  context: KnownContext,
  sourceVariable: string,
): VariableTree {
  const tree: VariableTree = {};

  if (sourceVariable === "webhook" && context.webhook) {
    const fields: Record<string, string> = {};

    const body = context.webhook.body ?? {};
    if (body && typeof body === "object") {
      for (const [key] of Object.entries(body as Record<string, unknown>)) {
        fields[`body.${key}`] = key;
      }
    }

    const query = context.webhook.query ?? {};
    if (query && typeof query === "object") {
      for (const [key] of Object.entries(query as Record<string, unknown>)) {
        fields[`query.${key}`] = `query ${key}`;
      }
    }

    if (context.webhook.receivedAt) {
      fields["receivedAt"] = "Received at";
    }

    if (Object.keys(fields).length > 0) {
      tree.webhook = fields;
    }
  }

  if (sourceVariable === "facebookLead" && context.facebookLead) {
    const leadFields: Record<string, string> = {};

    if (context.facebookLead.leadId) {
      leadFields.leadId = "Lead ID";
    }
    if (context.facebookLead.formId) {
      leadFields.formId = "Form ID";
    }
    if (context.facebookLead.pageId) {
      leadFields.pageId = "Page ID";
    }
    if (context.facebookLead.adId) {
      leadFields.adId = "Ad ID";
    }
    if (context.facebookLead.createdTime) {
      leadFields.createdTime = "Created time";
    }

    const fieldMap = context.facebookLead.fields ?? {};
    for (const [key] of Object.entries(fieldMap)) {
      leadFields[`fields.${key}`] = key;
    }

    if (Object.keys(leadFields).length > 0) {
      tree.facebookLead = leadFields;
    }
  }

  return tree;
}

