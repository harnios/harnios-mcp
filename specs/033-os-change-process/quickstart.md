# Quickstart: OS Change Process

Manual validation — this repo has no automated test framework (unchanged since spec 031/032).
Run against a disposable Harnios instance/bucket (or the local MinIO dev setup), not a live
client instance.

## Prerequisites

- A running Harnios instance connected to an empty S3 bucket.
- An MCP client connected (any client that supports tool calling — Claude, or the same manual
  `curl`-against-`/mcp` approach used to verify prior features).

## Scenario 1 — First-time setup creates nothing beyond identity (User Story 3, SC-001)

1. Complete `/init` on the empty bucket, then have the connected assistant run through
   `get_os_init`'s (trimmed) interview.
2. `list_directory_tree ""` after setup finishes.
3. **Expected**: `os/identity.md`, `os/routing.md` (empty table), `data/index.md`, `data/inbox.md`
   exist. No `os/skills/*.md`, no `os/policies/*.md`, no `os/templates/*` exist.

## Scenario 2 — A new recurring capability, gated end-to-end (User Story 1, SC-002, SC-004)

1. Ask the connected assistant, in chat: "ho bisogno di un rapporto giornaliero con le polizze in
   scadenza alle 8 del mattino, tranne sabato e domenica."
2. **Expected before anything is created**: the assistant calls `get_change_process`, explores
   `os/skills/` and `os/schedules/` (both empty at this point), and responds with a plain-language
   proposal (what + why) and a concrete plan (which files it intends to create) — no file has been
   written yet. Confirm via `list_directory "os/changes/"` that a `draft`-status proposal now
   exists with `spec.md`/`plan.md`/`tasks.md`.
3. Decline in this pass ("non ancora, aspetta"). **Expected**: `list_directory_tree ""` shows no
   new file under `os/skills/` or `os/schedules/` — only the `os/changes/<slug>/` draft.
4. Ask again and confirm this time. **Expected**: the assistant creates the skill and/or schedule
   file(s) named in `plan.md`, updates `os/routing.md` if the plan said it would, checks off each
   line in `tasks.md` as it goes, and finally sets `spec.md`'s `status` to `implemented`.
5. Verify the schedule (if one was created) actually appears in the `/schedules` UI with the
   expected cron expression.

## Scenario 3 — Everyday work stays immediate (User Story 2, SC-003)

1. With the skill/schedule from Scenario 2 in place, ask the assistant to use that same skill
   again, or to write an ordinary note under `data/`.
2. **Expected**: no proposal, no `os/changes/` entry created, no confirmation requested — happens
   immediately, same as before this feature existed.

## Scenario 4 — Interrupted implementation resumes without redoing work (FR-012)

1. Start a new change request, confirm it, but stop the assistant (end the session) right after
   it creates the first file named in `plan.md` but before the rest.
2. Inspect `os/changes/<slug>/tasks.md` — the first line should be checked, the rest unchecked.
3. Start a new session, ask the assistant to continue that change.
4. **Expected**: it re-reads `tasks.md`, does not recreate or touch the already-checked file, and
   completes only the remaining unchecked steps.

## Scenario 5 — Existing instance receives the capability via upgrade (User Story 4, SC-005)

1. On an instance whose `AGENTS.md` still records `os-engine-version: 1`, ask the connected
   assistant to check for an OS upgrade.
2. **Expected**: the summarized change list includes the `get_change_process` addition (the `### v2`
   changelog entry), in plain language, in `os/language`. Nothing is rewritten until confirmed.
3. Confirm. **Expected**: `AGENTS.md`'s front matter now reads `os-engine-version: 2`, and its body
   mentions calling `get_change_process` for structural changes. Any skills/schedules that already
   existed on this instance before the upgrade are untouched (FR-011).

## Scenario 6 — A new kind of business content, gated end-to-end (User Story 1, FR-003, FR-015)

1. On an instance with nothing yet tracked as a project (no `data/progetti/` or equivalent, no
   project-related skill), tell the connected assistant: "ho un progetto da gestire."
2. **Expected before anything is created**: the assistant calls `get_change_process`, checks that
   no place for tracking projects exists yet, and produces a proposal covering both where/how
   projects will be tracked (a new `data/` category and its template shape) and whether a
   companion skill for handling future projects belongs in the same change (FR-015) — nothing
   written yet, a `draft` proposal exists under `os/changes/`.
3. Confirm. **Expected**: the new `data/` category (folder + template) exists, any companion skill
   named in the plan exists under `os/skills/`, and `os/routing.md` is updated if the plan said so.
4. Ask about a second, different project. **Expected**: no proposal, no `os/changes/` entry —
   adding another instance under the now-established category is everyday activity (matches
   Scenario 3's guarantee).
