"use client";

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
import { CopyIcon, CheckIcon, WebhookIcon, InfoIcon, ZapIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WebhookTriggerDialog = ({ open, onOpenChange }: Props) => {
  const params = useParams();
  const workflowId = params.workflowId as string;
  const [copied, setCopied] = useState(false);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const webhookUrl = `${baseUrl}/api/webhooks/generic?workflowId=${workflowId}`;

  const curlExample = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Rahul Sharma", "phone": "+919876543210", "source": "website"}'`;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <WebhookIcon className="size-5 text-primary" />
            <DialogTitle>Generic Webhook Trigger</DialogTitle>
          </div>
          <DialogDescription>
            Send an HTTP POST to this URL from any service to start the
            workflow. The request body is available as{" "}
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
              Paste this URL into any tool that supports webhooks — Typeform,
              Razorpay, WooCommerce, Postman, etc.
            </p>
          </div>

          {/* Available variables */}
          <div className="rounded-md border bg-muted/40 p-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <ZapIcon className="size-3.5 text-primary" />
              <h4 className="text-sm font-medium">Available Variables</h4>
            </div>
            <div className="space-y-1.5">
              {[
                ["webhook.body", "Full request body as object"],
                ["webhook.body.name", "A field called 'name' from the body"],
                ["webhook.receivedAt", "ISO timestamp when webhook was received"],
                ["webhook.headers.content-type", "Request content-type"],
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

          {/* Test with curl */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <InfoIcon className="size-3.5 text-muted-foreground" />
                <Label className="text-sm">Test with cURL</Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => copyToClipboard(curlExample, "cURL command")}
              >
                <CopyIcon className="size-3 mr-1" />
                Copy
              </Button>
            </div>
            <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
              {curlExample}
            </pre>
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
