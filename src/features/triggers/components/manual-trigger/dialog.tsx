"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { PlusIcon, Trash2Icon, InfoIcon } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  notes: z.string().optional(),
  testInputs: z.array(
    z.object({
      key: z
        .string()
        .regex(/^[A-Za-z_$][A-Za-z0-9_$.]*$/, {
          message: "Must start with a letter and contain only letters, numbers, _ or $",
        })
        .or(z.literal("")),
      value: z.string(),
    }),
  ).optional(),
});

export type ManualTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ManualTriggerFormValues) => void;
  defaultValues?: Partial<ManualTriggerFormValues>;
}

export const ManualTriggerDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<ManualTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: defaultValues.notes || "",
      testInputs: defaultValues.testInputs?.length
        ? defaultValues.testInputs
        : [{ key: "", value: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "testInputs",
  });

  useEffect(() => {
    if (open) {
      form.reset({
        notes: defaultValues.notes || "",
        testInputs: defaultValues.testInputs?.length
          ? defaultValues.testInputs
          : [{ key: "", value: "" }],
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: ManualTriggerFormValues) => {
    // Strip empty rows before saving
    const cleanInputs = (values.testInputs || []).filter(
      (row) => row.key.trim() !== "",
    );
    onSubmit({ ...values, testInputs: cleanInputs });
    onOpenChange(false);
  };

  const testInputs = form.watch("testInputs") || [];
  const configuredCount = testInputs.filter((r) => r.key.trim() !== "").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manual Trigger</DialogTitle>
          <DialogDescription>
            Define test data that gets injected into the workflow context when
            you click &quot;Execute workflow&quot;. Use these variables in any
            downstream node with{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">
              {"{{variableName}}"}
            </code>
            .
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 mt-2"
          >
            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workflow Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this workflow does, e.g. Routes incoming leads from Facebook to CRM and WhatsApp..."
                      className="min-h-[72px] resize-none text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional notes visible on the canvas node.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Test Inputs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium leading-none">
                    Test Input Data
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Injected into the workflow context on manual execution
                  </p>
                </div>
                {configuredCount > 0 && (
                  <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                    {configuredCount} field{configuredCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Info box */}
              <div className="flex gap-2 rounded-md border bg-muted/40 p-3">
                <InfoIcon className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Access these values in downstream nodes using{" "}
                  <code className="bg-background px-1 rounded">
                    {"{{key}}"}
                  </code>
                  . For example, a field named{" "}
                  <code className="bg-background px-1 rounded">leadName</code>{" "}
                  is referenced as{" "}
                  <code className="bg-background px-1 rounded">
                    {"{{leadName}}"}
                  </code>
                  .
                </p>
              </div>

              {/* Key-value rows */}
              <div className="space-y-2">
                {/* Header row */}
                <div className="grid grid-cols-[1fr_1fr_32px] gap-2 px-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Variable Name
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Test Value
                  </span>
                  <span />
                </div>

                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-[1fr_1fr_32px] gap-2 items-start"
                  >
                    <FormField
                      control={form.control}
                      name={`testInputs.${index}.key`}
                      render={({ field: f }) => (
                        <FormItem className="space-y-0">
                          <FormControl>
                            <Input
                              placeholder="leadName"
                              className="h-8 text-sm font-mono"
                              {...f}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`testInputs.${index}.value`}
                      render={({ field: f }) => (
                        <FormItem className="space-y-0">
                          <FormControl>
                            <Input
                              placeholder="Rahul Sharma"
                              className="h-8 text-sm"
                              {...f}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => append({ key: "", value: "" })}
              >
                <PlusIcon className="size-3.5 mr-1.5" />
                Add field
              </Button>
            </div>

            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
