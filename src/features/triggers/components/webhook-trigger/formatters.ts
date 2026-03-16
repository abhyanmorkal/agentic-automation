export type WebhookFileMeta = {
  fieldName: string;
  fileName: string;
  size?: number;
  contentType?: string;
};

export type WebhookSampleRaw = {
  body: unknown;
  headers: Record<string, string>;
  method: string;
  url?: string;
  path?: string;
  query?: Record<string, string>;
  files?: WebhookFileMeta[];
  receivedAt: string;
};

export type WebhookSampleSimple = Record<string, string>;

export type WebhookSampleAdvanced = {
  body: unknown;
  headers: Record<string, string>;
  method: string;
  url?: string;
  path?: string;
  query?: Record<string, string>;
  files?: WebhookFileMeta[];
  receivedAt: string;
};

export type WebhookSampleViews = {
  raw: WebhookSampleRaw;
  simple: WebhookSampleSimple;
  advanced: WebhookSampleAdvanced;
};

export function buildWebhookSampleViews(raw: WebhookSampleRaw): WebhookSampleViews {
  const simple: WebhookSampleSimple = {};

  if (raw && typeof raw.body === "object" && raw.body !== null) {
    const body = raw.body as Record<string, unknown>;
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        simple[key] = String(value);
      }
    }
  }

  const advanced: WebhookSampleAdvanced = {
    body: raw.body,
    headers: raw.headers,
    method: raw.method,
    url: raw.url,
    path: raw.path,
    query: raw.query,
    files: raw.files,
    receivedAt: raw.receivedAt,
  };

  return {
    raw,
    simple,
    advanced,
  };
}

