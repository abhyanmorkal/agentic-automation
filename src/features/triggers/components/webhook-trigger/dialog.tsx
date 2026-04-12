"use client";

import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  HistoryIcon,
  KeyIcon,
  Loader2Icon,
  RefreshCwIcon,
  WebhookIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildWebhookFieldPaths,
  buildWebhookSampleViews,
  type WebhookFieldPath,
  type WebhookSampleRaw,
} from "@/features/triggers/components/webhook-trigger/formatters";
import { useTriggerToken } from "@/features/triggers/hooks/use-trigger-token";

type WebhookHistoryEntry = {
  receivedAt: string;
  body: unknown;
  headers?: Record<string, string>;
  method?: string;
  query?: Record<string, string>;
  parseType?: "json" | "form" | "multipart" | "text";
  contentType?: string;
  sizeBytes?: number;
};

type WebhookTriggerDialogData = {
  description?: string;
  sampleResponseRaw?: unknown;
  sampleResponseSimple?: Record<string, unknown>;
  sampleResponseAdvanced?: Record<string, unknown>;
  lastSampleCapturedAt?: string;
  savedResponses?: Record<
    string,
    {
      type: "simple" | "advanced" | "raw";
      data: unknown;
      createdAt: string;
    }
  >;
  webhookSecret?: string;
  webhookHistory?: WebhookHistoryEntry[];
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  defaultValues?: Partial<WebhookTriggerDialogData>;
  onSavedResponsesChange?: (
    savedResponses: Record<
      string,
      { type: "simple" | "advanced" | "raw"; data: unknown; createdAt: string }
    >,
  ) => void;
  onDescriptionChange?: (description: string) => void;
  onWebhookSecretChange?: (webhookSecret: string) => void;
}

