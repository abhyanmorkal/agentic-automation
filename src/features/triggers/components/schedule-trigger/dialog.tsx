"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { format } from "date-fns";
import { ClockIcon, CalendarIcon, InfoIcon, CheckIcon } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getNextRuns, validateCron } from "@/inngest/cron-utils";

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: "Every minute",        cron: "* * * * *",   group: "frequent" },
  { label: "Every 5 minutes",     cron: "*/5 * * * *", group: "frequent" },
  { label: "Every 15 minutes",    cron: "*/15 * * * *",group: "frequent" },
  { label: "Every 30 minutes",    cron: "*/30 * * * *",group: "frequent" },
  { label: "Every hour",          cron: "0 * * * *",   group: "hourly"   },
  { label: "Every 6 hours",       cron: "0 */6 * * *", group: "hourly"   },
  { label: "Every day at 9 AM",   cron: "0 9 * * *",   group: "daily"    },
  { label: "Every day at 12 PM",  cron: "0 12 * * *",  group: "daily"    },
  { label: "Every day at 6 PM",   cron: "0 18 * * *",  group: "daily"    },
  { label: "Every weekday 9 AM",  cron: "0 9 * * 1-5", group: "weekly"   },
  { label: "Every Monday 9 AM",   cron: "0 9 * * 1",   group: "weekly"   },
  { label: "Every Sunday 8 AM",   cron: "0 8 * * 0",   group: "weekly"   },
  { label: "1st of month 9 AM",   cron: "0 9 1 * *",   group: "monthly"  },
] as const;

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
  cronExpression: z
    .string()
    .min(1, "Cron expression is required")
    .refine((val) => validateCron(val) === null, {
      message: "Invalid cron expression",
    }),
  notes: z.string().optional(),
});

export type ScheduleTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ScheduleTriggerFormValues) => void;
  defaultValues?: Partial<ScheduleTriggerFormValues>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ScheduleTriggerDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<ScheduleTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cronExpression: defaultValues.cronExpression || "0 9 * * *",
      notes: defaultValues.notes || "",
    },
  });

  const [nextRuns, setNextRuns] = useState<Date[]>([]);
  const [cronError, setCronError] = useState<string | null>(null);

  const cronValue = form.watch("cronExpression");

  useEffect(() => {
    if (open) {
      form.reset({
        cronExpression: defaultValues.cronExpression || "0 9 * * *",
        notes: defaultValues.notes || "",
      });
    }
  }, [open, defaultValues, form]);

  // Live preview of next runs
  useEffect(() => {
    const err = validateCron(cronValue || "");
    setCronError(err);
    if (!err && cronValue) {
      setNextRuns(getNextRuns(cronValue, 5));
    } else {
      setNextRuns([]);
    }
  }, [cronValue]);

  const selectedPreset = PRESETS.find((p) => p.cron === cronValue);

  const handlePreset = (cron: string) => {
    form.setValue("cronExpression", cron, { shouldValidate: true });
  };

  const handleSubmit = (values: ScheduleTriggerFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ClockIcon className="size-5 text-primary" />
            <DialogTitle>Schedule Trigger</DialogTitle>
          </div>
          <DialogDescription>
            Run this workflow automatically on a schedule. All times are in{" "}
            <strong>UTC</strong>. IST = UTC + 5:30.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5 mt-1"
          >
            {/* Preset grid */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Quick Presets</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((preset) => {
                  const isSelected = selectedPreset?.cron === preset.cron;
                  return (
                    <button
                      key={preset.cron}
                      type="button"
                      onClick={() => handlePreset(preset.cron)}
                      className={`
                        inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium
                        transition-colors cursor-pointer
                        ${isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-muted"
                        }
                      `}
                    >
                      {isSelected && <CheckIcon className="size-3" />}
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom cron input */}
            <FormField
              control={form.control}
              name="cronExpression"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cron Expression</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0 9 * * *"
                      className="font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Format:{" "}
                    <code className="bg-muted px-1 rounded text-xs">
                      minute hour day-of-month month day-of-week
                    </code>
                    {" · "}
                    <a
                      href="https://crontab.guru"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      crontab.guru
                    </a>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Next runs preview */}
            {nextRuns.length > 0 && (
              <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="size-3.5 text-muted-foreground" />
                  <p className="text-xs font-medium">Next 5 runs (UTC)</p>
                </div>
                <div className="space-y-1">
                  {nextRuns.map((date, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                      <code className="text-xs bg-background border px-1.5 py-0.5 rounded">
                        {format(date, "EEE, dd MMM yyyy · HH:mm")} UTC
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* IST helper */}
            <div className="flex gap-2 rounded-md border bg-muted/40 p-3">
              <InfoIcon className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  <strong>IST users:</strong> subtract 5:30 from your local time.
                  9:00 AM IST = <code className="bg-background px-1 rounded">30 3 * * *</code>,{" "}
                  6:00 PM IST = <code className="bg-background px-1 rounded">30 12 * * *</code>
                </p>
                <p>Available in downstream nodes as{" "}
                  <code className="bg-background px-1 rounded">{"{{schedule.triggeredAt}}"}</code>
                </p>
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Send daily lead report every morning"
                      className="text-sm"
                      {...field}
                    />
                  </FormControl>
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
