"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  InfoIcon,
  Loader2Icon,
  RefreshCwIcon,
  ZapIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { useTriggerToken } from "@/features/triggers/hooks/use-trigger-token";
import { CredentialType } from "@/generated/prisma";
import { getRequiredConnectorForCredentialType } from "@/integrations/core/registry";
import { useTRPC } from "@/trpc/client";
import {
  type FacebookLeadForm,
  type FacebookPage,
  fetchCredentialExpiry,
  fetchFacebookLeadForms,
  fetchFacebookPages,
  setupFacebookLeadWebhook,
  testFacebookConnection,
} from "./actions";

// ─── Schema ──────────────────────────────────────────────────────────────────

const formSchema = z.object({
  credentialId: z.string().min(1, "Please connect a Facebook account"),
  pageId: z.string().min(1, "Please select a page"),
  pageName: z.string().optional(),
  formId: z.string().min(1, "Please select a lead gen form"),
  formName: z.string().optional(),
});

export type FacebookLeadTriggerFormValues = z.infer<typeof formSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────

export type FacebookLeadSampleData = {
  raw?: unknown;
  simple?: Record<string, string>;
  advanced?: Record<string, unknown>;
  lastSampleCapturedAt?: string;
  savedResponses?: Record<
    string,
    { type: "simple" | "advanced" | "raw"; data: unknown; createdAt: string }
  >;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  onSubmit: (values: FacebookLeadTriggerFormValues) => void;
  defaultValues?: Partial<FacebookLeadTriggerFormValues> &
    Partial<FacebookLeadSampleData>;
  onSampleChange?: (sample: FacebookLeadSampleData) => void;
}

