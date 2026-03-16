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
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  defaultValues?: Partial<WebhookTriggerDialogData>;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <WebhookIcon className="size-5 text-primary" />
            <DialogTitle>Webhook Trigger</DialogTitle>
          </div>
          <DialogDescription>
            Generate a unique URL for this workflow. Send any HTTP POST to this URL to
            start the workflow. The request is available as{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">
              {"{{webhook.body.*}}"}
            </code>{" "}
            in downstream nodes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-1">
          {/* Webhook URL */}
          <div className="space-y-2">
            <Label>Your Webhook URL</Label>
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
              Copy this URL into the webhook section of any app. Each workflow gets its
              own unique URL – do not reuse between workflows.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Example: <code className="bg-muted px-1 rounded">{webhookUrl}</code>
            </p>
          </div>

          {/* Setup instructions */}
          <div className="rounded-md border bg-muted/40 p-4 space-y-2">
            <div className="flex items-center gap-1.5">
              <InfoIcon className="size-3.5 text-muted-foreground" />
              <h4 className="text-sm font-medium">How to use this URL</h4>
            </div>
            <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
              <li>Log in to the application where you want to configure the webhook.</li>
              <li>Copy the webhook URL above and paste it into the webhook URL field.</li>
              <li>
                Click <strong>Capture Webhook Response</strong> below.
              </li>
              <li>
                Send a test record from that application. The response will appear here and
                can be used to configure downstream nodes.
              </li>
            </ol>
            <p className="text-[11px] text-muted-foreground">
              Important: webhook URLs are unique per workflow. URLs from two workflows may
              look similar, but they are not interchangeable.
            </p>
          </div>

          {/* Available variables */}
          <div className="rounded-md border bg-muted/40 p-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <ZapIcon className="size-3.5 text-primary" />
              <h4 className="text-sm font-medium">Available Variables</h4>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {[
                ["webhook.body", "Full parsed request body as an object"],
                ["webhook.body.email", "Email field from the body, if present"],
                ["webhook.query", "Query string parameters"],
                ["webhook.headers['x-custom']", "Custom header value"],
                ["webhook.files", "Uploaded file metadata (name, size, type)"],
                ["webhook.receivedAt", "ISO timestamp when webhook was received"],
              ].map(([varName, desc]) => (
                <div key={varName} className="flex items-start gap-3">
                  <code className="shrink-0 bg-background border text-xs px-1.5 py-0.5 rounded font-mono">
                    {`{{${varName}}}`}
                  </code>
                  <span className="text-xs text-muted-foreground leading-5">
                    {desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Capture & response viewer */}
          <div className="space-y-3 rounded-md border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Capture Webhook Response
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
              <span className="text-muted-foreground">Response format:</span>
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

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Response received</p>
              <Textarea
                readOnly
                className="h-40 font-mono text-xs"
                value={
                  selectedResponse
                    ? JSON.stringify(selectedResponse, null, 2)
                    : '// No sample captured yet. Click "Capture response" and send a test webhook.'
                }
              />
            </div>
          </div>

          {/* Supported services */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Works with any service that sends webhooks
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
                "Any REST API",
              ].map((svc) => (
                <Badge key={svc} variant="secondary" className="text-xs font-normal">
                  {svc}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
