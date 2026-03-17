"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  CopyIcon,
  CheckIcon,
  WebhookIcon,
  InfoIcon,
  ZapIcon,
  Loader2Icon,
  RefreshCwIcon,
} from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useFormStatus } from "react-dom";

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
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  defaultValues?: Partial<WebhookTriggerDialogData>;
  onSavedResponsesChange?: (savedResponses: Record<string, { type: "simple" | "advanced" | "raw"; data: unknown; createdAt: string }>) => void;
}

function encodeToken(workflowId: string, nodeId: string) {
  const payload = JSON.stringify({ workflowId, nodeId });
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window.btoa(encodeURIComponent(payload)) + "_pc";
  }
  // Fallback for server-side rendering; this is only used for initial render.
  return Buffer.from(payload, "utf8").toString("base64") + "_pc";
}

export const WebhookTriggerDialog = ({
  open,
  onOpenChange,
  nodeId,
  defaultValues,
  onSavedResponsesChange,
}: Props) => {
  const params = useParams();
  const workflowId = params.workflowId as string;
  const [copied, setCopied] = useState(false);
  const [loadingCapture, setLoadingCapture] = useState(false);
  const [responseFormat, setResponseFormat] = useState<"simple" | "advanced" | "raw">(
    "simple",
  );
  const [sampleSimple, setSampleSimple] = useState<Record<string, unknown> | null>(
    (defaultValues?.sampleResponseSimple as Record<string, unknown> | undefined) ?? null,
  );
  const [sampleAdvanced, setSampleAdvanced] = useState<Record<string, unknown> | null>(
    (defaultValues?.sampleResponseAdvanced as Record<string, unknown> | undefined) ?? null,
  );
  const [sampleRaw, setSampleRaw] = useState<unknown | null>(
    defaultValues?.sampleResponseRaw ?? null,
  );
  const [savedResponses, setSavedResponses] = useState<
    WebhookTriggerDialogData["savedResponses"] | undefined
  >(defaultValues?.savedResponses);
  const [savingName, setSavingName] = useState<"Response A" | "Response B" | "Response C">(
    "Response A",
  );
  const [saving, setSaving] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const token = useMemo(
    () => encodeToken(workflowId, nodeId),
    [workflowId, nodeId],
  );

  const webhookUrl = `${baseUrl}/workflow/sendwebhookdata/${token}`;

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

      const updated = json.savedResponses as WebhookTriggerDialogData["savedResponses"];
      setSavedResponses(updated);
      onSavedResponsesChange?.(updated as Record<string, { type: "simple" | "advanced" | "raw"; data: unknown; createdAt: string }>);
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
            Connect any app that can send an HTTP POST and use the payload in your next nodes.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
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
                >
                  {copied ? (
                    <CheckIcon className="size-4 text-green-500" />
                  ) : (
                    <CopyIcon className="size-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste this URL into your app&apos;s webhook settings and send a POST request.
              </p>
            </div>

            <div className="rounded-md border bg-muted/40 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <InfoIcon className="size-3.5 text-muted-foreground" />
                <h4 className="text-xs font-semibold">Quick steps</h4>
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                <li>Add the URL above in your source app.</li>
                <li>Click <span className="font-medium">Capture response</span> on the right.</li>
                <li>Send a test event; we&apos;ll show the data instantly.</li>
              </ul>
            </div>

            <div className="rounded-md border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <ZapIcon className="size-3.5 text-primary" />
                <h4 className="text-xs font-semibold">Use in next nodes</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Common examples:
              </p>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <div className="flex items-start gap-2">
                  <code className="bg-background border px-1.5 py-0.5 rounded font-mono text-[11px]">
                    {"{{webhook.body.email}}"}
                  </code>
                  <span className="leading-4">Customer email from the payload.</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-background border px-1.5 py-0.5 rounded font-mono text-[11px]">
                    {"{{webhook.body.name}}"}
                  </code>
                  <span className="leading-4">Customer name or contact name.</span>
                </div>
              </div>
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
                  <Badge key={svc} variant="secondary" className="text-xs font-normal">
                    {svc}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-md border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Capture webhook response
              </span>
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
                  Capture response
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loadingCapture || (!sampleSimple && !sampleAdvanced && !sampleRaw)}
                  onClick={() => handleCaptureSample({ recapture: true })}
                  className="gap-1.5 h-7 text-xs"
                >
                  Re-capture
                </Button>
              </div>
            </div>

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
                  ? "Sample captured below. Use it to map fields in the next node."
                  : 'No sample yet. Click "Capture response" and send a test webhook.'}
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
                      No fields found yet. Capture a response first to see label/value pairs.
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
                  placeholder='// No sample captured yet. Click "Capture response" and send a test webhook.'
                />
              )}

              {responseFormat === "raw" && (
                <Textarea
                  readOnly
                  className="h-52 font-mono text-xs resize-none whitespace-pre"
                  value={
                    sampleRaw
                      ? JSON.stringify(
                          (sampleRaw as any)?.body ?? sampleRaw,
                          null,
                          2,
                        )
                      : ""
                  }
                  placeholder='// No sample captured yet. Click "Capture response" and send a test webhook.'
                />
              )}
            </div>

            <div className="space-y-2 pt-2 border-t mt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Save current sample as</span>
                <div className="flex items-center gap-2">
                  <select
                    className="h-7 rounded-md border bg-background px-2 text-xs"
                    value={savingName}
                    onChange={(e) =>
                      setSavingName(e.target.value as "Response A" | "Response B" | "Response C")
                    }
                  >
                    <option value="Response A">Response A</option>
                    <option value="Response B">Response B</option>
                    <option value="Response C">Response C</option>
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={handleSaveNamedResponse}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
              {savedResponses && Object.keys(savedResponses).length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    Saved responses will appear in variables as{" "}
                    <code className="bg-background border px-1 rounded font-mono text-[11px]">
                      {"{{webhook.savedResponses['Response A']}}"}
                    </code>{" "}
                    and can be used by next nodes.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(savedResponses).map((name) => (
                      <Badge key={name} variant="secondary" className="text-[10px] font-normal">
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
