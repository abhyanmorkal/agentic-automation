"use client";

import { RefreshCwIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import z from "zod";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma";
import { toast } from "sonner";
import {
  fetchGoogleSheetColumns,
  fetchGoogleSheets,
  fetchGoogleSpreadsheets,
} from "./actions";
import type { VariableTree } from "@/features/executions/lib/variable-tree";
import type { UpstreamSource } from "./types";

const formSchema = z.object({
  variableName: z.string().min(1, "Variable name is required").regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/),
  credentialId: z.string().min(1, "Credential is required"),
  spreadsheetId: z.string().min(1, "Spreadsheet is required"),
  sheetTitle: z.string().min(1, "Sheet is required"),
  range: z.string().min(1, "Range is required"),
  action: z.enum(["append", "read"]),
  values: z.string().optional(),
  columnMappings: z.record(z.string(), z.string().optional()).optional(),
  sourceVariable: z.string().min(1, "Source variable is required"),
  selectedResponseName: z.string().optional(),
  readFilter: z.object({
    column: z.string(),
    operator: z.string(),
    value: z.string(),
  }).optional(),
  readOutputMapping: z.record(z.string(), z.string()).optional(),
});

export type GoogleSheetsFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleSheetsFormValues) => void;
  defaultValues?: Partial<GoogleSheetsFormValues>;
  availableVariables?: VariableTree;
  upstreamSources?: UpstreamSource[];
  savedResponseFields?: { key: string; label: string; example?: string }[];
  activeResponseName?: string;
  allResponseNames?: string[];
}

