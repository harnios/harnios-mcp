import { readSchedulerConfig } from "./config";
import type { ScheduleDefinition } from "./types";

/** A task's own timezone, falling back to the system-wide SCHEDULER_TIMEZONE default (FR-002). */
export function resolveTimezone(schedule: ScheduleDefinition): string {
  return schedule.timezone || readSchedulerConfig().timezone;
}
