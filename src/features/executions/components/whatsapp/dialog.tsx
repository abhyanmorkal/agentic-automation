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
  phoneNumberId: z.string().min(1, "Phone Number ID is required"),
  to: z.string().min(1, "Recipient number is required"),
  message: z.string().min(1, "Message is required"),
});

export type WhatsAppFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: WhatsAppFormValues) => void;
  defaultValues?: Partial<WhatsAppFormValues>;
}

export const WhatsAppDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {
  const { data: credentials, isLoading } = useCredentialsByType(CredentialType.META_ACCESS_TOKEN);
  const form = useForm<WhatsAppFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName ?? "",
      credentialId: defaultValues.credentialId ?? "",
      phoneNumberId: defaultValues.phoneNumberId ?? "",
      to: defaultValues.to ?? "",
      message: defaultValues.message ?? "",
    },
  });

  useEffect(() => {
    if (open) form.reset({
      variableName: defaultValues.variableName ?? "",
      credentialId: defaultValues.credentialId ?? "",
      phoneNumberId: defaultValues.phoneNumberId ?? "",
      to: defaultValues.to ?? "",
      message: defaultValues.message ?? "",
    });
  }, [open, defaultValues, form]);

  const varName = form.watch("variableName") || "myWhatsApp";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>WhatsApp Business Configuration</DialogTitle>
          <DialogDescription>Send a WhatsApp message via Meta Business API.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => { onSubmit(v); onOpenChange(false); })} className="space-y-6 mt-4">
            <FormField control={form.control} name="variableName" render={({ field }) => (
              <FormItem>
                <FormLabel>Variable Name</FormLabel>
                <FormControl><Input placeholder="myWhatsApp" {...field} /></FormControl>
                <FormDescription>Reference as {`{{${varName}.messageId}}`}</FormDescription>
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
                <FormDescription>Get from Meta Developer Portal → WhatsApp → API Setup.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="phoneNumberId" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number ID</FormLabel>
                <FormControl><Input placeholder="123456789012345" {...field} /></FormControl>
                <FormDescription>From Meta Developer Portal → WhatsApp → API Setup.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="to" render={({ field }) => (
              <FormItem>
                <FormLabel>To (with country code)</FormLabel>
                <FormControl><Input placeholder="+911234567890 or {{myVar.phone}}" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="message" render={({ field }) => (
              <FormItem>
                <FormLabel>Message</FormLabel>
                <FormControl>
                  <Textarea placeholder="Hello! {{myOpenAi.text}}" className="min-h-[80px] font-mono text-sm" {...field} />
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
