/**
 * In-memory anti-overlap guard, shared by the scheduled tick (tick.ts) and
 * the manual "run now" route — neither may start a second, overlapping
 * execution of a task that's already running (FR-012, contracts/
 * scheduler-run-protocol.md Preconditions). Sufficient given this feature's
 * accepted single-instance-only deployment (spec.md Assumptions) — no
 * persisted/distributed lock is needed.
 */
const runningTaskIds = new Set<string>();

export function isRunning(taskId: string): boolean {
  return runningTaskIds.has(taskId);
}

/** Returns `false` (without reserving the slot) if the task is already running. */
export function beginRun(taskId: string): boolean {
  if (runningTaskIds.has(taskId)) return false;
  runningTaskIds.add(taskId);
  return true;
}

export function endRun(taskId: string): void {
  runningTaskIds.delete(taskId);
}
