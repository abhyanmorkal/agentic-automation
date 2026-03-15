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
  databaseId: z.string().min(1, "Database ID is required"),
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
});

export type NotionFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: NotionFormValues) => void;
  defaultValues?: Partial<NotionFormValues>;
}

export const NotionDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {
  const { data: credentials, isLoading } = useCredentialsByType(CredentialType.NOTION_API_KEY);
  const form = useForm<NotionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName ?? "",
      credentialId: defaultValues.credentialId ?? "",
      databaseId: defaultValues.databaseId ?? "",
      title: defaultValues.title ?? "",
      content: defaultValues.content ?? "",
    },
  });

  useEffect(() => {
    if (open) form.reset({
      variableName: defaultValues.variableName ?? "",
      credentialId: defaultValues.credentialId ?? "",
      databaseId: defaultValues.databaseId ?? "",
      title: defaultValues.title ?? "",
      content: defaultValues.content ?? "",
    });
  }, [open, defaultValues, form]);

  const varName = form.watch("variableName") || "myNotion";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notion Configuration</DialogTitle>
          <DialogDescription>Create a page in a Notion database.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => { onSubmit(v); onOpenChange(false); })} className="space-y-6 mt-4">
            <FormField control={form.control} name="variableName" render={({ field }) => (
              <FormItem>
                <FormLabel>Variable Name</FormLabel>
                <FormControl><Input placeholder="myNotion" {...field} /></FormControl>
                <FormDescription>Reference as {`{{${varName}.pageId}}`}</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="credentialId" render={({ field }) => (
              <FormItem>
                <FormLabel>Notion API Key</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || !credentials?.length}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select credential" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {credentials?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormDescription>Create an integration at notion.so/my-integrations.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="databaseId" render={({ field }) => (
              <FormItem>
                <FormLabel>Database ID</FormLabel>
                <FormControl><Input placeholder="abc123def456..." {...field} /></FormControl>
                <FormDescription>Found in the database URL. Share the database with your integration first.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Page Title</FormLabel>
                <FormControl><Input placeholder="New entry: {{myOpenAi.text}}" {...field} /></FormControl>
                <FormDescription>Supports {`{{variables}}`}.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="content" render={({ field }) => (
              <FormItem>
                <FormLabel>Content (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="{{myOpenAi.text}}" className="min-h-[80px] font-mono text-sm" {...field} />
                </FormControl>
                <FormDescription>Added as a paragraph block below the title.</FormDescription>
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
