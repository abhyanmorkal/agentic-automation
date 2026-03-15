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
  igUserId: z.string().min(1, "Instagram User ID is required"),
  imageUrl: z.string().url("Must be a valid URL"),
  caption: z.string().optional(),
});

export type InstagramFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: InstagramFormValues) => void;
  defaultValues?: Partial<InstagramFormValues>;
}

export const InstagramDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {
  const { data: credentials, isLoading } = useCredentialsByType(CredentialType.META_ACCESS_TOKEN);
  const form = useForm<InstagramFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName ?? "",
      credentialId: defaultValues.credentialId ?? "",
      igUserId: defaultValues.igUserId ?? "",
      imageUrl: defaultValues.imageUrl ?? "",
      caption: defaultValues.caption ?? "",
    },
  });

  useEffect(() => {
    if (open) form.reset({
      variableName: defaultValues.variableName ?? "",
      credentialId: defaultValues.credentialId ?? "",
      igUserId: defaultValues.igUserId ?? "",
      imageUrl: defaultValues.imageUrl ?? "",
      caption: defaultValues.caption ?? "",
    });
  }, [open, defaultValues, form]);

  const varName = form.watch("variableName") || "myInstagram";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Instagram Configuration</DialogTitle>
          <DialogDescription>Publish an image post to your Instagram Business account.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => { onSubmit(v); onOpenChange(false); })} className="space-y-6 mt-4">
            <FormField control={form.control} name="variableName" render={({ field }) => (
              <FormItem>
                <FormLabel>Variable Name</FormLabel>
                <FormControl><Input placeholder="myInstagram" {...field} /></FormControl>
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
                <FormDescription>Requires Instagram Business account connected to a Facebook Page.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="igUserId" render={({ field }) => (
              <FormItem>
                <FormLabel>Instagram User ID</FormLabel>
                <FormControl><Input placeholder="17841405793187218" {...field} /></FormControl>
                <FormDescription>From Meta Business Suite or Graph API Explorer.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="imageUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Image URL</FormLabel>
                <FormControl><Input placeholder="https://example.com/image.jpg or {{myDrive.webViewLink}}" {...field} /></FormControl>
                <FormDescription>Must be a publicly accessible image URL.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="caption" render={({ field }) => (
              <FormItem>
                <FormLabel>Caption (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="{{myOpenAi.text}} #agency #automation" className="min-h-[80px] font-mono text-sm" {...field} />
                </FormControl>
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
