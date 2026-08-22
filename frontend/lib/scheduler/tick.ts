import { isDue } from "./isDue";
import { listSchedules } from "./parseSchedule";
import { beginRun, endRun } from "./runGuard";
import { runSchedule } from "./runSchedule";
import { getRecord } from "./store";
import type { LastRunRecord } from "./types";

/**
 * Finds every enabled, due Scheduled Task and runs each in turn, one at a
 * time (sequential, not parallel — a v1 simplicity choice: a slow task can
 * delay another task's start within the same minute, but the next tick
 * still catches it, since the anti-overlap guard is per-task, not global).
 * A single task's error never aborts the loop (FR-010) — runSchedule()
 * itself never throws, but this loop stays defensive around it anyway.
 */
export async function runDueSchedules(): Promise<void> {
  const now = new Date();
  const schedules = await listSchedules();

  for (const schedule of schedules) {
    if (!schedule.enabled) continue;

    const lastRun = await getRecord<LastRunRecord>(`last-run/${schedule.id}`);
    if (!isDue(schedule, lastRun, now)) continue;

    if (!beginRun(schedule.id)) continue; // already running (manual trigger overlap)

    try {
      await runSchedule(schedule, "scheduled");
    } catch (err) {
      console.error(`[scheduler] unexpected error running task "${schedule.id}":`, err);
    } finally {
      endRun(schedule.id);
    }
  }
}
