"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronsUpDownIcon,
  RefreshCwIcon,
  Settings2Icon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
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
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import type { VariableTree } from "@/features/executions/lib/variable-tree";
import { CredentialType } from "@/generated/prisma";
import { getRequiredConnectorForCredentialType } from "@/integrations/core/registry";
import { cn } from "@/lib/utils";
import {
  fetchGoogleSheetColumns,
  fetchGoogleSheets,
  fetchGoogleSpreadsheets,
} from "./actions";
import type { UpstreamSource } from "./types";

/**
 * Sanitize a raw string into a valid JS identifier:
 * replace spaces/invalid chars with underscores, prefix leading digits with _.
 */
function sanitizeVariableName(raw: string): string {
  if (!raw) return "";
  let result = raw.replace(/[^A-Za-z0-9_$]/g, "_");
  if (/^[0-9]/.test(result)) result = "_" + result;
  return result;
}

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required")
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, "Variable name must start with a letter, _ or $ and contain only letters, digits, _ or $"),
  credentialId: z.string().min(1, "Credential is required"),
  spreadsheetId: z.string().min(1, "Spreadsheet is required"),
  sheetTitle: z.string().min(1, "Sheet is required"),
  range: z.string().min(1, "Range is required"),
  action: z.enum(["append", "read", "update", "delete", "clear", "create_sheet"]),
  values: z.string().optional(),
  columnMappings: z.record(z.string(), z.string().optional()).optional(),
  sourceVariable: z.string().min(1, "Source variable is required"),
  selectedResponseName: z.string().optional(),
  readFilter: z
    .object({
      column: z.string().optional(),
      operator: z.string().optional(),
      value: z.string().optional(),
    })
    .optional(),
  updateRowNumber: z.string().optional(),
  deleteRowNumber: z.string().optional(),
  newSheetName: z.string().optional(),
  readOutputMapping: z.record(z.string(), z.string()).optional(),
});

export type GoogleSheetsFormValues = z.infer<typeof formSchema>;

const toTemplatePath = (root: string, fieldPath: string) => {
  const segments = fieldPath.split(".").filter(Boolean);
  const suffix = segments
    .map((segment) =>
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment)
        ? `.${segment}`
        : `.[${segment}]`,
    )
    .join("");

  return `${root}${suffix}`;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleSheetsFormValues) => void;
  defaultValues?: Partial<GoogleSheetsFormValues>;
  availableVariables?: VariableTree;
  upstreamSources?: UpstreamSource[];
  savedResponseFields?: { key: string; label: string; example?: string }[];
  savedResponseFieldsByName?: Record<
    string,
    { key: string; label: string; example?: string }[]
  >;
  activeResponseName?: string;
  allResponseNames?: string[];
}

type SearchableOption = {
  value: string;
  label: string;
  keywords?: string;
};

