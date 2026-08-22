/**
 * Data shapes for spec 032-scheduled-tasks (data-model.md). A Scheduled Task
 * is a Markdown file at os/schedules/*.md (source of truth); everything else
 * here is persisted as JSON under the reserved `.scheduler/` prefix (see
 * store.ts).
 */
export interface ScheduleDefinition {
  /** Derived from the file's path (e.g. "report-settimanale.md" -> "report-settimanale"). */
  id: string;
  /** Full storage path, e.g. "os/schedules/report-settimanale.md". */
  path: string;
  /** Owner-facing display name — the identity the dedicated UI shows and edits. */
  name: string;
  /** Standard 5-field cron expression. */
  cron: string;
  /** Governs automatic execution only — never manual "run now" (FR-015). */
  enabled: boolean;
  /** Must be a member of the Supported Model catalog (models.ts). */
  model: string;
  /** IANA zone name; falls back to SCHEDULER_TIMEZONE when unset. */
  timezone?: string;
  /** The task's prompt — the file's Markdown body, verbatim. */
  body: string;
}

export type ScheduleTrigger = "scheduled" | "manual";
export type ScheduleRunStatus = "success" | "failure";

export interface ScheduleRunToolCall {
  name: string;
  isError: boolean;
}

/** One execution's durable outcome, written to `.scheduler/runs/{runId}.json`. */
export interface ScheduleRunRecord {
  runId: string;
  taskId: string;
  /** Denormalized so history still reads correctly if the task is later renamed or deleted. */
  taskName: string;
  trigger: ScheduleTrigger;
  startedAt: string;
  finishedAt: string;
  status: ScheduleRunStatus;
  errorCode?: string;
  errorMessage?: string;
  toolCalls: ScheduleRunToolCall[];
  summary: string;
}

/** Bookkeeping for the due-check, written to `.scheduler/last-run/{taskId}.json`. */
export interface LastRunRecord {
  /** Written after every attempt, success or failure — FR-011's no-catch-up guarantee depends on this. */
  lastRunAt: string;
  lastRunId: string;
  lastStatus: ScheduleRunStatus;
}
