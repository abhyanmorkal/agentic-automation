"use client";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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
});

export type GoogleSheetsFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleSheetsFormValues) => void;
  defaultValues?: Partial<GoogleSheetsFormValues>;
}

export const GoogleSheetsDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {
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
      sheetTitle: (defaultValues as any).sheetTitle ?? "",
      range: defaultValues.range ?? "Sheet1!A:Z",
      action: defaultValues.action ?? "append",
      values: defaultValues.values ?? '[["Value 1", "Value 2"]]',
      columnMappings: (defaultValues as any).columnMappings ?? {},
      sourceVariable: (defaultValues as any).sourceVariable ?? "facebookLead",
    },
  });

  useEffect(() => {
    if (open) form.reset({
      variableName: defaultValues.variableName ?? "",
      credentialId: defaultValues.credentialId ?? "",
      spreadsheetId: defaultValues.spreadsheetId ?? "",
      sheetTitle: (defaultValues as any).sheetTitle ?? "",
      range: defaultValues.range ?? "Sheet1!A:Z",
      action: defaultValues.action ?? "append",
      values: defaultValues.values ?? '[["Value 1", "Value 2"]]',
      columnMappings: (defaultValues as any).columnMappings ?? {},
      sourceVariable: (defaultValues as any).sourceVariable ?? "facebookLead",
    });
  }, [open, defaultValues, form]);

  const [spreadsheets, setSpreadsheets] = useState<{ id: string; name: string }[]>([]);
  const [sheets, setSheets] = useState<{ title: string }[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loadingSpreadsheets, setLoadingSpreadsheets] = useState(false);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(false);

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
  const sourceVariable = form.watch("sourceVariable") || "facebookLead";
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

  const columnMappings = form.watch("columnMappings") || {};

  const handleSubmit = (values: GoogleSheetsFormValues) => {
    // Keep range in sync with selected sheet if not manually overridden.
    const sheetTitle = values.sheetTitle;
    const range = sheetTitle ? `${sheetTitle}!A:Z` : values.range;

    let finalValues = values.values;
    if (values.action === "append" && columns.length > 0 && Object.keys(columnMappings).length > 0) {
      const row = columns.map((col) => columnMappings[col] || "");
      finalValues = JSON.stringify([row]);
    }

    onSubmit({
      ...values,
      range,
      values: finalValues,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-8xl">
        <DialogHeader>
          <DialogTitle>Google Sheets Configuration</DialogTitle>
          <DialogDescription>
            Connect your Google account and map workflow data into a clean spreadsheet, Litchoo-style.
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
                      Reference as {`{{${varName}.values}}`} (read) or {`{{${varName}.updatedRows}}`} (append)
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
                    <FormDescription>
                      Choose an existing Google account or connect a new one in a popup.
                    </FormDescription>
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

                <FormField control={form.control} name="sourceVariable" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source data</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source variable" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="facebookLead">Facebook lead (webhooks)</SelectItem>
                        <SelectItem value="webhook">Generic webhook</SelectItem>
                        <SelectItem value={varName}>{varName} (this Sheets node)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose which node&apos;s data you want to map into this sheet.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

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
                      <FormLabel>Column mapping</FormLabel>
                      <span className="text-xs text-muted-foreground">
                        Map your workflow fields into spreadsheet columns.
                      </span>
                    </div>
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
                            <FormItem className="grid grid-cols-[160px,1fr] items-center gap-2">
                              <FormLabel className="text-xs font-medium truncate">
                                {col}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={`{{${sourceVariable}.${col}}}`}
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <FormField control={form.control} name="range" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Range (advanced)</FormLabel>
                      <FormControl><Input placeholder="Sheet1!A:Z" {...field} /></FormControl>
                      <FormDescription>
                        Range decides where rows are read or written, for example `Sheet1!A:Z`. Normally this is auto-filled from the selected sheet; override only for advanced cases.
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
                          Normally built automatically from the column mapping above. Edit only if you need full custom JSON.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
