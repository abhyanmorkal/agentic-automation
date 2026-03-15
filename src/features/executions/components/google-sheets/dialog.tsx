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
import { useEffect } from "react";
import z from "zod";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma";

const formSchema = z.object({
  variableName: z.string().min(1, "Variable name is required").regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/),
  credentialId: z.string().min(1, "Credential is required"),
  spreadsheetId: z.string().min(1, "Spreadsheet ID is required"),
  range: z.string().min(1, "Range is required"),
  action: z.enum(["append", "read"]),
  values: z.string().optional(),
});

export type GoogleSheetsFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleSheetsFormValues) => void;
  defaultValues?: Partial<GoogleSheetsFormValues>;
}

export const GoogleSheetsDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {
  const { data: credentials, isLoading } = useCredentialsByType(CredentialType.GOOGLE_OAUTH);
  const form = useForm<GoogleSheetsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName ?? "",
      credentialId: defaultValues.credentialId ?? "",
      spreadsheetId: defaultValues.spreadsheetId ?? "",
      range: defaultValues.range ?? "Sheet1!A:Z",
      action: defaultValues.action ?? "append",
      values: defaultValues.values ?? '[["Value 1", "Value 2"]]',
    },
  });

  useEffect(() => {
    if (open) form.reset({
      variableName: defaultValues.variableName ?? "",
      credentialId: defaultValues.credentialId ?? "",
      spreadsheetId: defaultValues.spreadsheetId ?? "",
      range: defaultValues.range ?? "Sheet1!A:Z",
      action: defaultValues.action ?? "append",
      values: defaultValues.values ?? '[["Value 1", "Value 2"]]',
    });
  }, [open, defaultValues, form]);

  const varName = form.watch("variableName") || "mySheets";
  const action = form.watch("action");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Google Sheets Configuration</DialogTitle>
          <DialogDescription>Read or append rows in a Google Spreadsheet.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => { onSubmit(v); onOpenChange(false); })} className="space-y-6 mt-4">
            <FormField control={form.control} name="variableName" render={({ field }) => (
              <FormItem>
                <FormLabel>Variable Name</FormLabel>
                <FormControl><Input placeholder="mySheets" {...field} /></FormControl>
                <FormDescription>Reference as {`{{${varName}.values}}`} (read) or {`{{${varName}.updatedRows}}`} (append)</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="credentialId" render={({ field }) => (
              <FormItem>
                <FormLabel>Google Account</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || !credentials?.length}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select connected account" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {credentials?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="action" render={({ field }) => (
              <FormItem>
                <FormLabel>Action</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="append">Append Row</SelectItem>
                    <SelectItem value="read">Read Range</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="spreadsheetId" render={({ field }) => (
              <FormItem>
                <FormLabel>Spreadsheet ID</FormLabel>
                <FormControl><Input placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" {...field} /></FormControl>
                <FormDescription>From the spreadsheet URL.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="range" render={({ field }) => (
              <FormItem>
                <FormLabel>Range</FormLabel>
                <FormControl><Input placeholder="Sheet1!A:Z" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {action === "append" && (
              <FormField control={form.control} name="values" render={({ field }) => (
                <FormItem>
                  <FormLabel>Values (JSON 2D array)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`[["{{myOpenAi.text}}", "{{schedule.triggeredAt}}"]]`}
                      className="min-h-[80px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Each inner array is a row. Supports {`{{variables}}`}.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <DialogFooter><Button type="submit">Save</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
