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
  action: z.enum(["list", "create_folder"]),
  folderId: z.string().optional(),
  folderName: z.string().optional(),
});

export type GoogleDriveFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleDriveFormValues) => void;
  defaultValues?: Partial<GoogleDriveFormValues>;
}

export const GoogleDriveDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {
  const { data: credentials, isLoading } = useCredentialsByType(CredentialType.GOOGLE_OAUTH);
  const form = useForm<GoogleDriveFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName ?? "",
      credentialId: defaultValues.credentialId ?? "",
      action: defaultValues.action ?? "list",
      folderId: defaultValues.folderId ?? "",
      folderName: defaultValues.folderName ?? "",
    },
  });

  useEffect(() => {
    if (open) form.reset({
      variableName: defaultValues.variableName ?? "",
      credentialId: defaultValues.credentialId ?? "",
      action: defaultValues.action ?? "list",
      folderId: defaultValues.folderId ?? "",
      folderName: defaultValues.folderName ?? "",
    });
  }, [open, defaultValues, form]);

  const varName = form.watch("variableName") || "myDrive";
  const action = form.watch("action");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Google Drive Configuration</DialogTitle>
          <DialogDescription>List files or create folders in Google Drive.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => { onSubmit(v); onOpenChange(false); })} className="space-y-6 mt-4">
            <FormField control={form.control} name="variableName" render={({ field }) => (
              <FormItem>
                <FormLabel>Variable Name</FormLabel>
                <FormControl><Input placeholder="myDrive" {...field} /></FormControl>
                <FormDescription>Reference as {`{{${varName}.files}}`} (list) or {`{{${varName}.folderId}}`} (create)</FormDescription>
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
                    <SelectItem value="list">List Files</SelectItem>
                    <SelectItem value="create_folder">Create Folder</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="folderId" render={({ field }) => (
              <FormItem>
                <FormLabel>Folder ID (Optional)</FormLabel>
                <FormControl><Input placeholder="root or {{myDrive.folderId}}" {...field} /></FormControl>
                <FormDescription>Leave empty to use root. For list: the folder to list. For create: the parent folder.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            {action === "create_folder" && (
              <FormField control={form.control} name="folderName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Folder Name</FormLabel>
                  <FormControl><Input placeholder="Reports {{schedule.triggeredAt}}" {...field} /></FormControl>
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
