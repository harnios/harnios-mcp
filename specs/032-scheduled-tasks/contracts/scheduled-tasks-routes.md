# Contract: Scheduled Tasks Management Routes

**Input**: [spec.md](../spec.md), [research.md](../research.md), [data-model.md](../data-model.md)

Owner-only routes under `/schedules` for creating, listing, editing (model + prompt + schedule),
enabling/disabling, manually running, and reviewing the history of Scheduled Tasks
(data-model.md). Follows the same owner-session-gating and plain-HTML-form conventions as
`specs/031-external-mcp-proxy/contracts/connection-management-routes.md` and
`specs/025-manage-tools-page/contracts/manage-tools-routes.md`. None of these routes, or any
capability they expose, is reachable through any MCP tool — a Scheduled Task's underlying file
remains reachable through the existing file-storage tools (`create_file`/`read_file`/
`update_file`/`delete_file`), per FR-018, but there is no dedicated `create_schedule`-style MCP
tool.

Every route below requires an active owner session (`hasActiveOwnerSession()`); without one,
every route responds identically to the existing pattern (`401` JSON for `POST` routes, `302`
redirect to `/oauth/login?continue=<url>` for pages) — omitted from the per-route tables below
for brevity, matching FR-017.

## `GET /schedules`

Lists every Scheduled Task: `name`, `cron` (+ `timezone` if set), `enabled` state, assigned
`model`, and the outcome/time of its Last-Run Bookkeeping record if one exists (FR-013). Each
row links to edit, links to that task's execution history, and offers an enable/disable toggle
and a "Run now" action — both available regardless of the task's current enabled/disabled state
(FR-015, research.md §5).

## `GET /schedules/new` / `POST /schedules/create`

| Step | Behavior |
|---|---|
| `GET` | Renders a form: `name`, `cron`, `timezone` (optional), `model` (`<select>` populated from the Supported Model catalog), `prompt` (plain `<textarea>` — not the CodeMirror-based `MarkdownEditor` used by `/files`, to keep this a single self-contained form POST like other owner pages rather than wiring in that component's own client-side save flow). `enabled` defaults to checked. |
| `POST`, `name` or `prompt` empty | Rejected with a validation error, no file written (FR-014a). |
| `POST`, `cron` does not parse as a valid 5-field expression | Rejected with a validation error naming the problem, no file written (FR-014a). |
| `POST`, `model` not a member of the Supported Model catalog | Rejected with a validation error, no file written (FR-014a). |
| `POST`, `timezone` present but not a valid IANA zone name | Rejected with a validation error, no file written (FR-014a). |
| `POST`, valid | A new task file is written to `os/schedules/{slug}.md` (slug derived from `name`, de-duplicated on collision), `enabled: true` unless unchecked, redirects to `/schedules`. |

## `GET /schedules/[id]/edit` / `POST /schedules/[id]/save`

(`save` is its own path segment, not the bare `/schedules/[id]` — that path already serves the detail/history page below, and Next.js doesn't allow a route handler and a page to occupy the same path; mirrors spec 031's `create` segment convention.)

| Step | Behavior |
|---|---|
| `GET`, `id` doesn't match any task | `404`-equivalent error page. |
| `GET`, valid | Renders the same field set as `new`, pre-filled from the task's current front matter and body. `name` is editable but does **not** change `id`/the file's slug (research.md, data-model.md — renaming intentionally starts a fresh run history rather than migrating one). |
| `POST`, same validation rules as `create` | Rejected with a validation error, existing file left untouched. |
| `POST`, valid | The task's file is overwritten with the new front matter/body; `updated` front-matter field refreshed. Takes effect on the task's very next execution — scheduled or manual (SC-005) — no restart required, since the periodic tick always re-reads the file fresh. |

## `POST /schedules/[id]/enabled`

| Condition | Behavior |
|---|---|
| `id` valid | Toggles the task's `enabled` front-matter field. Redirects to `/schedules`. Governs only the periodic due-check (FR-003) — never blocks a manual "run now" (FR-015). |

## `POST /schedules/[id]/run`

| Condition | Behavior |
|---|---|
| `id` doesn't match any task | `404`-equivalent JSON error, no execution attempted. |
| `id` valid, task already executing (scheduled or another manual trigger) | Rejected — no second overlapping execution is started for the same task (FR-012). Returns a JSON/redirect response indicating the task is already running, without creating a new Task Execution Record. |
| `id` valid, not currently executing (any `enabled` state) | Executes immediately, bypassing the due-check entirely (FR-015, SC-007). Bound by the same 5-minute timeout and anti-overlap guard as a scheduled run (research.md §5). Redirects to `/schedules/[id]` (or back to `/schedules`) once the run completes or times out, where its outcome is visible. |

## `GET /schedules/[id]/confirm?to=removed` / `POST /schedules/[id]/remove`

Confirm-then-apply, mirroring `specs/031-external-mcp-proxy/contracts/connection-management-routes.md`'s connection removal — deletion is destructive, so it isn't a one-click action from the list/detail page.

| Step | Behavior |
|---|---|
| `GET /schedules/[id]/confirm?to=removed` | Confirmation screen naming the task, with a warning that the task definition is deleted (soft-deleted to Trash, per the existing file-storage convention) while its past execution history is kept. No side effect. |
| `POST /schedules/[id]/remove`, `id` doesn't match any task | `404`-equivalent JSON error, no deletion. |
| `POST /schedules/[id]/remove`, `id` valid | The task's `os/schedules/{id}.md` file is deleted (soft-delete to Trash) and its Last-Run Bookkeeping record (`.scheduler/last-run/{id}.json`) is removed. Its Task Execution Records under `.scheduler/runs/` are deliberately **not** deleted — they're denormalized with `taskName` precisely so history remains readable after the task itself is gone (data-model.md). Redirects to `/schedules?changed=<name>&to=removed`. |

## `GET /schedules/[id]`

Shows one task's current definition (read-only summary — editing happens via `/schedules/[id]/edit`) plus its execution history: every matching Task Execution Record (data-model.md), newest first, each showing `trigger` (scheduled/manual), `startedAt`, `status`, and `summary` (FR-016).