export const WebhookTriggerDialog = ({
  open,
  onOpenChange,
  nodeId,
  defaultValues,
  onSavedResponsesChange,
  onDescriptionChange,
  onWebhookSecretChange,
}: Props) => {
  const { workflowId, token, ready } = useTriggerToken(nodeId);
  const [copied, setCopied] = useState(false);
  const [loadingCapture, setLoadingCapture] = useState(false);
  const [description, setDescription] = useState(
    defaultValues?.description ?? "",
  );
  const [testPayload, setTestPayload] = useState(
    '{\n  "email": "test@example.com",\n  "name": "Test User"\n}',
  );
  const [sendingTest, setSendingTest] = useState(false);
  const [showTestPayload, setShowTestPayload] = useState(false);
  const [responseFormat, setResponseFormat] = useState<
    "simple" | "advanced" | "raw"
  >("simple");
  const [lastCapturedAt, setLastCapturedAt] = useState(
    defaultValues?.lastSampleCapturedAt ?? "",
  );
  const [sampleSimple, setSampleSimple] = useState<Record<
    string,
    unknown
  > | null>(
    (defaultValues?.sampleResponseSimple as
      | Record<string, unknown>
      | undefined) ?? null,
  );
  const [sampleAdvanced, setSampleAdvanced] = useState<Record<
    string,
    unknown
  > | null>(
    (defaultValues?.sampleResponseAdvanced as
      | Record<string, unknown>
      | undefined) ?? null,
  );
  const [sampleRaw, setSampleRaw] = useState<unknown | null>(
    defaultValues?.sampleResponseRaw ?? null,
  );
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [savedResponses, setSavedResponses] = useState<
    WebhookTriggerDialogData["savedResponses"] | undefined
  >(defaultValues?.savedResponses);
  const [savingName, setSavingName] = useState<string>("Response A");
  const [saving, setSaving] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState(
    defaultValues?.webhookSecret ?? "",
  );
  const [secretVisible, setSecretVisible] = useState(false);
  const webhookHistory = (defaultValues?.webhookHistory ??
    []) as WebhookHistoryEntry[];

  const baseUrl = useMemo(() => {
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (configuredUrl) {
      return configuredUrl;
    }

    if (typeof window !== "undefined") {
      return window.location.origin;
    }

    return "";
  }, []);

  const webhookUrl = token
    ? `${baseUrl}/workflow/sendwebhookdata/${token}`
    : "";

  const copyToClipboard = async (text: string, label = "Webhook URL") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const generateSecret = () => {
    const arr = new Uint8Array(32);
    window.crypto.getRandomValues(arr);
    const hex = Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    setWebhookSecret(hex);
    onWebhookSecretChange?.(hex);
  };

  const handleLoadHistoryEntry = (entry: WebhookHistoryEntry) => {
    const raw: WebhookSampleRaw = {
      body: entry.body,
      headers: entry.headers ?? {},
      method: entry.method ?? "POST",
      query: entry.query ?? {},
      receivedAt: entry.receivedAt,
    };
    const views = buildWebhookSampleViews(raw);
    setSampleSimple(views.simple);
    setSampleAdvanced(views.advanced as Record<string, unknown>);
    setSampleRaw(views.raw);
    setResponseFormat("simple");
    setLastCapturedAt(entry.receivedAt);
  };

  const handleSendTestPayload = async () => {
    setSendingTest(true);
    try {
      JSON.parse(testPayload);

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: testPayload,
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(
          typeof json?.error === "string"
            ? json.error
            : "Failed to send test payload.",
        );
        return;
      }

      toast.success(
        "Test payload sent. Click 'Load last received' to see the data.",
      );
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Test payload must be valid JSON.");
        return;
      }
      toast.error("Failed to send test payload.");
    } finally {
      setSendingTest(false);
    }
  };

  const handleCaptureSample = async (options?: { recapture?: boolean }) => {
    setLoadingCapture(true);
    try {
      const res = await fetch("/api/triggers/webhook/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId, nodeId }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(
          json?.error ||
            (options?.recapture
              ? "Failed to re-capture webhook response."
              : "Failed to capture webhook response."),
        );
        return;
      }

      setSampleSimple(json.simple ?? null);
      setSampleAdvanced(json.advanced ?? null);
      setSampleRaw(json.raw ?? null);
      setResponseFormat("simple");
      setLastCapturedAt(
        typeof json.lastSampleCapturedAt === "string"
          ? json.lastSampleCapturedAt
          : new Date().toISOString(),
      );

      toast.success(
        options?.recapture
          ? "Webhook response re-captured successfully."
          : "Webhook response captured successfully.",
      );
    } catch {
      toast.error(
        options?.recapture
          ? "Failed to re-capture webhook response."
          : "Failed to capture webhook response.",
      );
    } finally {
      setLoadingCapture(false);
    }
  };

  const selectedResponse = useMemo(() => {
    if (responseFormat === "simple") return sampleSimple;
    if (responseFormat === "advanced") return sampleAdvanced;
    return sampleRaw;
  }, [responseFormat, sampleSimple, sampleAdvanced, sampleRaw]);
  const rawResponsePreview = useMemo(() => {
    if (!sampleRaw || typeof sampleRaw !== "object") {
      return sampleRaw;
    }

    if ("body" in sampleRaw) {
      return (sampleRaw as Record<string, unknown>).body ?? sampleRaw;
    }

    return sampleRaw;
  }, [sampleRaw]);
  const sampleFieldPaths = useMemo<WebhookFieldPath[]>(() => {
    if (!sampleRaw || typeof sampleRaw !== "object") {
      return [];
    }

    return buildWebhookFieldPaths(sampleRaw as WebhookSampleRaw);
  }, [sampleRaw]);

  const sampleMeta = useMemo(() => {
    if (!sampleRaw || typeof sampleRaw !== "object") {
      return null;
    }

    const raw = sampleRaw as WebhookSampleRaw;
    return {
      method: raw.method ?? "POST",
      parseType: raw.parseType?.toUpperCase() ?? null,
      sizeLabel:
        typeof raw.sizeBytes === "number"
          ? raw.sizeBytes < 1024
            ? `${raw.sizeBytes} B`
            : `${(raw.sizeBytes / 1024).toFixed(1)} KB`
          : null,
      dedupeLabel: raw.dedupeSource
        ? `Dedupe: ${raw.dedupeSource}`
        : null,
    };
  }, [sampleRaw]);

  const copyVariablePath = async (path: string) => {
    const variable = `{{webhook.${path}}}`;
    try {
      await navigator.clipboard.writeText(variable);
      setCopiedPath(path);
      toast.success("Variable path copied");
      setTimeout(() => setCopiedPath((current) => (current === path ? null : current)), 1500);
    } catch {
      toast.error("Failed to copy variable path");
    }
  };

  const handleSaveNamedResponse = async () => {
    if (!selectedResponse) {
      toast.error("Capture a response first before saving.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/triggers/webhook/save-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId,
          nodeId,
          name: savingName,
          type: responseFormat,
          data: selectedResponse,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error || "Failed to save named response.");
        return;
      }

      const updated =
        json.savedResponses as WebhookTriggerDialogData["savedResponses"];
      setSavedResponses(updated);
      onSavedResponsesChange?.(
        updated as Record<
          string,
          {
            type: "simple" | "advanced" | "raw";
            data: unknown;
            createdAt: string;
          }
        >,
      );
      toast.success(`Saved as ${savingName}. You can use it in next nodes.`);
    } catch {
      toast.error("Failed to save named response.");
    } finally {
      setSaving(false);
    }
  };

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <WebhookIcon className="size-5 text-primary" />
            <DialogTitle>Webhook Trigger</DialogTitle>
          </div>
          <DialogDescription>
            Receive a POST request and use its payload in the next nodes.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-description">Label (optional)</Label>
              <Input
                id="webhook-description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  onDescriptionChange?.(e.target.value);
                }}
                placeholder="e.g. Shopify order webhook"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-xs h-9"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="shrink-0 h-9 w-9"
                  onClick={() => copyToClipboard(webhookUrl)}
                  disabled={!ready}
                >
                  {copied ? (
                    <CheckIcon className="size-4 text-green-500" />
                  ) : (
                    <CopyIcon className="size-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {ready
                  ? "Paste this into your source app."
                  : "Generating webhook URL..."}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Accepts JSON, form, multipart, and text payloads up to 1 MB.
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                Webhook Secret{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={secretVisible ? "text" : "password"}
                    value={webhookSecret}
                    onChange={(e) => {
                      setWebhookSecret(e.target.value);
                      onWebhookSecretChange?.(e.target.value);
                    }}
                    placeholder="Leave blank to skip verification"
                    className="font-mono text-xs h-9 pr-8"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setSecretVisible((v) => !v)}
                  >
                    {secretVisible ? (
                      <EyeOffIcon className="size-3.5" />
                    ) : (
                      <EyeIcon className="size-3.5" />
                    )}
                  </button>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 text-xs gap-1.5 shrink-0"
                  onClick={generateSecret}
                >
                  <KeyIcon className="size-3.5" />
                  Generate
                </Button>
              </div>
              {webhookSecret && (
                <div className="rounded-md border bg-muted/40 p-2 text-[11px] text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Required header</p>
                  <code className="block font-mono break-all">
                    X-Webhook-Signature: sha256=&lt;hmac-sha256&gt;
                  </code>
                  <p>Compute HMAC-SHA256 from the raw request body using this secret.</p>
                </div>
              )}
            </div>

            <div className="rounded-md border bg-muted/40">
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/60"
                onClick={() => setShowTestPayload((v) => !v)}
              >
                Send test payload
                {showTestPayload ? (
                  <ChevronDownIcon className="size-3.5" />
                ) : (
                  <ChevronRightIcon className="size-3.5" />
                )}
              </button>
              {showTestPayload && (
                <div className="px-3 pb-3 space-y-2">
                  <Textarea
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    className="font-mono text-xs min-h-[96px] resize-none"
                    placeholder='{"key": "value"}'
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full h-7 text-xs gap-1.5"
                    onClick={handleSendTestPayload}
                    disabled={sendingTest || !ready}
                  >
                    {sendingTest ? (
                      <Loader2Icon className="size-3 animate-spin" />
                    ) : null}
                    {sendingTest ? "Sending..." : "Send POST to webhook URL"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-md border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Webhook response
                </span>
                {lastCapturedAt && (
                  <span className="text-[11px] text-muted-foreground">
                    Last received:{" "}
                    {new Date(lastCapturedAt).toLocaleString()}
                  </span>
                )}
              </div>
                <div className="flex items-center gap-2">
                  {sampleMeta?.method && (
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {sampleMeta.method}
                    </Badge>
                  )}
                  {sampleMeta?.parseType && (
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {sampleMeta.parseType}
                    </Badge>
                  )}
                  {sampleMeta?.sizeLabel && (
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {sampleMeta.sizeLabel}
                    </Badge>
                  )}
                  {sampleMeta?.dedupeLabel && (
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {sampleMeta.dedupeLabel}
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                  size="sm"
                  disabled={loadingCapture}
                  onClick={() => handleCaptureSample()}
                  className="gap-1.5 h-7 text-xs"
                >
                  {loadingCapture ? (
                    <Loader2Icon className="size-3 animate-spin" />
                  ) : (
                    <RefreshCwIcon className="size-3" />
                  )}
                  Load last received
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={
                    loadingCapture ||
                    (!sampleSimple && !sampleAdvanced && !sampleRaw)
                  }
                  onClick={() => handleCaptureSample({ recapture: true })}
                  className="gap-1.5 h-7 text-xs"
                >
                  Refresh
                </Button>
              </div>
            </div>

            {webhookHistory.length > 0 && (
              <div className="rounded-md border bg-muted/40 p-2 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                  <HistoryIcon className="size-3" />
                  Event history ({webhookHistory.length})
                </div>
                <div className="space-y-0.5 max-h-28 overflow-y-auto">
                  {webhookHistory.map((entry, i) => (
                    <button
                      key={`${entry.receivedAt}-${entry.method ?? "unknown"}`}
                      type="button"
                      className="w-full text-left px-1.5 py-1 rounded text-[11px] text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                      onClick={() => handleLoadHistoryEntry(entry)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono">
                          {i === 0 ? "Latest" : `Event ${i + 1}`}
                        </span>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            {entry.method ?? "POST"}
                          </Badge>
                          {entry.parseType && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-normal"
                            >
                              {entry.parseType.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {new Date(entry.receivedAt).toLocaleString()}
                        {entry.sizeBytes ? ` • ${entry.sizeBytes} B` : ""}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">View as</span>
              <div className="inline-flex rounded-md border bg-background p-0.5">
                {(["simple", "advanced", "raw"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setResponseFormat(fmt)}
                    className={
                      "px-2 py-0.5 rounded text-xs capitalize " +
                      (responseFormat === fmt
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted")
                    }
                  >
                    {fmt === "raw"
                      ? "Raw"
                      : fmt.charAt(0).toUpperCase() + fmt.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              `Simple` shows easy fields. `Advanced` shows parsed request data. `Raw` shows the stored payload.
            </p>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {selectedResponse
                  ? "Use these fields in the next node."
                  : 'No webhook received yet. Send a POST, then click "Load last received".'}
              </p>

              {responseFormat === "simple" && (
                <div className="space-y-2">
                  {sampleSimple && Object.keys(sampleSimple).length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex gap-3 text-[11px] font-medium text-muted-foreground px-0.5">
                        <span className="flex-1">Label</span>
                        <span className="flex-[1.6]">Value</span>
                      </div>
                      <div className="space-y-1.5">
                        {Object.entries(sampleSimple).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex gap-3 items-center text-xs"
                          >
                            <Input
                              value={key}
                              readOnly
                              className="h-8 text-xs bg-muted/60 border-0 pointer-events-none flex-1"
                            />
                            <Input
                              value={String(value)}
                              readOnly
                              className="h-8 text-xs bg-muted/40 border-0 pointer-events-none flex-[1.6]"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="rounded-md border bg-background/70 p-2 text-[11px] text-muted-foreground">
                        Example: <code className="font-mono">{`{{webhook.body.${Object.keys(sampleSimple)[0]}}}`}</code>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No fields yet. Capture a response to preview them here.
                    </p>
                  )}
                </div>
              )}

              {sampleFieldPaths.length > 0 && (
                <div className="rounded-md border bg-background/70 p-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">
                      Field paths
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Copy a path for mapping
                    </span>
                  </div>
                  <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                    {sampleFieldPaths.slice(0, 24).map((field) => (
                      <div
                        key={field.path}
                        className="flex items-center gap-2 rounded border bg-muted/30 px-2 py-1.5"
                      >
                        <code className="min-w-0 flex-1 truncate font-mono text-[11px]">
                          {`{{webhook.${field.path}}}`}
                        </code>
                        <span className="max-w-32 truncate text-[11px] text-muted-foreground">
                          {field.valuePreview}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0"
                          onClick={() => copyVariablePath(field.path)}
                        >
                          {copiedPath === field.path ? (
                            <CheckIcon className="size-3.5 text-green-600" />
                          ) : (
                            <CopyIcon className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {responseFormat === "advanced" && (
                <Textarea
                  readOnly
                  className="h-52 font-mono text-xs resize-none whitespace-pre"
                  value={
                    sampleAdvanced
                      ? JSON.stringify(sampleAdvanced, null, 2)
                      : ""
                  }
                  placeholder='// No webhook received yet. Send a POST to the URL above, then click "Load last received".'
                />
              )}

              {responseFormat === "raw" && (
                <Textarea
                  readOnly
                  className="h-52 font-mono text-xs resize-none whitespace-pre"
                  value={
                    rawResponsePreview
                      ? JSON.stringify(rawResponsePreview, null, 2)
                      : ""
                  }
                  placeholder='// No webhook received yet. Send a POST to the URL above, then click "Load last received".'
                />
              )}
            </div>

            <div className="space-y-2 pt-2 border-t mt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Save current sample as
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    className="h-7 text-xs w-36"
                    value={savingName}
                    onChange={(e) => setSavingName(e.target.value)}
                    placeholder="e.g. Response A"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={handleSaveNamedResponse}
                    disabled={saving || !savingName.trim()}
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
              {savedResponses && Object.keys(savedResponses).length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    Reuse in next nodes as{" "}
                    <code className="bg-background border px-1 rounded font-mono text-[11px]">
                      {`{{webhook.savedResponses['${Object.keys(savedResponses)[0]}']}}`}
                    </code>
                    .
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(savedResponses).map((name) => (
                      <Badge
                        key={name}
                        variant="secondary"
                        className="text-[10px] font-normal cursor-pointer hover:bg-primary/10"
                        onClick={() => setSavingName(name)}
                      >
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
