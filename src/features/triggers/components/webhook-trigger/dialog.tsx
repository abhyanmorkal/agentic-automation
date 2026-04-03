"use client";

import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  HistoryIcon,
  InfoIcon,
  KeyIcon,
  Loader2Icon,
  RefreshCwIcon,
  WebhookIcon,
  ZapIcon,
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
import { useTriggerToken } from "@/features/triggers/hooks/use-trigger-token";

type WebhookHistoryEntry = {
  receivedAt: string;
  body: unknown;
  headers?: Record<string, string>;
  method?: string;
  query?: Record<string, string>;
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
    const body =
      entry.body && typeof entry.body === "object"
        ? (entry.body as Record<string, unknown>)
        : {};
    setSampleSimple(body);
    setSampleAdvanced(body);
    setSampleRaw(entry);
    setResponseFormat("simple");
  };

  const handleSendTestPayload = async () => {
    setSendingTest(true);
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: testPayload,
      });
      toast.success(
        "Test payload sent. Click 'Load last received' to see the data.",
      );
    } catch {
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
      <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <WebhookIcon className="size-5 text-primary" />
            <DialogTitle>Webhook Trigger</DialogTitle>
          </div>
          <DialogDescription>
            Connect any app that can send an HTTP POST and use the payload in
            your next nodes.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 grid grid-cols-1 gap-6 md:grid-cols-2">
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
                  ? "Paste this URL into your app's webhook settings and send a POST request."
                  : "Generating a signed webhook URL..."}
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
                  <p className="font-medium text-foreground">
                    Required request header:
                  </p>
                  <code className="block font-mono break-all">
                    X-Webhook-Signature: sha256=&lt;hmac-sha256&gt;
                  </code>
                  <p>
                    Requests without a valid signature will be rejected with
                    401.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-md border bg-muted/40 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <InfoIcon className="size-3.5 text-muted-foreground" />
                <h4 className="text-xs font-semibold">Quick steps</h4>
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                <li>Add the URL above in your source app.</li>
                <li>Send a test POST from your source app.</li>
                <li>
                  Click <span className="font-medium">Load last received</span>{" "}
                  to see the data.
                </li>
              </ul>
            </div>

            <div className="rounded-md border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <ZapIcon className="size-3.5 text-primary" />
                <h4 className="text-xs font-semibold">Use in next nodes</h4>
              </div>
              {sampleSimple && Object.keys(sampleSimple).length > 0 ? (
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  {Object.entries(sampleSimple)
                    .slice(0, 8)
                    .map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <code className="bg-background border px-1.5 py-0.5 rounded font-mono text-[11px] shrink-0">
                          {`{{webhook.body.${key}}}`}
                        </code>
                        <span className="truncate leading-4 text-muted-foreground">
                          {String(value).slice(0, 40)}
                        </span>
                      </div>
                    ))}
                  {Object.keys(sampleSimple).length > 8 && (
                    <p className="text-[11px] text-muted-foreground pt-0.5">
                      +{Object.keys(sampleSimple).length - 8} more fields
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <p className="text-muted-foreground">
                    Load a webhook response above to see your actual fields
                    here.
                  </p>
                  <div className="flex items-start gap-2 opacity-50">
                    <code className="bg-background border px-1.5 py-0.5 rounded font-mono text-[11px]">
                      {"{{webhook.body.email}}"}
                    </code>
                    <span className="leading-4">example</span>
                  </div>
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
                    {sendingTest ? "Sending…" : "Send POST to webhook URL"}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Works with
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Razorpay",
                  "WooCommerce",
                  "Typeform",
                  "Shopify",
                  "GitHub",
                  "Jotform",
                  "Zapier",
                  "Make.com",
                  "Postman",
                ].map((svc) => (
                  <Badge
                    key={svc}
                    variant="secondary"
                    className="text-xs font-normal"
                  >
                    {svc}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-md border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Webhook response
                </span>
                {defaultValues?.lastSampleCapturedAt && (
                  <span className="text-[11px] text-muted-foreground">
                    Last received:{" "}
                    {new Date(
                      defaultValues.lastSampleCapturedAt,
                    ).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
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
                      className="w-full text-left px-1.5 py-0.5 rounded text-[11px] font-mono text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                      onClick={() => handleLoadHistoryEntry(entry)}
                    >
                      {i === 0 ? "Latest · " : `${i + 1} · `}
                      {new Date(entry.receivedAt).toLocaleString()}
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

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {selectedResponse
                  ? "Response loaded. Use it to map fields in the next node."
                  : 'No webhook received yet. Send a POST to the URL above, then click "Load last received".'}
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
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No fields found yet. Capture a response first to see
                      label/value pairs.
                    </p>
                  )}
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
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
              {savedResponses && Object.keys(savedResponses).length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    Saved responses can be used in next nodes as{" "}
                    <code className="bg-background border px-1 rounded font-mono text-[11px]">
                      {`{{webhook.savedResponses['${Object.keys(savedResponses)[0]}']}}`}
                    </code>
                    . Click a name to overwrite it.
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
