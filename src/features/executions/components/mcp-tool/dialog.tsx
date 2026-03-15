"use client";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import z from "zod";

const formSchema = z.object({
  variableName: z.string().min(1, "Variable name is required").regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/),
  serverUrl: z.string().url("Must be a valid URL"),
  toolName: z.string().min(1, "Tool name is required"),
  arguments: z.string().optional(),
  authHeader: z.string().optional(),
});

export type McpToolFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: McpToolFormValues) => void;
  defaultValues?: Partial<McpToolFormValues>;
}

export const McpToolDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {
  const form = useForm<McpToolFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName ?? "",
      serverUrl: defaultValues.serverUrl ?? "",
      toolName: defaultValues.toolName ?? "",
      arguments: defaultValues.arguments ?? "{}",
      authHeader: defaultValues.authHeader ?? "",
    },
  });

  useEffect(() => {
    if (open) form.reset({
      variableName: defaultValues.variableName ?? "",
      serverUrl: defaultValues.serverUrl ?? "",
      toolName: defaultValues.toolName ?? "",
      arguments: defaultValues.arguments ?? "{}",
      authHeader: defaultValues.authHeader ?? "",
    });
  }, [open, defaultValues, form]);

  const varName = form.watch("variableName") || "myMcp";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>MCP Tool Configuration</DialogTitle>
          <DialogDescription>
            Connect to any MCP server and call one of its tools. Browse available servers at{" "}
            <a href="https://glama.ai/mcp/servers" target="_blank" rel="noopener noreferrer" className="underline">
              glama.ai/mcp/servers
            </a>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => { onSubmit(v); onOpenChange(false); })} className="space-y-6 mt-4">
            <FormField control={form.control} name="variableName" render={({ field }) => (
              <FormItem>
                <FormLabel>Variable Name</FormLabel>
                <FormControl><Input placeholder="myMcp" {...field} /></FormControl>
                <FormDescription>Reference as {`{{${varName}.result}}`}</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="serverUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>MCP Server URL</FormLabel>
                <FormControl><Input placeholder="https://mcp.example.com/mcp" {...field} /></FormControl>
                <FormDescription>HTTP/HTTPS endpoint of the MCP server (Streamable HTTP transport).</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="toolName" render={({ field }) => (
              <FormItem>
                <FormLabel>Tool Name</FormLabel>
                <FormControl><Input placeholder="create_issue, send_message, search..." {...field} /></FormControl>
                <FormDescription>The exact tool name exposed by the MCP server.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="arguments" render={({ field }) => (
              <FormItem>
                <FormLabel>Arguments (JSON)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={`{"title": "{{myOpenAi.text}}", "repo": "org/repo"}`}
                    className="min-h-[100px] font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription>JSON object. Supports {`{{variables}}`} templating.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="authHeader" render={({ field }) => (
              <FormItem>
                <FormLabel>Auth Header (Optional)</FormLabel>
                <FormControl><Input placeholder="Authorization: Bearer your-token" {...field} /></FormControl>
                <FormDescription>Format: HeaderName: value. Added to every request to the MCP server.</FormDescription>
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
