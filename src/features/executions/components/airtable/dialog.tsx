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
  baseId: z.string().min(1, "Base ID is required"),
  tableId: z.string().min(1, "Table ID/name is required"),
  fields: z.string().optional(),
});

export type AirtableFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AirtableFormValues) => void;
  defaultValues?: Partial<AirtableFormValues>;
}

export const AirtableDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {
  const { data: credentials, isLoading } = useCredentialsByType(CredentialType.AIRTABLE_API_KEY);
  const form = useForm<AirtableFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName ?? "",
      credentialId: defaultValues.credentialId ?? "",
      baseId: defaultValues.baseId ?? "",
      tableId: defaultValues.tableId ?? "",
      fields: defaultValues.fields ?? "{}",
    },
  });

  useEffect(() => {
    if (open) form.reset({
      variableName: defaultValues.variableName ?? "",
      credentialId: defaultValues.credentialId ?? "",
      baseId: defaultValues.baseId ?? "",
      tableId: defaultValues.tableId ?? "",
      fields: defaultValues.fields ?? "{}",
    });
  }, [open, defaultValues, form]);

  const varName = form.watch("variableName") || "myAirtable";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Airtable Configuration</DialogTitle>
          <DialogDescription>Create a record in an Airtable base.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => { onSubmit(v); onOpenChange(false); })} className="space-y-6 mt-4">
            <FormField control={form.control} name="variableName" render={({ field }) => (
              <FormItem>
                <FormLabel>Variable Name</FormLabel>
                <FormControl><Input placeholder="myAirtable" {...field} /></FormControl>
                <FormDescription>Reference as {`{{${varName}.recordId}}`}</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="credentialId" render={({ field }) => (
              <FormItem>
                <FormLabel>Airtable API Key</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || !credentials?.length}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select credential" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {credentials?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormDescription>Create a personal access token at airtable.com/create/tokens.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="baseId" render={({ field }) => (
              <FormItem>
                <FormLabel>Base ID</FormLabel>
                <FormControl><Input placeholder="appXXXXXXXXXXXXXX" {...field} /></FormControl>
                <FormDescription>Found in the Airtable API docs or base URL.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="tableId" render={({ field }) => (
              <FormItem>
                <FormLabel>Table ID or Name</FormLabel>
                <FormControl><Input placeholder="tblXXXXXXXXXXXXXX or Leads" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="fields" render={({ field }) => (
              <FormItem>
                <FormLabel>Fields (JSON)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={`{"Name": "{{myOpenAi.text}}", "Status": "New"}`}
                    className="min-h-[100px] font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription>JSON object mapping field names to values. Supports {`{{variables}}`}.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter><Button type="submit">Save</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
