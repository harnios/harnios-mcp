# Data Model: Scheduled Tasks

## Scheduled Task

Stored as a Markdown file at `os/schedules/{slug}.md` in the app's S3 bucket — the source of
truth (spec.md FR-018). `{slug}` is derived once, at creation time, from the owner-provided
`name` (kebab-cased, de-duplicated if it collides with an existing file); it does not change if
`name` is later edited, matching the accepted "renaming starts a fresh run history" tradeoff.

```markdown
---
name: "Report settimanale"
cron: "0 8 * * 1"
enabled: true
model: "mistral-large-latest"
timezone: "Europe/Rome"
updated: 2026-08-22
---

Ogni lunedì mattina, leggi data/index.md e data/clients/*.md, componi un
breve riepilogo di cosa è cambiato dalla settimana scorsa e invialo via
email a owner@example.com usando send_email. Massimo 300 parole.
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` (slug) | string, derived | — | From the file path, e.g. `report-settimanale.md` → `report-settimanale`. Not itself a front-matter field. |
| `name` | string | yes | Owner-facing display name; the field the clarification session decided the owner types (research.md §4). |
| `cron` | string | yes | Standard 5-field cron expression, validated with `cron-parser`. |
| `enabled` | boolean | no (default `true`) | Governs automatic execution only — never manual "run now" (FR-015). |
| `model` | string | yes | Must match an entry in the fixed `Supported Model` catalog (see below). |
| `timezone` | string (IANA) | no | Falls back to the system-wide `SCHEDULER_TIMEZONE` default (FR-002). |
| `updated` | string (`YYYY-MM-DD`) | no | Informational only, matching the repo-wide convention already used in `os/engine/*.md`; never read by code. |
| body | Markdown, freeform | yes | The task's prompt — passed verbatim as the model's user-turn content (FR-005, FR-007). |

**Validation** (FR-014a, enforced by the dedicated UI at save time only — see research.md §4):
`name` and body non-empty; `cron` parses as a valid 5-field expression; `model` is a member of
the Supported Model catalog; `timezone`, if present, is a valid IANA zone name. A task file
edited directly via the general-purpose file storage interface is not subject to this
validation and instead falls back to execution-time skip-and-flag handling (spec.md Edge Cases).

## Task Execution Record

One JSON record per execution (scheduled or manual), written to
`.scheduler/runs/{runId}.json` (reserved prefix, excluded from `/files` and
`list_directory`/`list_directory_tree` — research.md §7).

```ts
interface ScheduleRunRecord {
  runId: string;          // random hex id
  taskId: string;         // the Scheduled Task's slug
  taskName: string;       // denormalized at run time, so history reads correctly even if the task is later renamed/deleted
  trigger: "scheduled" | "manual";
  startedAt: string;      // ISO 8601
  finishedAt: string;     // ISO 8601
  status: "success" | "failure";
  errorCode?: SchedulerErrorCode;   // present only if status === "failure"
  errorMessage?: string;
  toolCalls: Array<{ name: string; isError: boolean }>; // ordered, one entry per tool call made during the run
  summary: string;        // the model's final plain-text summary, or a synthesized one on failure/timeout
}
```

`FR-009`/`FR-016` (durable, retrievable per-task history) are satisfied by listing
`.scheduler/runs/` and filtering by `taskId`; `FR-004a`'s timeout is recorded as
`status: "failure"`, `errorCode: "run_timed_out"`.

## Last-Run Bookkeeping

One small JSON record per task, written to `.scheduler/last-run/{taskId}.json`, read on every
tick's due-check so it doesn't require scanning all of `.scheduler/runs/` (research.md §8):

```ts
interface LastRunRecord {
  lastRunAt: string;   // ISO 8601, written after every attempt (success or failure) — FR-011
  lastRunId: string;   // points at the corresponding ScheduleRunRecord
  lastStatus: "success" | "failure";
}
```

## Supported Model (catalog)

A small, fixed, code-defined list — not owner-editable, not stored in S3 (research.md §4):

```ts
// frontend/lib/scheduler/models.ts
interface SupportedModel {
  id: string;     // the exact value accepted in a task's `model` front-matter field
  label: string;  // shown in the dedicated UI's model selector
}
```

## State / lifecycle

```
Task file created (enabled: true by default)
        │
        ▼
  ┌─────────────┐   toggle enabled/disabled    ┌──────────────┐
  │   enabled   │ ───────────────────────────▶ │   disabled   │
  │             │ ◀─────────────────────────── │              │
  └─────────────┘                               └──────────────┘
        │  due (cron) or manual trigger                 │
        │  (manual trigger works from either state)     │  manual trigger only
        ▼                                                ▼
  ┌─────────────────────────────────────────────────────────┐
  │ running (guarded: at most one concurrent run per taskId) │
  └─────────────────────────────────────────────────────────┘
        │
        ▼ (success, failure, or 5-minute timeout)
  Task Execution Record written; Last-Run Bookkeeping updated;
  task returns to its enabled/disabled state, eligible for its next occurrence
```