function SearchablePicker({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled,
  loading,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between overflow-hidden"
        >
          <span className="truncate text-left">
            {selected?.label || placeholder}
          </span>
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{loading ? "Loading..." : emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.keywords ?? ""}`}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "size-4",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export const GoogleSheetsDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  upstreamSources = [],
  savedResponseFields = [],
  savedResponseFieldsByName = {},
  activeResponseName,
  allResponseNames = [],
}: Props) => {
  const googleConnector = getRequiredConnectorForCredentialType(
    CredentialType.GOOGLE_OAUTH,
  );
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
      sourceVariable:
        defaultValues.sourceVariable ??
        (upstreamSources[0]?.variableKey || "webhook"),
      selectedResponseName: defaultValues.selectedResponseName ?? "",
      readFilter: defaultValues.readFilter ?? {
        column: "",
        operator: "equals",
        value: "",
      },
      updateRowNumber: defaultValues.updateRowNumber ?? "",
      deleteRowNumber: defaultValues.deleteRowNumber ?? "",
      newSheetName: defaultValues.newSheetName ?? "",
      readOutputMapping: defaultValues.readOutputMapping ?? {},
    },
  });

  useEffect(() => {
    if (open)
      form.reset({
        variableName: defaultValues.variableName ?? "",
        credentialId: defaultValues.credentialId ?? "",
        spreadsheetId: defaultValues.spreadsheetId ?? "",
        sheetTitle: defaultValues.sheetTitle ?? "",
        range: defaultValues.range ?? "Sheet1!A:Z",
        action: defaultValues.action ?? "append",
        values: defaultValues.values ?? '[["Value 1", "Value 2"]]',
        columnMappings: defaultValues.columnMappings ?? {},
        sourceVariable:
          defaultValues.sourceVariable ??
          (upstreamSources[0]?.variableKey || "webhook"),
        selectedResponseName: defaultValues.selectedResponseName ?? "",
        readFilter: defaultValues.readFilter ?? {
          column: "",
          operator: "equals",
          value: "",
        },
        updateRowNumber: defaultValues.updateRowNumber ?? "",
        deleteRowNumber: defaultValues.deleteRowNumber ?? "",
        newSheetName: defaultValues.newSheetName ?? "",
        readOutputMapping: defaultValues.readOutputMapping ?? {},
      });
  }, [open, defaultValues, form, upstreamSources]);

  const [spreadsheets, setSpreadsheets] = useState<
    { id: string; name: string }[]
  >([]);
  const [sheets, setSheets] = useState<{ title: string }[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loadingSpreadsheets, setLoadingSpreadsheets] = useState(false);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [testRowConfirm, setTestRowConfirm] = useState<{
    rangeValue: string;
    testValues?: string[][];
  } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const spreadsheetOptions = useMemo<SearchableOption[]>(
    () =>
      spreadsheets.map((sheet) => ({
        value: sheet.id,
        label: sheet.name,
        keywords: sheet.id,
      })),
    [spreadsheets],
  );
  const sheetOptions = useMemo<SearchableOption[]>(
    () =>
      sheets.map((sheet) => ({
        value: sheet.title,
        label: sheet.title,
      })),
    [sheets],
  );

  // Embedded Google OAuth popup flow (similar to Facebook)
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (
        typeof event.data !== "object" ||
        !event.data ||
        (event.data.type !== "google_auth_success" &&
          event.data.type !== "google_auth_error")
      ) {
        return;
      }

      if (event.data.type === "google_auth_error") {
        toast.error(
          `Google connection failed: ${event.data.error ?? "Unknown error"}`,
        );
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
          const fallbackCredential = result.data.at(-1);
          if (fallbackCredential) {
            form.setValue("credentialId", fallbackCredential.id);
          }
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
      `${googleConnector.auth.oauthStartPath}?mode=popup&name=Google%20Sheets%20Account`,
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

  const { getValues, setValue } = form;
  const varName = form.watch("variableName") || "mySheets";
  const action = form.watch("action");
  const watchedCredentialId = form.watch("credentialId");
  const watchedSpreadsheetId = form.watch("spreadsheetId");
  const watchedSheetTitle = form.watch("sheetTitle");
  const watchedSelectedResponseName = form.watch("selectedResponseName");
  const effectiveResponseName =
    watchedSelectedResponseName ||
    activeResponseName ||
    allResponseNames[0] ||
    "";
  const currentSavedResponseFields =
    savedResponseFieldsByName[effectiveResponseName] ?? savedResponseFields;

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
        const current = getValues("spreadsheetId");
        if (current && !list.find((s) => s.id === current)) {
          setValue("spreadsheetId", "");
          setValue("sheetTitle", "");
          setSheets([]);
          setColumns([]);
        }
      })
      .catch(() => {
        toast.error("Failed to load spreadsheets from Google.");
        setSpreadsheets([]);
      })
      .finally(() => setLoadingSpreadsheets(false));
  }, [watchedCredentialId, getValues, setValue]);

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
        const current = getValues("sheetTitle");
        if (current && !list.find((s) => s.title === current)) {
          setValue("sheetTitle", "");
          setColumns([]);
        }
      })
      .catch(() => {
        toast.error("Failed to load sheets from this spreadsheet.");
        setSheets([]);
      })
      .finally(() => setLoadingSheets(false));
  }, [watchedCredentialId, watchedSpreadsheetId, getValues, setValue]);

  // Load columns when sheet changes
  useEffect(() => {
    if (!watchedCredentialId || !watchedSpreadsheetId || !watchedSheetTitle) {
      setColumns([]);
      return;
    }
    setLoadingColumns(true);
    fetchGoogleSheetColumns(
      watchedCredentialId,
      watchedSpreadsheetId,
      watchedSheetTitle,
    )
      .then((cols) => setColumns(cols))
      .catch(() => {
        toast.error("Failed to load header row from this sheet.");
        setColumns([]);
      })
      .finally(() => setLoadingColumns(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCredentialId, watchedSpreadsheetId, watchedSheetTitle]);

  const handleRefreshColumns = () => {
    if (!watchedCredentialId || !watchedSpreadsheetId || !watchedSheetTitle)
      return;
    setLoadingColumns(true);
    fetchGoogleSheetColumns(
      watchedCredentialId,
      watchedSpreadsheetId,
      watchedSheetTitle,
    )
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

  const handleSubmit = (values: GoogleSheetsFormValues) => {
    // Rely on values.range if user overrode it. Otherwise, default to the whole sheet Title allowing infinite columns without the A:Z cutoff.
    const isDefaultRange = !values.range || values.range.endsWith("!A:Z");
    const range =
      isDefaultRange && values.sheetTitle
        ? values.sheetTitle
        : values.range || "Sheet1";

    let finalValues = values.values;
    const submittedMappings = values.columnMappings || {};

    if (
      values.action === "append" &&
      columns.length > 0 &&
      Object.keys(submittedMappings).length > 0 &&
      currentSavedResponseFields.length > 0
    ) {
      const sourceKey = values.sourceVariable || "webhook";
      const row = columns.map((col) => {
        const key = submittedMappings[col];
        if (!key) return "";
        // Build a Handlebars template that references the LIVE incoming data,
        // NOT the saved design-time sample.
        if (sourceKey === "facebookLead") {
          return `{{${toTemplatePath(`${sourceKey}.fields`, key)}}}`;
        }
        return `{{${toTemplatePath(`${sourceKey}.body`, key)}}}`;
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
    const valid = await form.trigger([
      "credentialId",
      "spreadsheetId",
      "sheetTitle",
      "range",
    ]);
    if (!valid) {
      toast.error(
        "Please fix the highlighted fields before sending a test row.",
      );
      return;
    }

    const sheetTitle = form.getValues("sheetTitle");
    const rangeValue =
      form.getValues("range") ||
      (sheetTitle ? `${sheetTitle}!A:Z` : "Sheet1!A:Z");
    const currentMappings = form.getValues("columnMappings") ?? {};

    let testValues: string[][] | undefined;
    if (columns.length > 0 && Object.keys(currentMappings).length > 0) {
      const row = columns.map((col) => {
        const fieldKey = currentMappings[col];
        if (!fieldKey) return "";
        const field = currentSavedResponseFields.find(
          (f) => f.key === fieldKey,
        );
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

      toast.success(
        "Test row appended to Google Sheets. Check your sheet to verify.",
      );
    } catch {
      toast.error("Failed to send test row to Google Sheets.");
    }
  };

  const hasSavedResponseFields =
    currentSavedResponseFields.length > 0 && !!effectiveResponseName;
  return (
    <>
      <AlertDialog
        open={!!testRowConfirm}
        onOpenChange={(o) => {
          if (!o) setTestRowConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Append test row to sheet?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  This will write a real row to{" "}
                  <span className="font-medium">
                    {testRowConfirm?.rangeValue}
                  </span>
                  . This cannot be undone automatically.
                </p>
                {testRowConfirm?.testValues?.[0] && (
                  <div className="rounded-md border bg-muted/40 p-2 font-mono text-xs break-all">
                    {testRowConfirm.testValues[0].map((v, i) => (
                      <span
                        key={`${columns[i] ?? "column"}-${v}`}
                        className="mr-2"
                      >
                        {columns[i] ? `${columns[i]}: ` : ""}
                        <span className="text-primary">{v || "(empty)"}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTestRow}>
              Append row
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Google Sheets</DialogTitle>
            <DialogDescription>
              Choose a spreadsheet, choose a sheet, then map your data.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit, () => {
                toast.error(
                  "Please fix the highlighted fields before saving this Google Sheets node.",
                );
              })}
              className="mt-4 space-y-5"
            >
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:gap-6">
                {/* Left column: core configuration */}
                <div className="min-w-0 space-y-5">
                  <FormField
                    control={form.control}
                    name="variableName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Variable Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="mySheets"
                            {...field}
                            onChange={(e) => {
                              field.onChange(sanitizeVariableName(e.target.value));
                            }}
                          />
                        </FormControl>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Output reference:{" "}
                          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{`{{${varName || "mySheets"}}}`}</code>
                          . Spaces &amp; special characters are auto-replaced with underscores.
                        </span>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="credentialId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{googleConnector.credentialLabel}</FormLabel>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isLoading || !credentials?.length}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full min-w-0">
                                <SelectValue
                                  placeholder={
                                    googleConnector.credentialPlaceholder
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
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleConnectGoogle}
                            disabled={connectingGoogle}
                          >
                            {connectingGoogle
                              ? "Connecting..."
                              : googleConnector.auth.connectLabel}
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="action"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Action</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select action" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="append">➕ Add New Row</SelectItem>
                            <SelectItem value="read">🔎 Get Row(s)</SelectItem>
                            <SelectItem value="update">✏️ Update Row</SelectItem>
                            <SelectItem value="delete">🗑️ Delete Row</SelectItem>
                            <SelectItem value="clear">🧹 Clear Range</SelectItem>
                            <SelectItem value="create_sheet">📋 Create Sheet Tab</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="spreadsheetId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Spreadsheet</FormLabel>
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <SearchablePicker
                              value={field.value}
                              onChange={field.onChange}
                              options={spreadsheetOptions}
                              placeholder={
                                watchedCredentialId
                                  ? "Select spreadsheet"
                                  : "Connect Google first"
                              }
                              searchPlaceholder="Search spreadsheet..."
                              emptyLabel="No spreadsheets found"
                              disabled={!watchedCredentialId}
                              loading={loadingSpreadsheets}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={
                              loadingSpreadsheets || !watchedCredentialId
                            }
                            onClick={() => {
                              if (!watchedCredentialId) return;
                              setLoadingSpreadsheets(true);
                              fetchGoogleSpreadsheets(watchedCredentialId)
                                .then(setSpreadsheets)
                                .catch(() =>
                                  toast.error("Failed to refresh spreadsheets"),
                                )
                                .finally(() => setLoadingSpreadsheets(false));
                            }}
                          >
                            <RefreshCwIcon
                              className={cn(
                                "size-4",
                                loadingSpreadsheets && "animate-spin",
                              )}
                            />
                          </Button>
                        </div>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Search by spreadsheet name instead of scrolling long lists.
                        </span>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sheetTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sheet</FormLabel>
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <SearchablePicker
                              value={field.value}
                              onChange={field.onChange}
                              options={sheetOptions}
                              placeholder={
                                watchedSpreadsheetId
                                  ? "Select sheet"
                                  : "Select spreadsheet first"
                              }
                              searchPlaceholder="Search sheet..."
                              emptyLabel="No sheets found"
                              disabled={!watchedSpreadsheetId}
                              loading={loadingSheets}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={
                              loadingSheets ||
                              !watchedSpreadsheetId ||
                              !watchedCredentialId
                            }
                            onClick={() => {
                              if (!watchedCredentialId || !watchedSpreadsheetId)
                                return;
                              setLoadingSheets(true);
                              fetchGoogleSheets(
                                watchedCredentialId,
                                watchedSpreadsheetId,
                              )
                                .then(setSheets)
                                .catch(() =>
                                  toast.error("Failed to refresh sheets"),
                                )
                                .finally(() => setLoadingSheets(false));
                            }}
                          >
                            <RefreshCwIcon
                              className={cn(
                                "size-4",
                                loadingSheets && "animate-spin",
                              )}
                            />
                          </Button>
                        </div>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Search by sheet tab name when a spreadsheet has many tabs.
                        </span>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Right column: mapping & advanced controls */}
                <div className="min-w-0 space-y-5">
                  <FormField
                    control={form.control}
                    name="sourceVariable"
                    render={({ field }) => {
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
                              {upstreamSources.length > 0 ? (
                                upstreamSources.map((src) => (
                                  <SelectItem
                                    key={src.variableKey}
                                    value={src.variableKey}
                                  >
                                    {src.label}
                                  </SelectItem>
                                ))
                              ) : (
                                <>
                                  <SelectItem value="webhook">
                                    Webhook
                                  </SelectItem>
                                  <SelectItem value="facebookLead">
                                    Facebook Lead
                                  </SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          {upstreamSources.length === 0 && (
                            <span className="text-xs text-muted-foreground mt-1 block">
                              Connect a trigger node upstream to see sources.
                            </span>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  {allResponseNames.length > 0 && (
                    <FormField
                      control={form.control}
                      name="selectedResponseName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Saved response</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || activeResponseName || ""}
                          >
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {action === "append" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <FormLabel>Column mapping</FormLabel>
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
                          <RefreshCwIcon
                            className={`h-3 w-3 ${loadingColumns ? "animate-spin" : ""}`}
                          />
                          <span className="sr-only">Refresh Columns</span>
                        </Button>
                      </div>
                      {columns.length > 0 &&
                        Object.keys(columnMappings).length > 0 &&
                        (() => {
                          const unmapped = columns.filter(
                            (col) => !columnMappings[col],
                          );
                          return unmapped.length > 0 ? (
                            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                              {unmapped.length} column
                              {unmapped.length > 1 ? "s" : ""} will be written
                              as empty:{" "}
                              <span className="font-medium">
                                {unmapped.join(", ")}
                              </span>
                            </p>
                          ) : null;
                        })()}
                      <div className="border rounded-md p-3 max-h-72 overflow-auto space-y-2 bg-muted/40">
                        {loadingColumns && (
                          <p className="text-xs text-muted-foreground">
                            Loading columns...
                          </p>
                        )}
                        {!loadingColumns && columns.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Select a spreadsheet and sheet to load column
                            headers.
                          </p>
                        )}
                        {columns.map((col) => (
                          <FormField
                            key={col}
                            control={form.control}
                            name={`columnMappings.${col}` as const}
                            render={({ field }) => (
                              <FormItem className="space-y-1.5 rounded-md border bg-background/70 p-2">
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)] md:items-center">
                                  <FormLabel className="text-xs font-medium truncate">
                                    {col}
                                  </FormLabel>
                                  <FormControl>
                                    <Select
                                      value={field.value ?? ""}
                                      onValueChange={field.onChange}
                                      disabled={!hasSavedResponseFields}
                                    >
                                      <SelectTrigger className="w-full min-w-0">
                                        <SelectValue
                                          placeholder={
                                            hasSavedResponseFields
                                              ? "Choose field"
                                              : "No saved response fields"
                                          }
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {currentSavedResponseFields.map((f) => (
                                          <SelectItem key={f.key} value={f.key}>
                                            {f.label}
                                            {f.example ? ` - ${f.example}` : ""}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                </div>
                                {!hasSavedResponseFields && (
                                  <p className="text-[11px] text-muted-foreground">
                                    Capture and save a response in the upstream
                                    trigger node first to enable mapping.
                                  </p>
                                )}
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Update Row ── */}
                  {action === "update" && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="updateRowNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Row Number to Update</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="2  (row 1 is the header)"
                                {...field}
                                className="text-sm"
                              />
                            </FormControl>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              Row&nbsp;1 is typically the header row. You can also use a template like{" "}
                              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{`{{webhook.body.rowNumber}}`}</code>.
                            </span>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <FormLabel>Column values to update</FormLabel>
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
                          {loadingColumns && <p className="text-xs text-muted-foreground">Loading columns...</p>}
                          {!loadingColumns && columns.length === 0 && (
                            <p className="text-xs text-muted-foreground">Select a spreadsheet and sheet to load column headers.</p>
                          )}
                          {columns.map((col) => (
                            <FormField
                              key={col}
                              control={form.control}
                              name={`columnMappings.${col}` as const}
                              render={({ field }) => (
                                <FormItem className="space-y-1 rounded-md border bg-background/70 p-2">
                                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)] md:items-center">
                                    <FormLabel className="text-xs font-medium truncate">{col}</FormLabel>
                                    <FormControl>
                                      <Input
                                        className="h-8 w-full min-w-0 text-xs"
                                        value={field.value ?? ""}
                                        onChange={field.onChange}
                                        placeholder={`{{${varName || "source"}.${col.replace(/[^A-Za-z0-9_]/g, "_")}}}`}
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

                  {/* ── Delete Row ── */}
                  {action === "delete" && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="deleteRowNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Row Number to Delete</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="2  (row 1 is the header)"
                                {...field}
                                className="text-sm"
                              />
                            </FormControl>
                            <span className="mt-1 block text-xs text-amber-600 dark:text-amber-400">
                              ⚠️ This permanently deletes the entire row. Row&nbsp;1 is the header — avoid deleting it.
                            </span>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* ── Clear Range ── */}
                  {action === "clear" && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                      ⚠️ <strong>Clear Range</strong> erases all cell values in the configured range. Use the{" "}
                      <em>Manual Range Override</em> in Advanced settings to target a specific area like{" "}
                      <code className="rounded bg-amber-100 dark:bg-amber-900 px-1 font-mono">Sheet1!A2:Z</code>.
                    </div>
                  )}

                  {/* ── Create Sheet Tab ── */}
                  {action === "create_sheet" && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="newSheetName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Sheet Tab Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="My New Sheet"
                                {...field}
                                className="text-sm"
                              />
                            </FormControl>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              A new tab will be added to the selected spreadsheet with this name. You can also use a template like{" "}
                              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{`{{webhook.body.tabName}}`}</code>.
                            </span>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {action === "read" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <FormLabel>Find row where</FormLabel>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                          <FormField
                            control={form.control}
                            name="readFilter.column"
                            render={({ field }) => (
                              <Select
                                value={field.value ?? ""}
                                onValueChange={field.onChange}
                                disabled={columns.length === 0}
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={
                                      columns.length === 0
                                        ? "Load sheet first"
                                        : "Column"
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">— None —</SelectItem>
                                  {columns.map((col) => (
                                    <SelectItem key={col} value={col}>
                                      {col}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="readFilter.operator"
                            render={({ field }) => (
                              <Select
                                value={field.value ?? "equals"}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="equals">equals</SelectItem>
                                  <SelectItem value="contains">
                                    contains
                                  </SelectItem>
                                  <SelectItem value="starts_with">
                                    starts with
                                  </SelectItem>
                                  <SelectItem value="ends_with">
                                    ends with
                                  </SelectItem>
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
                            <RefreshCwIcon
                              className={`h-3 w-3 ${loadingColumns ? "animate-spin" : ""}`}
                            />
                            <span className="sr-only">Refresh Columns</span>
                          </Button>
                        </div>
                        <div className="border rounded-md p-3 max-h-60 overflow-auto space-y-2 bg-muted/40">
                          {loadingColumns && (
                            <p className="text-xs text-muted-foreground">
                              Loading columns...
                            </p>
                          )}
                          {!loadingColumns && columns.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              Select a spreadsheet and sheet to load column
                              headers.
                            </p>
                          )}
                          {columns.map((col) => (
                            <FormField
                              key={col}
                              control={form.control}
                              name={`readOutputMapping.${col}` as const}
                              render={({ field }) => (
                              <FormItem className="space-y-1 rounded-md border bg-background/70 p-2">
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)] md:items-center">
                                    <FormLabel className="text-xs font-medium truncate">
                                      {col}
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        className="h-8 w-full min-w-0 text-xs"
                                        value={field.value ?? ""}
                                        onChange={field.onChange}
                                        placeholder={col
                                          .replace(/[^A-Za-z0-9_]/g, "_")
                                          .toLowerCase()}
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

                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 text-muted-foreground w-full justify-start hover:bg-muted"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                      <Settings2Icon className="h-4 w-4" />
                      Advanced settings
                      {showAdvanced ? (
                        <ChevronUpIcon className="h-4 w-4 ml-auto" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4 ml-auto" />
                      )}
                    </Button>
                  </div>

                  {showAdvanced && (
                    <div className="space-y-4 pt-2 border-t mt-4 fadeIn border-t border-muted">
                      <FormField
                        control={form.control}
                        name="range"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Manual Range Override</FormLabel>
                            <FormControl>
                              <Input placeholder="Sheet1!A:Z" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {action === "append" && (
                        <FormField
                          control={form.control}
                          name="values"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Raw JSON values</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder={`[["{{${varName}.Email}}", "{{${varName}.FirstName}}"]]`}
                                  className="min-h-[96px] font-mono text-sm"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                {action === "append" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendTestRow}
                  >
                    Append test row
                  </Button>
                ) : (
                  <span />
                )}
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};
