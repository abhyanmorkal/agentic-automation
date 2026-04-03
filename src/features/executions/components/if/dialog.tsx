"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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

const formSchema = z.object({
  variableName: z
    .string()
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores",
    })
    .optional()
    .or(z.literal("")),
  leftValue: z.string().min(1, { message: "Left value is required" }),
  operator: z.enum([
    "equals",
    "not_equals",
    "contains",
    "greater_than",
    "less_than",
    "is_truthy",
    "is_falsy",
  ]),
  rightValue: z.string().optional(),
});

export type IfFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: IfFormValues) => void;
  defaultValues?: Partial<IfFormValues>;
}

export function IfDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) {
  const form = useForm<IfFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      leftValue: defaultValues.leftValue || "",
      operator: defaultValues.operator || "equals",
      rightValue: defaultValues.rightValue || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        leftValue: defaultValues.leftValue || "",
        operator: defaultValues.operator || "equals",
        rightValue: defaultValues.rightValue || "",
      });
    }
  }, [defaultValues, form, open]);

  const operator = form.watch("operator");
  const needsRightValue = !["is_truthy", "is_falsy"].includes(operator);

  const handleSubmit = (values: IfFormValues) => {
    onSubmit({
      ...values,
      variableName: values.variableName || undefined,
      rightValue: needsRightValue ? values.rightValue : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>IF</DialogTitle>
          <DialogDescription>
            Branch the workflow based on a comparison or truthy check.
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
                    <Input placeholder="ifResult" {...field} />
                  </FormControl>
                  <FormDescription>
                    Optional. Save the branch result for downstream nodes.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="leftValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Left Value</FormLabel>
                  <FormControl>
                    <Input placeholder="{{lead.email}}" {...field} />
                  </FormControl>
                  <FormDescription>
                    Supports templates like {"{{lead.email}}"} or{" "}
                    {"{{$node.nodeId.output}}"}.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="operator"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operator</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an operator" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="not_equals">Does not equal</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="greater_than">Greater than</SelectItem>
                      <SelectItem value="less_than">Less than</SelectItem>
                      <SelectItem value="is_truthy">Is truthy</SelectItem>
                      <SelectItem value="is_falsy">Is falsy</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {needsRightValue ? (
              <FormField
                control={form.control}
                name="rightValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Right Value</FormLabel>
                    <FormControl>
                      <Input placeholder="vip" {...field} />
                    </FormControl>
                    <FormDescription>
                      Compared after template resolution.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
