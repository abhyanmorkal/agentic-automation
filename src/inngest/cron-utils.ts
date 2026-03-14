import { CronExpressionParser } from "cron-parser";

/**
 * Returns true if the given cron expression matches the current UTC minute.
 * Used by the schedule dispatcher to decide which workflows to fire.
 */
export function cronMatchesNow(expression: string): boolean {
  try {
    const now = new Date();
    // Set seconds/ms to 0 so we compare at minute granularity
    now.setSeconds(0, 0);

    const interval = CronExpressionParser.parse(expression, { utc: true });
    const prev = interval.prev().toDate();
    prev.setSeconds(0, 0);

    return prev.getTime() === now.getTime();
  } catch {
    return false;
  }
}

/**
 * Returns the next N scheduled run times for a cron expression.
 */
export function getNextRuns(expression: string, count = 5): Date[] {
  try {
    const interval = CronExpressionParser.parse(expression, { utc: true });
    const runs: Date[] = [];
    for (let i = 0; i < count; i++) {
      runs.push(interval.next().toDate());
    }
    return runs;
  } catch {
    return [];
  }
}

/**
 * Validates a cron expression. Returns null if valid, error message if invalid.
 */
export function validateCron(expression: string): string | null {
  try {
    CronExpressionParser.parse(expression, { utc: true });
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Invalid cron expression";
  }
}