export const GoogleSheetsDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  availableVariables = {},
  upstreamSources = [],
  savedResponseFields = [],
  activeResponseName,
  allResponseNames = [],
}: Props) => {
  const {
    data: credentials,
    isLoading,
    refetch,
  } = useCredentialsByType(CredentialType.GOOGLE_OAUTH);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const form = useForm<GoogleSheetsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName ?? "",
      credentialId: defaultValues.credentialId ?? "",
      spreadsheetId: defaultValues.spreadsheetId ?? "",
      sheetTitle: defaultValues.sheetTitle ?? "",
      range: defaultValues.range ?? "Sheet1!A:Z",
      action: defaultValues.action ?? "append",
      values: defaultValues.values ?? '[["Value 1", "Value 2"]]',
      columnMappings: defaultValues.columnMappings ?? {},
      sourceVariable: defaultValues.sourceVariable ?? (upstreamSources[0]?.variableKey || "webhook"),
      selectedResponseName: defaultValues.selectedResponseName ?? "",
      readFilter: defaultValues.readFilter ?? { column: "", operator: "equals", value: "" },
      readOutputMapping: defaultValues.readOutputMapping ?? {},
    },
  });

  useEffect(() => {
    if (open) form.reset({
      variableName: defaultValues.variableName ?? "",
      credentialId: defaultValues.credentialId ?? "",
      spreadsheetId: defaultValues.spreadsheetId ?? "",
      sheetTitle: defaultValues.sheetTitle ?? "",
      range: defaultValues.range ?? "Sheet1!A:Z",
      action: defaultValues.action ?? "append",
      values: defaultValues.values ?? '[["Value 1", "Value 2"]]',
      columnMappings: defaultValues.columnMappings ?? {},
      sourceVariable: defaultValues.sourceVariable ?? (upstreamSources[0]?.variableKey || "webhook"),
      selectedResponseName: defaultValues.selectedResponseName ?? "",
      readFilter: defaultValues.readFilter ?? { column: "", operator: "equals", value: "" },
      readOutputMapping: defaultValues.readOutputMapping ?? {},
    });
  }, [open, defaultValues, form, upstreamSources]);

  const [spreadsheets, setSpreadsheets] = useState<{ id: string; name: string }[]>([]);
  const [sheets, setSheets] = useState<{ title: string }[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loadingSpreadsheets, setLoadingSpreadsheets] = useState(false);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [testRowConfirm, setTestRowConfirm] = useState<{ rangeValue: string; testValues?: string[][] } | null>(null);

  // Embedded Google OAuth popup flow (similar to Facebook)
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (
        typeof event.data !== "object" ||
        !event.data ||
        (event.data.type !== "google_auth_success" && event.data.type !== "google_auth_error")
      ) {
        return;
      }

      if (event.data.type === "google_auth_error") {
        toast.error(`Google connection failed: ${event.data.error ?? "Unknown error"}`);
        setConnectingGoogle(false);
        return;
      }

      if (event.data.type === "google_auth_success") {
        toast.success("Google account connected");
        setConnectingGoogle(false);
        // Refresh credential list and select the newly created one.
        const result = await refetch();
        const newId: string | undefined = event.data.credentialId;
        if (newId) {
          form.setValue("credentialId", newId);
        } else if (result.data && result.data.length > 0) {
          // Fallback: select the last credential if ID wasn't provided.
          form.setValue("credentialId", result.data[result.data.length - 1]!.id);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [form, refetch]);

  const handleConnectGoogle = () => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      "/api/auth/google?mode=popup&name=Google%20Sheets%20Account",
      "google-auth",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`,
    );

    if (!popup) {
      toast.error("Popup blocked. Please allow popups for this site.");
      return;
    }

    popupRef.current = popup;
    setConnectingGoogle(true);

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        setConnectingGoogle(false);
      }
    }, 500);
  };

  const varName = form.watch("variableName") || "mySheets";
  const action = form.watch("action");
  const sourceVariable = form.watch("sourceVariable") || "webhook";
  const watchedCredentialId = form.watch("credentialId");
  const watchedSpreadsheetId = form.watch("spreadsheetId");
  const watchedSheetTitle = form.watch("sheetTitle");

  // Load spreadsheets when credential changes
  useEffect(() => {
    if (!watchedCredentialId) {
      setSpreadsheets([]);
      setSheets([]);
      setColumns([]);
      return;
    }
    setLoadingSpreadsheets(true);
    fetchGoogleSpreadsheets(watchedCredentialId)
      .then((list) => {
        setSpreadsheets(list);
        // If current spreadsheetId no longer exists, clear dependent fields.
        const current = form.getValues("spreadsheetId");
        if (current && !list.find((s) => s.id === current)) {
          form.setValue("spreadsheetId", "");
          form.setValue("sheetTitle", "");
          setSheets([]);
          setColumns([]);
        }
      })
      .catch(() => {
        toast.error("Failed to load spreadsheets from Google.");
        setSpreadsheets([]);
      })
      .finally(() => setLoadingSpreadsheets(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCredentialId]);

  // Load sheets when spreadsheet changes
  useEffect(() => {
    if (!watchedCredentialId || !watchedSpreadsheetId) {
      setSheets([]);
      setColumns([]);
      return;
    }
    setLoadingSheets(true);
    fetchGoogleSheets(watchedCredentialId, watchedSpreadsheetId)
      .then((list) => {
        setSheets(list);
        const current = form.getValues("sheetTitle");
        if (current && !list.find((s) => s.title === current)) {
          form.setValue("sheetTitle", "");
          setColumns([]);
        }
      })
      .catch(() => {
        toast.error("Failed to load sheets from this spreadsheet.");
        setSheets([]);
      })
      .finally(() => setLoadingSheets(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCredentialId, watchedSpreadsheetId]);

  // Load columns when sheet changes
  useEffect(() => {
    if (!watchedCredentialId || !watchedSpreadsheetId || !watchedSheetTitle) {
      setColumns([]);
      return;
    }
    setLoadingColumns(true);
    fetchGoogleSheetColumns(watchedCredentialId, watchedSpreadsheetId, watchedSheetTitle)
      .then((cols) => setColumns(cols))
      .catch(() => {
        toast.error("Failed to load header row from this sheet.");
        setColumns([]);
      })
      .finally(() => setLoadingColumns(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCredentialId, watchedSpreadsheetId, watchedSheetTitle]);

  const handleRefreshColumns = () => {
    if (!watchedCredentialId || !watchedSpreadsheetId || !watchedSheetTitle) return;
    setLoadingColumns(true);
    fetchGoogleSheetColumns(watchedCredentialId, watchedSpreadsheetId, watchedSheetTitle)
      .then((cols) => {
        setColumns(cols);
        toast.success("Columns refreshed");
      })
      .catch(() => {
        toast.error("Failed to load header row from this sheet.");
        setColumns([]);
      })
      .finally(() => setLoadingColumns(false));
  };

  const columnMappings = form.watch("columnMappings") || {};
  const watchedSourceVariable = form.watch("sourceVariable") || "webhook";

  const handleSubmit = (values: GoogleSheetsFormValues) => {
    // Keep range in sync with selected sheet if not manually overridden.
    const sheetTitle = values.sheetTitle;
    const range = sheetTitle ? `${sheetTitle}!A:Z` : values.range;

    let finalValues = values.values;
    if (
      values.action === "append" &&
      columns.length > 0 &&
      Object.keys(columnMappings).length > 0 &&
      savedResponseFields.length > 0
    ) {
      const sourceKey = values.sourceVariable || "webhook";
      const row = columns.map((col) => {
        const key = columnMappings[col];
        if (!key) return "";
        // Build a Handlebars template that references the LIVE incoming data,
        // NOT the saved design-time sample.
        //
        // Runtime context structure per source type:
        //   Webhook:        context.webhook.body.{key}
        //   Facebook Lead:  context.facebookLead.fields.{key}
        //   Others:         context.{sourceKey}.body.{key}  (fallback)
        if (sourceKey === "facebookLead") {
          return `{{${sourceKey}.fields.${key}}}`;
        }
        return `{{${sourceKey}.body.${key}}}`;
      });
      finalValues = JSON.stringify([row]);
    }

    onSubmit({
      ...values,
      range,
      values: finalValues,
    });
    onOpenChange(false);
  };

  const handleSendTestRow = async () => {
    const valid = await form.trigger(["credentialId", "spreadsheetId", "sheetTitle", "range"]);
    if (!valid) {
      toast.error("Please fix the highlighted fields before sending a test row.");
      return;
    }

    const sheetTitle = form.getValues("sheetTitle");
    const rangeValue = form.getValues("range") || (sheetTitle ? `${sheetTitle}!A:Z` : "Sheet1!A:Z");
    const currentMappings = form.getValues("columnMappings") ?? {};

    let testValues: string[][] | undefined;
    if (columns.length > 0 && Object.keys(currentMappings).length > 0) {
      const row = columns.map((col) => {
        const fieldKey = currentMappings[col];
        if (!fieldKey) return "";
        const field = savedResponseFields.find((f) => f.key === fieldKey);
        return field?.example ?? fieldKey;
      });
      testValues = [row];
    }

    setTestRowConfirm({ rangeValue, testValues });
  };

  const handleConfirmTestRow = async () => {
    if (!testRowConfirm) return;
    const { rangeValue, testValues } = testRowConfirm;
    setTestRowConfirm(null);

    const credentialId = form.getValues("credentialId");
    const spreadsheetId = form.getValues("spreadsheetId");

    try {
      const res = await fetch("/api/triggers/google-sheets/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialId,
          spreadsheetId,
          range: rangeValue,
          ...(testValues ? { values: testValues } : {}),
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error || "Failed to send test row to Google Sheets.");
        return;
      }

      toast.success("Test row appended to Google Sheets. Check your sheet to verify.");
    } catch {
      toast.error("Failed to send test row to Google Sheets.");
    }
  };

  const hasSavedResponseFields = savedResponseFields.length > 0 && !!activeResponseName;
  const selectedSource = upstreamSources.find((s) => s.variableKey === watchedSourceVariable);

  return (
    <>
    <AlertDialog open={!!testRowConfirm} onOpenChange={(o) => { if (!o) setTestRowConfirm(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Append test row to sheet?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>This will write a real row to <span className="font-medium">{testRowConfirm?.rangeValue}</span>. This cannot be undone automatically.</p>
              {testRowConfirm?.testValues && testRowConfirm.testValues[0] && (
                <div className="rounded-md border bg-muted/40 p-2 font-mono text-xs break-all">
                  {testRowConfirm.testValues[0].map((v, i) => (
                    <span key={i} className="mr-2">{columns[i] ? `${columns[i]}: ` : ""}<span className="text-primary">{v || "(empty)"}</span></span>
                  ))}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmTestRow}>Append row</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Google Sheets Configuration</DialogTitle>
          <DialogDescription>
            Append new rows or read data from a Google Sheet.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit, () => {
              toast.error("Please fix the highlighted fields before saving this Google Sheets node.");
            })}
            className="mt-4 space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left column: core configuration */}
              <div className="space-y-5">
                <FormField control={form.control} name="variableName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variable Name</FormLabel>
                    <FormControl><Input placeholder="mySheets" {...field} /></FormControl>
                    <FormDescription>
                      Result will be available as {`{{${varName}}}`} in later nodes.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="credentialId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Account</FormLabel>
                    <div className="flex items-center gap-2">
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoading || !credentials?.length}
                      >
                        <FormControl>
                          <SelectTrigger className="min-w-[220px]">
                            <SelectValue placeholder="Select connected account" />
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleConnectGoogle}
                        disabled={connectingGoogle}
                      >
                        {connectingGoogle ? "Connecting…" : "Connect with Google"}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="action" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="append">Add New Row</SelectItem>
                        <SelectItem value="read">Get Row(s)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="sourceVariable" render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel>Source data</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          // Reset selected response when source changes
                          form.setValue("selectedResponseName", "");
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {upstreamSources.length > 0
                            ? upstreamSources.map((src) => (
                                <SelectItem key={src.variableKey} value={src.variableKey}>
                                  {src.label}
                                </SelectItem>
                              ))
                            : (
                              <>
                                <SelectItem value="webhook">Webhook</SelectItem>
                                <SelectItem value="facebookLead">Facebook Lead</SelectItem>
                              </>
                            )
                          }
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {upstreamSources.length === 0 ? "Connect a trigger node upstream to see sources." : ""}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }} />

                {allResponseNames.length > 0 && (
                  <FormField control={form.control} name="selectedResponseName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Saved response</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || activeResponseName || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select saved response" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allResponseNames.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose which saved response to use for column mapping.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                <FormField control={form.control} name="spreadsheetId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spreadsheet</FormLabel>
                    <div className="flex items-center gap-2">
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loadingSpreadsheets || !watchedCredentialId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select spreadsheet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {spreadsheets.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={loadingSpreadsheets || !watchedCredentialId}
                        onClick={() => {
                          if (!watchedCredentialId) return;
                          setLoadingSpreadsheets(true);
                          fetchGoogleSpreadsheets(watchedCredentialId)
                            .then(setSpreadsheets)
                            .catch(() => toast.error("Failed to refresh spreadsheets"))
                            .finally(() => setLoadingSpreadsheets(false));
                        }}
                      >
                        ↻
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="sheetTitle" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sheet</FormLabel>
                    <div className="flex items-center gap-2">
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loadingSheets || !watchedSpreadsheetId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sheet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sheets.map((s) => (
                            <SelectItem key={s.title} value={s.title}>
                              {s.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={loadingSheets || !watchedSpreadsheetId || !watchedCredentialId}
                        onClick={() => {
                          if (!watchedCredentialId || !watchedSpreadsheetId) return;
                          setLoadingSheets(true);
                          fetchGoogleSheets(watchedCredentialId, watchedSpreadsheetId)
                            .then(setSheets)
                            .catch(() => toast.error("Failed to refresh sheets"))
                            .finally(() => setLoadingSheets(false));
                        }}
                      >
                        ↻
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Right column: mapping & advanced controls */}
              <div className="space-y-5">
                {action === "append" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <FormLabel>Column mapping</FormLabel>
                        <span className="text-xs text-muted-foreground">
                          Map fields from <span className="font-medium">{activeResponseName ?? "saved response"}</span>{selectedSource ? ` (${selectedSource.label})` : ""} to each column.
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={loadingColumns || !watchedSheetTitle}
                        onClick={handleRefreshColumns}
                        title="Refresh Columns"
                      >
                        <RefreshCwIcon className={`h-3 w-3 ${loadingColumns ? "animate-spin" : ""}`} />
                        <span className="sr-only">Refresh Columns</span>
                      </Button>
                    </div>
                    {columns.length > 0 && Object.keys(columnMappings).length > 0 && (() => {
                      const unmapped = columns.filter((col) => !columnMappings[col]);
                      return unmapped.length > 0 ? (
                        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                          {unmapped.length} column{unmapped.length > 1 ? "s" : ""} will be written as empty:{" "}
                          <span className="font-medium">{unmapped.join(", ")}</span>
                        </p>
                      ) : null;
                    })()}
                    <div className="border rounded-md p-3 max-h-72 overflow-auto space-y-2 bg-muted/40">
                      {loadingColumns && (
                        <p className="text-xs text-muted-foreground">Loading columns…</p>
                      )}
                      {!loadingColumns && columns.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Select a spreadsheet and sheet to load column headers.
                        </p>
                      )}
                      {columns.map((col) => (
                        <FormField
                          key={col}
                          control={form.control}
                          name={`columnMappings.${col}` as const}
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <div className="grid grid-cols-[160px,1fr] items-center gap-2">
                                <FormLabel className="text-xs font-medium truncate">
                                  {col}
                                </FormLabel>
                                <FormControl>
                                  <Select
                                    value={field.value ?? ""}
                                    onValueChange={field.onChange}
                                    disabled={!hasSavedResponseFields}
                                  >
                                    <SelectTrigger>
                                      <SelectValue
                                        placeholder={
                                          hasSavedResponseFields
                                            ? "Choose field"
                                            : "No saved response fields"
                                        }
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {savedResponseFields.map((f) => (
                                        <SelectItem key={f.key} value={f.key}>
                                          {f.label}
                                          {f.example ? ` — ${f.example}` : ""}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                              </div>
                              {!hasSavedResponseFields && (
                                <p className="text-[11px] text-muted-foreground">
                                  Capture and save a response in the upstream trigger node first to enable mapping.
                                </p>
                              )}
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {action === "read" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <FormLabel>Find row where</FormLabel>
                      <span className="text-xs text-muted-foreground block">
                        Filter returned rows by matching a column value. Leave column blank to return all rows.
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <FormField
                          control={form.control}
                          name="readFilter.column"
                          render={({ field }) => (
                            <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={columns.length === 0}>
                              <SelectTrigger>
                                <SelectValue placeholder={columns.length === 0 ? "Load sheet first" : "Column"} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">— None —</SelectItem>
                                {columns.map((col) => (
                                  <SelectItem key={col} value={col}>{col}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="readFilter.operator"
                          render={({ field }) => (
                            <Select value={field.value ?? "equals"} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equals">equals</SelectItem>
                                <SelectItem value="contains">contains</SelectItem>
                                <SelectItem value="starts_with">starts with</SelectItem>
                                <SelectItem value="ends_with">ends with</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="readFilter.value"
                          render={({ field }) => (
                            <FormControl>
                              <Input
                                placeholder="Value to match"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                className="text-sm"
                              />
                            </FormControl>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <FormLabel>Output mapping</FormLabel>
                          <span className="text-xs text-muted-foreground">
                            Map sheet columns to variable names. Access via{" "}
                            <code className="bg-muted px-1 rounded text-[11px]">{`{{${varName}.row.YourVarName}}`}</code>
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={loadingColumns || !watchedSheetTitle}
                          onClick={handleRefreshColumns}
                          title="Refresh Columns"
                        >
                          <RefreshCwIcon className={`h-3 w-3 ${loadingColumns ? "animate-spin" : ""}`} />
                          <span className="sr-only">Refresh Columns</span>
                        </Button>
                      </div>
                      <div className="border rounded-md p-3 max-h-60 overflow-auto space-y-2 bg-muted/40">
                        {loadingColumns && (
                          <p className="text-xs text-muted-foreground">Loading columns…</p>
                        )}
                        {!loadingColumns && columns.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Select a spreadsheet and sheet to load column headers.
                          </p>
                        )}
                        {columns.map((col) => (
                          <FormField
                            key={col}
                            control={form.control}
                            name={`readOutputMapping.${col}` as const}
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <div className="grid grid-cols-[160px,1fr] items-center gap-2">
                                  <FormLabel className="text-xs font-medium truncate">{col}</FormLabel>
                                  <FormControl>
                                    <Input
                                      className="h-8 text-xs"
                                      value={field.value ?? ""}
                                      onChange={field.onChange}
                                      placeholder={col.replace(/[^A-Za-z0-9_]/g, "_").toLowerCase()}
                                    />
                                  </FormControl>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <FormField control={form.control} name="range" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Range (advanced)</FormLabel>
                      <FormControl><Input placeholder="Sheet1!A:Z" {...field} /></FormControl>
                      <FormDescription>
                        Where to read or write rows, e.g. `Sheet1!A:Z`. Usually autofilled from the selected sheet.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {action === "append" && (
                    <FormField control={form.control} name="values" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Raw values JSON (optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={`[["{{${varName}.Email}}", "{{${varName}.FirstName}}"]]`}
                            className="min-h-[96px] font-mono text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Normally built automatically from the column mapping. Edit only if you need full custom JSON.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between">
              <Button type="button" variant="outline" onClick={handleSendTestRow}>
                Append test row to sheet
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  );
};
