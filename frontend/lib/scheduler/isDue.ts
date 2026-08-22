import { CronExpressionParser } from "cron-parser";
import { resolveTimezone } from "./timezone";
import type { LastRunRecord, ScheduleDefinition } from "./types";

/**
 * A task with no prior run is due only at its first FUTURE occurrence, never
 * retroactively at creation time (spec.md Edge Cases, research.md §8) — a
 * schedule created mid-afternoon for "every day at 9am" shouldn't fire
 * immediately just because 9am already passed today.
 *
 * Implemented as: is the cron's next occurrence strictly after the
 * reference point (the last run, or "now" if never run) at or before "now"?
 * Using "now" as the reference for a never-run task means its next
 * occurrence is by construction in the future, so it correctly reports not
 * due yet.
 */
export function isDue(schedule: ScheduleDefinition, lastRun: LastRunRecord | undefined, now: Date): boolean {
  const referenceDate = lastRun ? new Date(lastRun.lastRunAt) : now;

  let next: Date;
  try {
    const interval = CronExpressionParser.parse(schedule.cron, {
      currentDate: referenceDate,
      tz: resolveTimezone(schedule),
    });
    next = interval.next().toDate();
  } catch {
    // Malformed cron — treated as never due, not an error that aborts the
    // tick (spec.md Edge Cases: a broken schedule is skipped, not fatal).
    return false;
  }

  return next.getTime() <= now.getTime();
}
