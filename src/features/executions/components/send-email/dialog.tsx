"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/components/ui/button";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma";
import type { UpstreamReference } from "../../lib/upstream-references";
import { ReferencePicker } from "../reference-picker";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required")
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/),
  credentialId: z.string().min(1, "Credential is required"),
  from: z.string().email("Must be a valid email").optional().or(z.literal("")),
  to: z.string().min(1, "Recipient is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().optional(),
});

export type SendEmailFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SendEmailFormValues) => void;
  defaultValues?: Partial<SendEmailFormValues>;
  upstreamReferences?: UpstreamReference[];
}

export const SendEmailDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  upstreamReferences = [],
}: Props) => {
  const { data: credentials, isLoading } = useCredentialsByType(
    CredentialType.RESEND_API_KEY,
  );
  const form = useForm<SendEmailFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName ?? "",
      credentialId: defaultValues.credentialId ?? "",
      from: defaultValues.from ?? "",
      to: defaultValues.to ?? "",
      subject: defaultValues.subject ?? "",
      body: defaultValues.body ?? "",
    },
  });

  useEffect(() => {
    if (open)
      form.reset({
        variableName: defaultValues.variableName ?? "",
        credentialId: defaultValues.credentialId ?? "",
        from: defaultValues.from ?? "",
        to: defaultValues.to ?? "",
        subject: defaultValues.subject ?? "",
        body: defaultValues.body ?? "",
      });
  }, [open, defaultValues, form]);

  const varName = form.watch("variableName") || "myEmail";
  const insertIntoField = (
    fieldName: "from" | "to" | "subject" | "body",
    template: string,
  ) => {
    const currentValue = form.getValues(fieldName) ?? "";
    form.setValue(fieldName, `${currentValue}${template}`, {
      shouldDirty: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Email Configuration</DialogTitle>
          <DialogDescription>Send an email via Resend.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(
              (v) => {
                onSubmit(v);
                onOpenChange(false);
              },
              () => {
                toast.error(
                  "Please fix the highlighted fields before saving this Send Email node.",
                );
              },
            )}
            className="space-y-6 mt-4"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="myEmail" {...field} />
                  </FormControl>
                  <FormDescription>
                    Reference as {`{{${varName}.emailId}}`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="credentialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resend API Key</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoading || !credentials?.length}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select credential" />
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
                  <FormDescription>
                    Get your API key at resend.com/api-keys.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="from"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel>From (Optional)</FormLabel>
                    <ReferencePicker
                      references={upstreamReferences}
                      onInsert={(template) => insertIntoField("from", template)}
                    />
                  </div>
                  <FormControl>
                    <Input placeholder="team@yourdomain.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    Defaults to noreply@resend.dev on free plan.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel>To</FormLabel>
                    <ReferencePicker
                      references={upstreamReferences}
                      onInsert={(template) => insertIntoField("to", template)}
                    />
                  </div>
                  <FormControl>
                    <Input
                      placeholder="client@example.com or {{myVar.email}}"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel>Subject</FormLabel>
                    <ReferencePicker
                      references={upstreamReferences}
                      onInsert={(template) =>
                        insertIntoField("subject", template)
                      }
                    />
                  </div>
                  <FormControl>
                    <Input
                      placeholder="Your report is ready: {{myOpenAi.text}}"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel>Body (HTML)</FormLabel>
                    <ReferencePicker
                      references={upstreamReferences}
                      onInsert={(template) => insertIntoField("body", template)}
                    />
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="<p>{{myOpenAi.text}}</p>"
                      className="min-h-[100px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    HTML is supported. Use {`{{variables}}`} for dynamic
                    content.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
