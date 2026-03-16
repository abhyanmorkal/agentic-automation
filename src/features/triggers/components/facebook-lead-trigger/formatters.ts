export type FacebookLeadField = {
  name: string;
  values: string[];
};

export type FacebookLeadSampleRaw = {
  id: string;
  created_time: string;
  field_data: FacebookLeadField[];
  form_id: string;
  page_id: string;
  ad_id?: string;
  [key: string]: unknown;
};

export type FacebookLeadSampleSimple = Record<string, string>;

export type FacebookLeadSampleAdvanced = {
  leadId: string;
  formId: string;
  pageId: string;
  adId?: string;
  createdTime: string;
  field_data: FacebookLeadField[];
};

export type FacebookLeadSampleViews = {
  raw: FacebookLeadSampleRaw;
  simple: FacebookLeadSampleSimple;
  advanced: FacebookLeadSampleAdvanced;
};

export function buildFacebookLeadSampleViews(raw: FacebookLeadSampleRaw): FacebookLeadSampleViews {
  const simple: FacebookLeadSampleSimple = {};

  for (const field of raw.field_data ?? []) {
    const key = field.name;
    const value = field.values?.[0] ?? "";
    if (key) {
      simple[key] = value;
    }
  }

  // Also expose some common aliases if present
  if (simple.full_name && !simple.name) {
    simple.name = simple.full_name;
  }
  if (simple.phone_number && !simple.phone) {
    simple.phone = simple.phone_number;
  }

  const advanced: FacebookLeadSampleAdvanced = {
    leadId: raw.id,
    formId: raw.form_id,
    pageId: raw.page_id,
    adId: typeof raw.ad_id === "string" ? raw.ad_id : undefined,
    createdTime: raw.created_time,
    field_data: raw.field_data ?? [],
  };

  return {
    raw,
    simple,
    advanced,
  };
}

