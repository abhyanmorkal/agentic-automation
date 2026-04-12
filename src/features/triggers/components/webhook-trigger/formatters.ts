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
  parseType?: "json" | "form" | "multipart" | "text";
  contentType?: string;
  sizeBytes?: number;
  dedupeKey?: string | null;
  dedupeSource?: string | null;
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

export type WebhookFieldPath = {
  path: string;
  valuePreview: string;
};

const previewValue = (value: unknown): string => {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.length} item${value.length === 1 ? "" : "s"}]`;
  }

  return "{...}";
};

const collectFieldPaths = (
  value: unknown,
  prefix: string,
  paths: WebhookFieldPath[],
  depth = 0,
) => {
  if (depth > 4 || value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    value.slice(0, 5).forEach((item, index) => {
      const nextPrefix = `${prefix}[${index}]`;
      paths.push({ path: nextPrefix, valuePreview: previewValue(item) });
      collectFieldPaths(item, nextPrefix, paths, depth + 1);
    });
    return;
  }

  if (typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      paths.push({ path: nextPrefix, valuePreview: previewValue(nestedValue) });
      collectFieldPaths(nestedValue, nextPrefix, paths, depth + 1);
    }
  }
};

export function buildWebhookFieldPaths(raw: WebhookSampleRaw): WebhookFieldPath[] {
  const paths: WebhookFieldPath[] = [];

  collectFieldPaths(raw.body, "body", paths);
  collectFieldPaths(raw.query ?? {}, "query", paths);

  if (raw.headers && typeof raw.headers === "object") {
    const importantHeaders = Object.entries(raw.headers)
      .filter(([key]) =>
        ["content-type", "x-webhook-signature", "user-agent"].includes(
          key.toLowerCase(),
        ),
      )
      .reduce<Record<string, string>>((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});

    collectFieldPaths(importantHeaders, "headers", paths);
  }

  return paths;
}

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