function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <title>Facebook</title>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export const FacebookLeadTriggerDialog = ({
  open,
  onOpenChange,
  nodeId,
  onSubmit,
  defaultValues = {},
  onSampleChange,
}: Props) => {
  const metaConnector = getRequiredConnectorForCredentialType(
    CredentialType.META_ACCESS_TOKEN,
  );
  const { workflowId, token, ready } = useTriggerToken(nodeId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const webhookUrl = token
    ? `${baseUrl}/api/webhooks/facebook-leads?token=${token}`
    : "";

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: credentials, isLoading: credentialsLoading } =
    useCredentialsByType(CredentialType.META_ACCESS_TOKEN);

  // ── Connection state ────────────────────────────────────────────────────────
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [forms, setForms] = useState<FacebookLeadForm[]>([]);
  const [connectingFb, setConnectingFb] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [tokenExpiry, setTokenExpiry] = useState<{
    daysRemaining: number | null;
    warning: boolean;
  } | null>(null);
  const [loadingPages, startLoadingPages] = useTransition();
  const [loadingForms, startLoadingForms] = useTransition();
  const popupRef = useRef<Window | null>(null);

  // ── Sample capture state ────────────────────────────────────────────────────
  const [loadingCapture, setLoadingCapture] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [sampleSimple, setSampleSimple] = useState<Record<
    string,
    string
  > | null>(
    (defaultValues?.simple as Record<string, string> | undefined) ?? null,
  );
  const [sampleAdvanced, setSampleAdvanced] = useState<Record<
    string,
    unknown
  > | null>(
    (defaultValues?.advanced as Record<string, unknown> | undefined) ?? null,
  );
  const [sampleRaw, setSampleRaw] = useState<unknown | null>(
    defaultValues?.raw ?? null,
  );
  const [lastCapturedAt, setLastCapturedAt] = useState<string | null>(
    defaultValues?.lastSampleCapturedAt ?? null,
  );
  const [responseFormat, setResponseFormat] = useState<
    "simple" | "advanced" | "raw"
  >("simple");
  const [savedResponses, setSavedResponses] = useState<
    FacebookLeadSampleData["savedResponses"]
  >(defaultValues?.savedResponses);
  const [savingName, setSavingName] = useState("Lead Sample A");
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // ── Form ────────────────────────────────────────────────────────────────────
  const form = useForm<FacebookLeadTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      credentialId: defaultValues.credentialId ?? "",
      pageId: defaultValues.pageId ?? "",
      pageName: defaultValues.pageName ?? "",
      formId: defaultValues.formId ?? "",
      formName: defaultValues.formName ?? "",
    },
  });
  const { getValues, reset, setValue, watch } = form;

  const watchedCredentialId = watch("credentialId");
  const watchedPageId = watch("pageId");
  const watchedFormId = watch("formId");

  const isSaveEnabled = !!(
    watchedCredentialId &&
    watchedPageId &&
    watchedFormId
  );
  const resetValues = useMemo(
    () => ({
      credentialId: defaultValues.credentialId ?? "",
      pageId: defaultValues.pageId ?? "",
      pageName: defaultValues.pageName ?? "",
      formId: defaultValues.formId ?? "",
      formName: defaultValues.formName ?? "",
    }),
    [
      defaultValues.credentialId,
      defaultValues.formId,
      defaultValues.formName,
      defaultValues.pageId,
      defaultValues.pageName,
    ],
  );
  const sampleDefaults = useMemo(
    () => ({
      simple:
        (defaultValues.simple as Record<string, string> | undefined) ?? null,
      advanced:
        (defaultValues.advanced as Record<string, unknown> | undefined) ?? null,
      raw: defaultValues.raw ?? null,
      lastCapturedAt: defaultValues.lastSampleCapturedAt ?? null,
      savedResponses: defaultValues.savedResponses,
    }),
    [
      defaultValues.advanced,
      defaultValues.lastSampleCapturedAt,
      defaultValues.raw,
      defaultValues.savedResponses,
      defaultValues.simple,
    ],
  );
  const credentialsQueryOptions = useMemo(
    () =>
      trpc.credentials.getByType.queryOptions({
        type: CredentialType.META_ACCESS_TOKEN,
      }),
    [trpc],
  );

  // ── Reset on open ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      reset(resetValues);
      // Re-hydrate sample from defaultValues (in case node data updated)
      setSampleSimple(sampleDefaults.simple);
      setSampleAdvanced(sampleDefaults.advanced);
      setSampleRaw(sampleDefaults.raw);
      setLastCapturedAt(sampleDefaults.lastCapturedAt);
      setSavedResponses(sampleDefaults.savedResponses);
    }
  }, [open, reset, resetValues, sampleDefaults]);

  // ── Facebook OAuth popup ────────────────────────────────────────────────────
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "facebook_auth_success") {
        setConnectingFb(false);
        popupRef.current?.close();
        queryClient.invalidateQueries(credentialsQueryOptions);
        if (event.data.credentialId) {
          setValue("credentialId", event.data.credentialId);
          setValue("pageId", "");
          setValue("pageName", "");
          setValue("formId", "");
          setValue("formName", "");
          setPages([]);
          setForms([]);
        }
        toast.success(
          `Connected: ${event.data.credentialName ?? "Facebook account"}`,
        );
      } else if (event.data?.type === "facebook_auth_error") {
        setConnectingFb(false);
        toast.error(event.data.error || "Facebook connection failed");
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [credentialsQueryOptions, queryClient, setValue]);

  const handleConnectFacebook = () => {
    const width = 600,
      height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      metaConnector.auth.oauthStartPath,
      "facebook-auth",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`,
    );
    if (!popup) {
      toast.error("Popup blocked. Please allow popups for this site.");
      return;
    }
    popupRef.current = popup;
    setConnectingFb(true);
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        setConnectingFb(false);
      }
    }, 500);
  };

  // ── Auto-load pages when credential changes ─────────────────────────────────
  useEffect(() => {
    if (!watchedCredentialId) {
      setTokenExpiry(null);
      return;
    }
    fetchCredentialExpiry(watchedCredentialId)
      .then((r) =>
        setTokenExpiry({ daysRemaining: r.daysRemaining, warning: r.warning }),
      )
      .catch(() => setTokenExpiry(null));
  }, [watchedCredentialId]);

  useEffect(() => {
    if (!watchedCredentialId) {
      setPages([]);
      setForms([]);
      return;
    }
    startLoadingPages(async () => {
      try {
        const result = await fetchFacebookPages(watchedCredentialId);
        setPages(result);
        const cur = getValues("pageId");
        if (cur && !result.find((p) => p.id === cur)) {
          setValue("pageId", "");
          setValue("pageName", "");
          setForms([]);
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load pages.",
        );
        setPages([]);
      }
    });
  }, [getValues, setValue, watchedCredentialId]);

  useEffect(() => {
    if (!watchedCredentialId || !watchedPageId) {
      setForms([]);
      return;
    }
    startLoadingForms(async () => {
      try {
        const result = await fetchFacebookLeadForms(
          watchedCredentialId,
          watchedPageId,
        );
        setForms(result);
        const cur = getValues("formId");
        if (cur && !result.find((f) => f.id === cur)) {
          setValue("formId", "");
          setValue("formName", "");
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load lead forms.",
        );
        setForms([]);
      }
    });
  }, [getValues, setValue, watchedCredentialId, watchedPageId]);

  // ── Test connection ─────────────────────────────────────────────────────────
  const handleTestConnection = async () => {
    if (!watchedCredentialId) return;
    setTestingConnection(true);
    try {
      const result = await testFacebookConnection(watchedCredentialId);
      result.valid
        ? toast.success(`Connected as ${result.name ?? "Facebook user"}`)
        : toast.error(result.error ?? "Connection failed");
    } finally {
      setTestingConnection(false);
    }
  };

  // ── Copy webhook URL ────────────────────────────────────────────────────────
  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success("Webhook URL copied!");
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  // ── Load / capture sample lead ──────────────────────────────────────────────
  const handleCaptureSample = async () => {
    if (!watchedCredentialId || !watchedPageId || !watchedFormId) {
      toast.error("Save your configuration first, then load a sample.");
      return;
    }
    setLoadingCapture(true);
    try {
      const res = await fetch("/api/triggers/facebook-lead/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId,
          nodeId,
          credentialId: watchedCredentialId,
          pageId: watchedPageId,
          formId: watchedFormId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error ?? "Failed to capture sample lead.");
        return;
      }
      const simple = (json.simple ?? null) as Record<string, string> | null;
      const advanced = (json.advanced ?? null) as Record<
        string,
        unknown
      > | null;
      const raw = json.raw ?? null;
      const capturedAt = json.lastSampleCapturedAt ?? new Date().toISOString();
      setSampleSimple(simple);
      setSampleAdvanced(advanced);
      setSampleRaw(raw);
      setLastCapturedAt(capturedAt);
      setResponseFormat("simple");
      onSampleChange?.({
        raw,
        simple: simple ?? undefined,
        advanced: advanced ?? undefined,
        lastSampleCapturedAt: capturedAt,
        savedResponses,
      });
      toast.success("Sample lead loaded! Use the fields in your next nodes.");
    } catch {
      toast.error("Failed to capture sample lead.");
    } finally {
      setLoadingCapture(false);
    }
  };

  // ── Send test lead through workflow ────────────────────────────────────────
  const handleSendTestLead = async () => {
    if (!sampleSimple) {
      toast.error("Load a sample lead first before sending a test.");
      return;
    }
    setSendingTest(true);
    try {
      const testPayload = {
        object: "page",
        entry: [
          {
            id: "test-page",
            time: Math.floor(Date.now() / 1000),
            changes: [
              {
                field: "leadgen",
                value: {
                  leadgen_id:
                    (sampleRaw as Record<string, string> | null)?.id ??
                    "test-lead-id",
                  page_id: watchedPageId,
                  form_id: watchedFormId,
                },
              },
            ],
          },
        ],
      };
      await fetch(`/api/webhooks/facebook-leads?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
      });
      toast.success(
        "Test lead sent through workflow. Check the execution log.",
      );
    } catch {
      toast.error("Failed to send test lead.");
    } finally {
      setSendingTest(false);
    }
  };

  // ── Save named response ─────────────────────────────────────────────────────
  const selectedResponse = useMemo(() => {
    if (responseFormat === "simple") return sampleSimple;
    if (responseFormat === "advanced") return sampleAdvanced;
    return sampleRaw;
  }, [responseFormat, sampleSimple, sampleAdvanced, sampleRaw]);

  const handleSaveNamedResponse = useCallback(async () => {
    if (!selectedResponse) {
      toast.error("Load a sample first.");
      return;
    }
    if (!savingName.trim()) {
      toast.error("Enter a name for this sample.");
      return;
    }
    setSaving(true);
    try {
      const updated = {
        ...(savedResponses ?? {}),
        [savingName.trim()]: {
          type: responseFormat,
          data: selectedResponse,
          createdAt: new Date().toISOString(),
        },
      };
      setSavedResponses(updated);
      onSampleChange?.({
        raw: sampleRaw ?? undefined,
        simple: sampleSimple ?? undefined,
        advanced: sampleAdvanced ?? undefined,
        lastSampleCapturedAt: lastCapturedAt ?? undefined,
        savedResponses: updated,
      });
      toast.success(`Saved as "${savingName.trim()}". Use it in next nodes.`);
    } finally {
      setSaving(false);
    }
  }, [
    selectedResponse,
    savingName,
    savedResponses,
    responseFormat,
    sampleRaw,
    sampleSimple,
    sampleAdvanced,
    lastCapturedAt,
    onSampleChange,
  ]);

  // ── Form submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (values: FacebookLeadTriggerFormValues) => {
    setLoadingCapture(true);
    try {
      // Automatically subscribe the App to the Page's leadgen events.
      // Without this, Facebook won't send the webhook for this specific page.
      await setupFacebookLeadWebhook(values.credentialId, values.pageId);
      onSubmit(values);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to subscribe to Facebook Page. Check your permissions.",
      );
    } finally {
      setLoadingCapture(false);
    }
  };

  const hasSample = !!(sampleSimple ?? sampleAdvanced ?? sampleRaw);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FacebookGlyph className="size-5 fill-[#1877f2]" />
            <DialogTitle>Facebook Lead Ads</DialogTitle>
          </div>
          <DialogDescription>
            Triggers instantly when someone submits your Facebook lead gen form.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="mt-3 grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* ── LEFT COLUMN: Config ───────────────────────────────────── */}
              <div className="space-y-4">
                {/* 1. Connect account */}
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="credentialId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{metaConnector.credentialLabel}</FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);
                            form.setValue("pageId", "");
                            form.setValue("pageName", "");
                            form.setValue("formId", "");
                            form.setValue("formName", "");
                            setPages([]);
                            setForms([]);
                          }}
                          value={field.value}
                          disabled={credentialsLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  credentialsLoading
                                    ? "Loading..."
                                    : credentials?.length === 0
                                      ? "No accounts — connect below"
                                      : "Select account"
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {credentials?.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Token expiry + test connection */}
                  {watchedCredentialId && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1.5 text-muted-foreground"
                        onClick={handleTestConnection}
                        disabled={testingConnection}
                      >
                        {testingConnection && (
                          <Loader2Icon className="size-3 animate-spin" />
                        )}
                        {testingConnection ? "Testing…" : "Test connection"}
                      </Button>
                      {tokenExpiry?.daysRemaining !== null &&
                        tokenExpiry?.daysRemaining !== undefined && (
                          <Badge
                            variant="secondary"
                            className={
                              tokenExpiry.daysRemaining === 0
                                ? "text-[10px] bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-red-200 dark:border-red-800 gap-1"
                                : tokenExpiry.warning
                                  ? "text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800 gap-1"
                                  : "text-[10px] gap-1"
                            }
                          >
                            {tokenExpiry.warning && (
                              <AlertTriangleIcon className="size-3" />
                            )}
                            {tokenExpiry.daysRemaining === 0
                              ? "Token expired — reconnect"
                              : `Token expires in ${tokenExpiry.daysRemaining}d`}
                          </Badge>
                        )}
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 border-[#1877f2] text-[#1877f2] hover:bg-[#1877f2]/5"
                    onClick={handleConnectFacebook}
                    disabled={connectingFb}
                  >
                    {connectingFb ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <FacebookGlyph className="size-4 fill-[#1877f2]" />
                    )}
                    {connectingFb
                      ? "Connecting…"
                      : watchedCredentialId
                        ? "Reconnect Facebook account"
                        : "Connect with Facebook"}
                  </Button>
                  {!watchedCredentialId && (
                    <p className="text-[11px] text-muted-foreground">
                      After connecting, your pages will load automatically.
                    </p>
                  )}
                </div>

                {/* 2. Page select */}
                <FormField
                  control={form.control}
                  name="pageId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Page</FormLabel>
                        {loadingPages && (
                          <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      <Select
                        onValueChange={(val) => {
                          const page = pages.find((p) => p.id === val);
                          field.onChange(val);
                          form.setValue("pageName", page?.name ?? "");
                          form.setValue("formId", "");
                          form.setValue("formName", "");
                          setForms([]);
                        }}
                        value={field.value}
                        disabled={!watchedCredentialId || loadingPages}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !watchedCredentialId
                                  ? "Connect account first"
                                  : loadingPages
                                    ? "Loading pages…"
                                    : pages.length === 0
                                      ? "No pages found"
                                      : "Choose page"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pages.map((page) => (
                            <SelectItem key={page.id} value={page.id}>
                              {page.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 3. Lead form select */}
                <FormField
                  control={form.control}
                  name="formId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Lead form</FormLabel>
                        {loadingForms && (
                          <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      <Select
                        onValueChange={(val) => {
                          const f = forms.find((f) => f.id === val);
                          field.onChange(val);
                          form.setValue("formName", f?.name ?? "");
                        }}
                        value={field.value}
                        disabled={!watchedPageId || loadingForms}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !watchedPageId
                                  ? "Select page first"
                                  : loadingForms
                                    ? "Loading forms…"
                                    : forms.length === 0
                                      ? "No forms found"
                                      : "Choose form"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {forms.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              <span className="truncate">{f.name}</span>
                              {f.status && (
                                <Badge
                                  variant={
                                    f.status === "ACTIVE"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="ml-1.5 text-[10px] h-4"
                                >
                                  {f.status}
                                </Badge>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Quick setup guide */}
                <div className="rounded-md border bg-muted/40 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <InfoIcon className="size-3.5 text-muted-foreground" />
                    <h4 className="text-xs font-semibold">Quick setup</h4>
                  </div>
                  <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                    <li>Connect your Facebook account above.</li>
                    <li>Select the page and lead form to monitor.</li>
                    <li>
                      Click <span className="font-medium">Save</span> to
                      activate the trigger.
                    </li>
                    <li>
                      Click <span className="font-medium">Load sample</span> to
                      preview lead fields.
                    </li>
                  </ol>
                </div>

                {/* Collapsible: Webhook URL */}
                <div className="rounded-md border bg-muted/40">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/60"
                    onClick={() => setAdvancedOpen((v) => !v)}
                  >
                    Webhook URL (advanced)
                    {advancedOpen ? (
                      <ChevronDownIcon className="size-3.5" />
                    ) : (
                      <ChevronRightIcon className="size-3.5" />
                    )}
                  </button>
                  {advancedOpen && (
                    <div className="px-3 pb-3 space-y-3">
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          Webhook URL
                        </p>
                        <div className="flex gap-2">
                          <Input
                            value={webhookUrl}
                            readOnly
                            className="font-mono text-[10px] h-8"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 shrink-0"
                            onClick={copyWebhookUrl}
                            disabled={!ready}
                          >
                            <CopyIcon className="size-3.5" />
                          </Button>
                        </div>
                        {!ready && (
                          <p className="text-[10px] text-muted-foreground">
                            Generating a signed webhook URL...
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          Verify Token
                        </p>
                        <div className="flex gap-2">
                          <Input
                            value={
                              process.env
                                .NEXT_PUBLIC_FACEBOOK_WEBHOOK_VERIFY_TOKEN ||
                              "fb-lead-verify-token"
                            }
                            readOnly
                            className="font-mono text-[10px] h-8"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-3">
                          Found in your{" "}
                          <code className="bg-muted px-1 rounded">.env</code> as{" "}
                          <code className="bg-muted px-1 rounded">
                            FACEBOOK_WEBHOOK_VERIFY_TOKEN
                          </code>
                          .
                        </p>
                      </div>

                      {baseUrl.includes("localhost") && (
                        <div className="rounded border border-amber-200 bg-amber-50 p-2 space-y-1">
                          <div className="flex items-center gap-1.5 text-amber-800">
                            <AlertTriangleIcon className="size-3" />
                            <span className="text-[10px] font-bold uppercase tracking-tight">
                              Warning: Localhost
                            </span>
                          </div>
                          <p className="text-[10px] text-amber-700 leading-tight">
                            Facebook cannot send webhooks to{" "}
                            <code className="bg-white/50 px-0.5">
                              localhost
                            </code>
                            . Use a tunnel like <strong>ngrok</strong> for
                            testing real leads.
                          </p>
                        </div>
                      )}

                      <div className="rounded border bg-blue-50/50 p-2">
                        <p className="text-[10px] text-blue-700 leading-tight">
                          <strong>Note:</strong> We now automatically subscribe
                          your Page to this webhook when you hit <em>Save</em>.
                          No manual page setup needed.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Use in next nodes panel */}
                <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <ZapIcon className="size-3.5 text-primary" />
                    <h4 className="text-xs font-semibold">Use in next nodes</h4>
                  </div>
                  {sampleSimple && Object.keys(sampleSimple).length > 0 ? (
                    <div className="space-y-1 text-[11px] text-muted-foreground">
                      {Object.entries(sampleSimple)
                        .slice(0, 6)
                        .map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            <code className="bg-background border px-1.5 py-0.5 rounded font-mono text-[11px] shrink-0">
                              {`{{facebookLead.fields.${key}}}`}
                            </code>
                            <span className="truncate leading-4 text-muted-foreground">
                              {String(value).slice(0, 30)}
                            </span>
                          </div>
                        ))}
                      {Object.keys(sampleSimple).length > 6 && (
                        <p className="text-[11px] text-muted-foreground pt-0.5">
                          +{Object.keys(sampleSimple).length - 6} more fields
                        </p>
                      )}
                      <div className="pt-1 space-y-0.5 opacity-70">
                        <div className="flex items-center gap-2">
                          <code className="bg-background border px-1.5 py-0.5 rounded font-mono text-[11px] shrink-0">
                            {"{{facebookLead.leadId}}"}
                          </code>
                          <span className="leading-4">Lead ID</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="bg-background border px-1.5 py-0.5 rounded font-mono text-[11px] shrink-0">
                            {"{{facebookLead.createdTime}}"}
                          </code>
                          <span className="leading-4">Submitted at</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 text-[11px] text-muted-foreground">
                      <p>
                        Load a sample lead to see your actual field variables
                        here.
                      </p>
                      <div className="flex items-start gap-2 opacity-50">
                        <code className="bg-background border px-1.5 py-0.5 rounded font-mono text-[11px]">
                          {"{{facebookLead.fields.email}}"}
                        </code>
                        <span className="leading-4">example</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isSaveEnabled}
                    className="flex-1"
                  >
                    Save
                  </Button>
                </div>
              </div>

              {/* ── RIGHT COLUMN: Sample capture ──────────────────────────── */}
              <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                {/* Header + buttons */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Lead response
                    </span>
                    {lastCapturedAt && (
                      <span className="text-[11px] text-muted-foreground">
                        Last captured:{" "}
                        {new Date(lastCapturedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loadingCapture || !isSaveEnabled}
                      onClick={handleCaptureSample}
                      className="gap-1.5 h-7 text-xs"
                    >
                      {loadingCapture ? (
                        <Loader2Icon className="size-3 animate-spin" />
                      ) : (
                        <RefreshCwIcon className="size-3" />
                      )}
                      {hasSample ? "Refresh sample" : "Load sample"}
                    </Button>
                    {hasSample && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={sendingTest || !ready}
                        onClick={handleSendTestLead}
                        className="gap-1.5 h-7 text-xs"
                      >
                        {sendingTest ? (
                          <Loader2Icon className="size-3 animate-spin" />
                        ) : null}
                        {sendingTest ? "Sending…" : "Send test"}
                      </Button>
                    )}
                  </div>
                </div>

                {!isSaveEnabled && (
                  <div className="rounded-md border bg-muted/50 py-2 px-3 text-[11px] text-muted-foreground">
                    Configure account, page, and form above, then save to load a
                    sample lead.
                  </div>
                )}

                {/* View format toggle */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">View as</span>
                  <div className="inline-flex rounded-md border bg-background p-0.5">
                    {(["simple", "advanced", "raw"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setResponseFormat(fmt)}
                        className={`px-2 py-0.5 rounded text-xs capitalize ${
                          responseFormat === fmt
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {fmt === "raw"
                          ? "Raw"
                          : fmt.charAt(0).toUpperCase() + fmt.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sample data display */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {hasSample
                      ? "Sample lead loaded. Map these fields in your next nodes."
                      : 'No sample loaded yet. Click "Load sample" to fetch the most recent lead from this form.'}
                  </p>

                  {responseFormat === "simple" && (
                    <div className="space-y-2">
                      {sampleSimple && Object.keys(sampleSimple).length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex gap-3 text-[11px] font-medium text-muted-foreground px-0.5">
                            <span className="flex-1">Field</span>
                            <span className="flex-[1.6]">Value</span>
                          </div>
                          <div className="space-y-1.5">
                            {Object.entries(sampleSimple).map(
                              ([key, value]) => (
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
                              ),
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No fields yet. Load a sample to see field/value pairs.
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
                      placeholder="// Load a sample lead to see the structured output."
                    />
                  )}

                  {responseFormat === "raw" && (
                    <Textarea
                      readOnly
                      className="h-52 font-mono text-xs resize-none whitespace-pre"
                      value={
                        sampleRaw ? JSON.stringify(sampleRaw, null, 2) : ""
                      }
                      placeholder="// Load a sample lead to see the raw Facebook API response."
                    />
                  )}
                </div>

                {/* Save named response */}
                <div className="space-y-2 pt-2 border-t mt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      Save sample as
                    </span>
                    <div className="flex items-center gap-2">
                      <Input
                        className="h-7 text-xs w-36"
                        value={savingName}
                        onChange={(e) => setSavingName(e.target.value)}
                        placeholder="e.g. Lead Sample A"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={handleSaveNamedResponse}
                        disabled={saving || !savingName.trim() || !hasSample}
                      >
                        {saving ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  </div>

                  {savedResponses && Object.keys(savedResponses).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground">
                        Saved samples can be used in next nodes as{" "}
                        <code className="bg-background border px-1 rounded font-mono text-[11px]">
                          {`{{facebookLead.savedResponses['${Object.keys(savedResponses)[0]}']}}`}
                        </code>
                        . Click a name to overwrite.
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
