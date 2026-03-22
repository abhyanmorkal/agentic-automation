"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CopyIcon, Loader2Icon, RefreshCwIcon, AlertTriangleIcon } from "lucide-react";
import z from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { CredentialType } from "@/generated/prisma";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { useTRPC } from "@/trpc/client";
import {
  fetchFacebookPages,
  fetchFacebookLeadForms,
  fetchFacebookSampleLead,
  testFacebookConnection,
  fetchCredentialExpiry,
  type FacebookPage,
  type FacebookLeadForm,
  type FacebookSampleLead,
} from "./actions";

const formSchema = z.object({
  credentialId: z.string().min(1, "Please connect a Facebook account"),
  pageId: z.string().min(1, "Please select a page"),
  pageName: z.string().optional(),
  formId: z.string().min(1, "Please select a lead gen form"),
  formName: z.string().optional(),
});

export type FacebookLeadTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FacebookLeadTriggerFormValues) => void;
  defaultValues?: Partial<FacebookLeadTriggerFormValues>;
  nodeId?: string;
}

export const FacebookLeadTriggerDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  nodeId: _nodeId,
}: Props) => {
  const params = useParams();
  const workflowId = params.workflowId as string;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const webhookUrl = `${baseUrl}/api/webhooks/facebook-leads?workflowId=${workflowId}`;

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: credentials, isLoading: credentialsLoading } = useCredentialsByType(
    CredentialType.META_ACCESS_TOKEN,
  );

  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [forms, setForms] = useState<FacebookLeadForm[]>([]);
  const [sampleLead, setSampleLead] = useState<FacebookSampleLead | null>(null);
  const [connectingFb, setConnectingFb] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [tokenExpiry, setTokenExpiry] = useState<{ daysRemaining: number | null; warning: boolean } | null>(null);
  const [loadingPages, startLoadingPages] = useTransition();
  const [loadingForms, startLoadingForms] = useTransition();
  const [loadingSample, startLoadingSample] = useTransition();
  const popupRef = useRef<Window | null>(null);

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

  const watchedCredentialId = form.watch("credentialId");
  const watchedPageId = form.watch("pageId");
  const watchedFormId = form.watch("formId");

  // Reset form on open
  useEffect(() => {
    if (open) {
      form.reset({
        credentialId: defaultValues.credentialId ?? "",
        pageId: defaultValues.pageId ?? "",
        pageName: defaultValues.pageName ?? "",
        formId: defaultValues.formId ?? "",
        formName: defaultValues.formName ?? "",
      });
      setSampleLead(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Listen for postMessage from the Facebook OAuth popup
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "facebook_auth_success") {
        setConnectingFb(false);
        popupRef.current?.close();

        // Refresh the credentials list
        queryClient.invalidateQueries(
          trpc.credentials.getByType.queryOptions({ type: CredentialType.META_ACCESS_TOKEN }),
        );

        // Auto-select the newly created credential
        if (event.data.credentialId) {
          form.setValue("credentialId", event.data.credentialId);
          form.setValue("pageId", "");
          form.setValue("pageName", "");
          form.setValue("formId", "");
          form.setValue("formName", "");
          setPages([]);
          setForms([]);
          setSampleLead(null);
        }

        toast.success(`Connected: ${event.data.credentialName ?? "Facebook account"}`);
      } else if (event.data?.type === "facebook_auth_error") {
        setConnectingFb(false);
        toast.error(event.data.error || "Facebook connection failed");
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  // Open the Facebook OAuth popup
  const handleConnectFacebook = () => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      "/api/auth/facebook",
      "facebook-auth",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`,
    );

    if (!popup) {
      toast.error("Popup blocked. Please allow popups for this site.");
      return;
    }

    popupRef.current = popup;
    setConnectingFb(true);

    // Detect if the popup was closed without completing auth
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        setConnectingFb(false);
      }
    }, 500);
  };

  // Check token expiry when credential changes
  useEffect(() => {
    if (!watchedCredentialId) {
      setTokenExpiry(null);
      return;
    }
    fetchCredentialExpiry(watchedCredentialId)
      .then((result) => setTokenExpiry({ daysRemaining: result.daysRemaining, warning: result.warning }))
      .catch(() => setTokenExpiry(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCredentialId]);

  // Load pages when credential changes
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
        const currentPageId = form.getValues("pageId");
        if (currentPageId && !result.find((p) => p.id === currentPageId)) {
          form.setValue("pageId", "");
          form.setValue("pageName", "");
          setForms([]);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load Facebook pages. Check your access token permissions.");
        setPages([]);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCredentialId]);

  // Load forms when page changes
  useEffect(() => {
    if (!watchedCredentialId || !watchedPageId) {
      setForms([]);
      return;
    }
    startLoadingForms(async () => {
      try {
        const result = await fetchFacebookLeadForms(watchedCredentialId, watchedPageId);
        setForms(result);
        const currentFormId = form.getValues("formId");
        if (currentFormId && !result.find((f) => f.id === currentFormId)) {
          form.setValue("formId", "");
          form.setValue("formName", "");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load lead gen forms for this page.");
        setForms([]);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCredentialId, watchedPageId]);

  const handleLoadSample = () => {
    if (!watchedCredentialId || !watchedPageId || !watchedFormId) {
      toast.error("Select a credential, page, and form first");
      return;
    }
    startLoadingSample(async () => {
      try {
        const lead = await fetchFacebookSampleLead(watchedCredentialId, watchedPageId, watchedFormId);
        if (!lead) {
          toast.info("No sample leads found. Submit a test lead from Facebook first.");
        } else {
          setSampleLead(lead);
          toast.success("Sample lead loaded!");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load sample lead.");
      }
    });
  };

  const handleTestConnection = async () => {
    if (!watchedCredentialId) return;
    setTestingConnection(true);
    try {
      const result = await testFacebookConnection(watchedCredentialId);
      if (result.valid) {
        toast.success(`Connected as ${result.name ?? "Facebook user"}`);
      } else {
        toast.error(result.error ?? "Connection failed");
      }
    } finally {
      setTestingConnection(false);
    }
  };

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success("Webhook URL copied!");
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const handleSubmit = (values: FacebookLeadTriggerFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Facebook Lead Ads</DialogTitle>
          <DialogDescription>
            Run when someone submits your lead form.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

            {/* Connect: account + button */}
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="credentialId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook account</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue("pageId", "");
                        form.setValue("pageName", "");
                        form.setValue("formId", "");
                        form.setValue("formName", "");
                        setPages([]);
                        setForms([]);
                        setSampleLead(null);
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
              {watchedCredentialId && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5 text-muted-foreground"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                  >
                    {testingConnection ? (
                      <Loader2Icon className="size-3 animate-spin" />
                    ) : null}
                    {testingConnection ? "Testing…" : "Test connection"}
                  </Button>
                  {tokenExpiry?.daysRemaining !== null && tokenExpiry?.daysRemaining !== undefined && (
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
                      {tokenExpiry.warning && <AlertTriangleIcon className="size-3" />}
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
                  <svg viewBox="0 0 24 24" className="size-4 fill-[#1877f2]" aria-hidden>
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
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

            {/* Page */}
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
                      setSampleLead(null);
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
                              ? "Loading..."
                              : pages.length === 0
                              ? "No pages"
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

            {/* Lead form */}
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
                      setSampleLead(null);
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
                              ? "Loading..."
                              : forms.length === 0
                              ? "No forms"
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
                              variant={f.status === "ACTIVE" ? "default" : "secondary"}
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

            {/* Collapsible: Webhook URL + Sample + Variables */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                  Webhook & sample data
                  {advancedOpen ? (
                    <ChevronDownIcon className="size-4" />
                  ) : (
                    <ChevronRightIcon className="size-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Add this URL in your Facebook App → Webhooks (leadgen).</p>
                  <div className="flex gap-2">
                    <Input value={webhookUrl} readOnly className="font-mono text-xs h-8" />
                    <Button type="button" size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={copyWebhookUrl}>
                      <CopyIcon className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="rounded-md border bg-muted/50 p-2.5 text-xs text-muted-foreground">
                  After saving, test by submitting a lead via your form&apos;s &quot;Preview&quot; (form must be live).
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Preview lead data</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLoadSample}
                    disabled={loadingSample || !watchedCredentialId || !watchedPageId || !watchedFormId}
                    className="gap-1.5 h-7 text-xs"
                  >
                    {loadingSample ? (
                      <Loader2Icon className="size-3 animate-spin" />
                    ) : (
                      <RefreshCwIcon className="size-3" />
                    )}
                    Load sample
                  </Button>
                </div>
                {sampleLead ? (
                  <div className="rounded-md border bg-muted/30 p-2 space-y-1 text-xs">
                    {sampleLead.field_data.slice(0, 5).map((field) => (
                      <div key={field.name} className="flex gap-2 truncate">
                        <code className="shrink-0 text-primary">{`{{facebookLead.fields.${field.name}}}`}</code>
                        <span className="truncate text-muted-foreground">= {field.values[0] ?? "(empty)"}</span>
                      </div>
                    ))}
                    {sampleLead.field_data.length > 5 && (
                      <p className="text-muted-foreground pt-0.5">+{sampleLead.field_data.length - 5} more</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Select a form and click Load sample to see variables.</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Use <code className="bg-muted px-1 rounded">{"{{facebookLead.leadId}}"}</code>,{" "}
                  <code className="bg-muted px-1 rounded">{"{{facebookLead.fields.email}}"}</code>, etc. in later steps.
                </p>
              </CollapsibleContent>
            </Collapsible>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
