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
  pageId: z.string().min(1, "Page ID is required"),
  message: z.string().min(1, "Message is required"),
  link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export type FacebookPageFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FacebookPageFormValues) => void;
  defaultValues?: Partial<FacebookPageFormValues>;
}

export const FacebookPageDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {
  const { data: credentials, isLoading } = useCredentialsByType(CredentialType.META_ACCESS_TOKEN);
  const form = useForm<FacebookPageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName ?? "",
      credentialId: defaultValues.credentialId ?? "",
      pageId: defaultValues.pageId ?? "",
      message: defaultValues.message ?? "",
      link: defaultValues.link ?? "",
    },
  });

  useEffect(() => {
    if (open) form.reset({
      variableName: defaultValues.variableName ?? "",
      credentialId: defaultValues.credentialId ?? "",
      pageId: defaultValues.pageId ?? "",
      message: defaultValues.message ?? "",
      link: defaultValues.link ?? "",
    });
  }, [open, defaultValues, form]);

  const varName = form.watch("variableName") || "myFacebook";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Facebook Page Configuration</DialogTitle>
          <DialogDescription>Post to a Facebook Page via Meta Graph API.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => { onSubmit(v); onOpenChange(false); })} className="space-y-6 mt-4">
            <FormField control={form.control} name="variableName" render={({ field }) => (
              <FormItem>
                <FormLabel>Variable Name</FormLabel>
                <FormControl><Input placeholder="myFacebook" {...field} /></FormControl>
                <FormDescription>Reference as {`{{${varName}.postId}}`}</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="credentialId" render={({ field }) => (
              <FormItem>
                <FormLabel>Meta Access Token</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || !credentials?.length}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select credential" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {credentials?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormDescription>Use a Page Access Token (not a User token) for posting to pages.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="pageId" render={({ field }) => (
              <FormItem>
                <FormLabel>Page ID</FormLabel>
                <FormControl><Input placeholder="123456789012345" {...field} /></FormControl>
                <FormDescription>From the Facebook Page → About section or Graph API Explorer.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="message" render={({ field }) => (
              <FormItem>
                <FormLabel>Message</FormLabel>
                <FormControl>
                  <Textarea placeholder="{{myOpenAi.text}}" className="min-h-[80px] font-mono text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="link" render={({ field }) => (
              <FormItem>
                <FormLabel>Link (Optional)</FormLabel>
                <FormControl><Input placeholder="https://yoursite.com/article" {...field} /></FormControl>
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
