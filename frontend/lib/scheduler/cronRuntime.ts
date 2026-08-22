import { schedule, type ScheduledTask } from "node-cron";
import { runDueSchedules } from "./tick";

declare global {
  // eslint-disable-next-line no-var
  var __harniosSchedulerTask: ScheduledTask | undefined;
}

/**
 * Starts the scheduler's 1-minute polling heartbeat (research.md §3). Safe
 * to call more than once — a no-op after the first successful call.
 *
 * Three independent guards:
 * - `process.env.VERCEL`: automatically set by Vercel — a serverless
 *   function has no persistent process for a cron timer to live in, so the
 *   heartbeat would either never fire or fire once and vanish.
 * - `SCHEDULER_ENABLED=false`: explicit opt-out, e.g. for a deployer
 *   intentionally running more than one replica (spec.md Assumptions —
 *   this feature does not coordinate across instances).
 * - `globalThis.__harniosSchedulerTask`: survives `next dev`'s hot-reload
 *   module re-evaluation, unlike a plain module-level variable, preventing
 *   two overlapping heartbeats in local development.
 */
export function startScheduler(): void {
  if (process.env.VERCEL) return;
  if (process.env.SCHEDULER_ENABLED?.trim().toLowerCase() === "false") return;
  if (globalThis.__harniosSchedulerTask) return;

  globalThis.__harniosSchedulerTask = schedule(
    "* * * * *",
    () => {
      runDueSchedules().catch((err) => console.error("[scheduler] tick failed", err));
    },
    {
      timezone: process.env.SCHEDULER_TIMEZONE?.trim() || "UTC",
      noOverlap: true,
    },
  );

  console.log("[scheduler] started — polling os/schedules/ every minute");
}
