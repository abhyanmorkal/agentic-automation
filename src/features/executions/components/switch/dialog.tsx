"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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

const switchCaseSchema = z.object({
  label: z.string().optional(),
  value: z.string().optional(),
});

const formSchema = z.object({
  variableName: z
    .string()
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores",
    })
    .optional()
    .or(z.literal("")),
  sourceValue: z.string().min(1, { message: "Source value is required" }),
  cases: z
    .array(switchCaseSchema)
    .min(1, { message: "Add at least one case" })
    .max(5, { message: "Use up to 5 cases in this first version" }),
});

export type SwitchFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SwitchFormValues) => void;
  defaultValues?: Partial<SwitchFormValues>;
}

const defaultCases = [
  { label: "Case 1", value: "" },
  { label: "Case 2", value: "" },
];

export function SwitchDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) {
  const form = useForm<SwitchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      sourceValue: defaultValues.sourceValue || "",
      cases:
        defaultValues.cases && defaultValues.cases.length > 0
          ? defaultValues.cases
          : defaultCases,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "cases",
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        sourceValue: defaultValues.sourceValue || "",
        cases:
          defaultValues.cases && defaultValues.cases.length > 0
            ? defaultValues.cases
            : defaultCases,
      });
    }
  }, [defaultValues, form, open]);

  const handleSubmit = (values: SwitchFormValues) => {
    const cleanedCases = values.cases
      .map((item, index) => ({
        label: item.label?.trim() || `Case ${index + 1}`,
        value: item.value?.trim() || "",
      }))
      .filter((item) => item.value.length > 0);

    onSubmit({
      ...values,
      variableName: values.variableName || undefined,
      cases: cleanedCases,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Switch</DialogTitle>
          <DialogDescription>
            Route the workflow to a matching case. If nothing matches, it uses
            the default branch.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="mt-4 space-y-6"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="switchResult" {...field} />
                  </FormControl>
                  <FormDescription>
                    Optional. Save the selected branch result for downstream
                    nodes.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sourceValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Value</FormLabel>
                  <FormControl>
                    <Input placeholder="{{lead.status}}" {...field} />
                  </FormControl>
                  <FormDescription>
                    Template expression to evaluate before matching cases.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Cases</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    First matching case wins. Default branch is always
                    available.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ label: `Case ${fields.length + 1}`, value: "" })
                  }
                  disabled={fields.length >= 5}
                >
                  <PlusIcon className="size-3.5 mr-1.5" />
                  Add case
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-[1fr_1fr_32px] gap-2 items-start"
                  >
                    <FormField
                      control={form.control}
                      name={`cases.${index}.label`}
                      render={({ field: currentField }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Case Label</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={`Case ${index + 1}`}
                              {...currentField}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`cases.${index}.value`}
                      render={({ field: currentField }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Match Value</FormLabel>
                          <FormControl>
                            <Input placeholder="qualified" {...currentField} />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 mt-6 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
