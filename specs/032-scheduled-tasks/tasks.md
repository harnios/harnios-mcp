# Tasks: Scheduled Tasks

**Input**: Design documents from `/specs/032-scheduled-tasks/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Not included — this repo has no automated test framework (plan.md, Technical Context: Testing), and tests were not explicitly requested. Verification is manual, via [quickstart.md](./quickstart.md), matching every prior feature in this repo.

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation and testing of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact and relative to the repo root

---

## Phase 1: Setup

**Purpose**: Add the feature's new dependencies and configuration surface

- [X] T001 Add `node-cron`, `cron-parser`, `@mistralai/mistralai` (and `@types/node-cron` if the installed `node-cron` doesn't ship its own types) to `frontend/package.json` and run `npm install`
- [X] T002 [P] Add `MISTRAL_API_KEY`, `MISTRAL_MODEL`, `SCHEDULER_TIMEZONE`, `SCHEDULER_ENABLED` to `frontend/.env.example`, grouped under a "Scheduler (spec 032)" comment block matching the existing per-feature convention

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core scheduler data types, storage, and the native-tool registration shared by every user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Create `frontend/lib/scheduler/types.ts` with `ScheduleDefinition`, `ScheduleRunRecord`, `LastRunRecord` (data-model.md)
- [X] T004 [P] Create `frontend/lib/scheduler/errors.ts` with `SchedulerError`/`SchedulerErrorCode` (`missing_config | invalid_schedule | llm_unreachable | llm_invalid_response | tool_call_failed | max_iterations_exceeded | run_timed_out`), mirroring `frontend/lib/messaging/errors.ts`
- [X] T005 [P] Create `frontend/lib/scheduler/models.ts` with the fixed Supported Model catalog (`{id, label}[]`, data-model.md)
- [X] T006 [P] Create `frontend/lib/scheduler/config.ts` with `readSchedulerConfig()`/`validateSchedulerConfig()`, mirroring `frontend/lib/messaging/config.ts` (never throws on read; `missing_config` only on validate)
- [X] T007 Create `frontend/lib/scheduler/store.ts` with `.scheduler/` S3 record persistence (`getRecord`/`putRecord`/`listRecords`, `SCHEDULER_PREFIX` export), mirroring `frontend/lib/messaging/store.ts` exactly (depends on T003, T004)
- [X] T008 Update `frontend/lib/storage/directories.ts` to exclude `SCHEDULER_PREFIX` (imported from T007's `store.ts`) from `listDirectory`'s files/directories results, mirroring the existing `OAUTH_PREFIX`/`TOOLS_PREFIX`/`EXTERNAL_*_PREFIX` exclusions (depends on T007)
- [X] T009 [P] Create `frontend/lib/scheduler/parseSchedule.ts` with front-matter parsing and `listSchedules()` (reads `os/schedules/*.md` via existing `listDirectory`/`readFile`; malformed files are skipped with a logged warning, never thrown — data-model.md Scheduled Task, spec.md Edge Cases) (depends on T003)
- [X] T010 [P] Create `frontend/lib/scheduler/runGuard.ts` with the in-memory anti-overlap guard (`isRunning`/`beginRun`/`endRun` over a module-level `Set<string>`), shared by both the scheduled tick and manual "run now" entry points (contracts/scheduler-run-protocol.md, Preconditions)
- [X] T011 [P] Extract `registerNativeTools` out of `frontend/app/mcp/route.ts` into a new `frontend/lib/mcp-tools/register.ts`, update `route.ts`'s import — pure refactor; verify `/mcp`'s tool set and gating are byte-for-byte unchanged before proceeding

**Checkpoint**: Foundation ready — schedule files can be listed/parsed, S3 records can be read/written and stay hidden from `/files`, and the native tool set is available to import from a shared location.

---

## Phase 3: User Story 1 - A scheduled task runs unattended and takes action (Priority: P1) 🎯 MVP

**Goal**: A due, enabled task executes automatically, its model uses native tools to carry out the task, and the outcome is durably recorded — with no management UI required to prove it works.

**Independent Test**: Hand-write a schedule file at `os/schedules/test.md` (cron set to the next minute, prompt "send a Telegram test message"), start the dev server, wait, and confirm the message arrives and a `.scheduler/runs/{id}.json` record exists with `status: "success"`.

### Implementation for User Story 1

- [X] T012 [P] [US1] Create `frontend/lib/scheduler/isDue.ts` computing whether a task's cron has fired since its `LastRunRecord.lastRunAt` (via `cron-parser`), with no catch-up for missed occurrences (research.md §8, FR-011) (depends on T003, T009)
- [X] T013 [P] [US1] Create `frontend/lib/scheduler/toolRuntime.ts`: build an in-process `McpServer` + `Client` pair over `InMemoryTransport.createLinkedPair()`, register native tools via T011's `registerNativeTools`, expose `listMistralTools(client)` and `callTool(client, name, args)` (research.md §1, contracts/scheduler-run-protocol.md step 1) (depends on T011)
- [X] T014 [P] [US1] Create `frontend/lib/scheduler/mistralClient.ts` wrapping `@mistralai/mistralai`'s chat-completion call (verify exact SDK method/field names, e.g. `toolCalls` vs `tool_calls`, against the installed version) (depends on T006)
- [X] T015 [US1] Create `frontend/lib/scheduler/runSchedule.ts` implementing the full tool-calling loop: system+user seed, up to `MAX_ITERATIONS` (8) rounds of Mistral calls and tool execution via T013, a 5-minute hard timeout (FR-012a) via `Promise.race`, and — on every outcome, always — a `ScheduleRunRecord` + updated `LastRunRecord` written via T007's `store.ts` (contracts/scheduler-run-protocol.md) (depends on T004, T007, T013, T014)
- [X] T016 [US1] Create `frontend/lib/scheduler/tick.ts` implementing `runDueSchedules()`: list schedules (T009), filter to enabled + due (T012), run each sequentially guarded by T010's `runGuard`, calling T015's `runSchedule` (depends on T009, T010, T012, T015)
- [X] T017 [US1] Create `frontend/lib/scheduler/cronRuntime.ts` implementing `startScheduler()`: `node-cron` 1-minute heartbeat calling T016's `runDueSchedules`, a `globalThis`-based start guard (survives `next dev` hot reload), and early returns when `process.env.VERCEL` is set or `SCHEDULER_ENABLED=false` (research.md §3) (depends on T016)
- [X] T018 [US1] Wire `startScheduler()` (T017) into `frontend/instrumentation.ts`'s existing `NEXT_RUNTIME === "nodejs"` block, as a fourth relaxed try/catch startup check matching the storage/OAuth/messaging pattern already there (depends on T017)

**Checkpoint**: User Story 1 is fully functional and independently testable — run quickstart.md Scenario 1.

---

## Phase 4: User Story 2 - Owner manages tasks through a dedicated interface (Priority: P2)

**Goal**: An owner creates, lists, edits (model + prompt + schedule), and enables/disables tasks entirely through `/schedules`, with invalid input rejected before it's saved.

**Independent Test**: Open `/schedules`, create a task through the form, confirm it appears in the list, edit its model and prompt, and confirm a validation error is shown (no file written) when submitting a malformed cron expression.

### Implementation for User Story 2

- [X] T019 [P] [US2] Create `frontend/lib/scheduler/validateTask.ts` validating `name`/`cron`/`model`/`timezone` per FR-014a (non-empty name/prompt, `cron-parser`-valid cron, `model` present in T005's catalog, valid IANA `timezone` if given) (depends on T005)
- [X] T020 [US2] Add a `schedules` section to `frontend/lib/i18n/dictionaries/types.ts` covering list/create/edit strings, and implement it in all six dictionary files (`en.ts` with real copy; `it.ts`/`ru.ts`/`fr.ts`/`de.ts`/`es.ts` duplicating the same English strings verbatim for v1, per research.md §6 — the `Dictionary` type must stay total across all locales even though only the default language ships real translations)
- [X] T021 [US2] Implement `GET /schedules` in `frontend/app/schedules/page.tsx`: owner-session gate (`hasActiveOwnerSession()`, redirect to `/oauth/login` like `app/tools/connections/page.tsx`), table of tasks (name, cron, enabled, model, last-run outcome/time from T007's `store.ts`), links to edit/detail, enable/disable toggle (depends on T007, T009, T020)
- [X] T022 [US2] Implement `GET /schedules/new` + `POST /schedules/create` in `frontend/app/schedules/new/page.tsx` + `frontend/app/schedules/create/route.ts`: form (name, cron, timezone, model `<select>`, prompt `<textarea>`, enabled checkbox), owner gate, T019 validation with a clear rejection on failure, slug derived from `name` on success (contracts/scheduled-tasks-routes.md) (depends on T019, T020)
- [X] T023 [US2] Implement `GET /schedules/[id]/edit` + `POST /schedules/[id]` in `frontend/app/schedules/[id]/edit/page.tsx` + `frontend/app/schedules/[id]/route.ts`: same field set pre-filled from the existing task, same T019 validation, overwrites the task file on success without changing its slug (contracts/scheduled-tasks-routes.md) (depends on T019, T020)
- [X] T024 [US2] Implement `POST /schedules/[id]/enabled` in `frontend/app/schedules/[id]/enabled/route.ts`: toggles the task's `enabled` front-matter field only, redirects to `/schedules` (depends on T009)
- [X] T025 [US2] Add a "Scheduled Tasks" entry to `DASHBOARD_LINKS` in `frontend/app/page.tsx` (depends on T021)

**Checkpoint**: User Stories 1 AND 2 both work independently — run quickstart.md Scenarios 3 and 5.

---

## Phase 5: User Story 3 - Owner triggers a task on demand and reviews its history (Priority: P3)

**Goal**: An owner runs any task immediately — regardless of its enabled/disabled state — and reviews the outcome/history of past runs.

**Independent Test**: Disable an existing task, click "Run now", confirm it executes immediately despite being disabled, and confirm the run appears in that task's history with `trigger: "manual"`.

### Implementation for User Story 3

- [X] T026 [US3] Extend the `schedules` dictionary (T020's `types.ts` + all six language files) with history/detail/"run now" strings, English-only real copy per research.md §6 (depends on T020)
- [X] T027 [US3] Implement `POST /schedules/[id]/run` in `frontend/app/schedules/[id]/run/route.ts`: owner gate, rejects if T010's `runGuard` reports the task already running, otherwise calls T015's `runSchedule` directly — bypassing the enabled/due checks entirely (FR-015) but still subject to the same anti-overlap guard and 5-minute timeout (contracts/scheduled-tasks-routes.md) (depends on T010, T015, T026)
- [X] T028 [US3] Implement `GET /schedules/[id]` in `frontend/app/schedules/[id]/page.tsx`: owner gate, current task definition summary, full execution history via T007's `listRecords` over `runs/` filtered to this task's id, newest first (FR-016) (depends on T007, T026)

**Checkpoint**: All three user stories are independently functional — run quickstart.md Scenario 2 (and re-run Scenario 1).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation against the spec's measurable outcomes

- [ ] T029 [P] Run quickstart.md Scenarios 1–5 end-to-end against local MinIO + a real Mistral API key; fix any deviations found
- [ ] T030 [P] Verify SC-006: create 20+ schedule files with staggered cron expressions and confirm, across several ticks, no executions are dropped, duplicated, or misattributed to the wrong task
- [ ] T031 Verify SC-004/FR-010 in combination: deliberately break one task (e.g. an unsupported tool request in its prompt, or temporarily unset `MISTRAL_API_KEY`) and confirm every other task keeps running on schedule unaffected
- [X] T032 [US2] Add delete-task capability: `frontend/lib/scheduler/store.ts` `deleteRecord()`, `frontend/app/schedules/[id]/confirm/page.tsx` (confirm-then-apply, mirroring spec 031's connection removal) and `frontend/app/schedules/[id]/remove/route.ts` (soft-deletes the task file to Trash, removes its Last-Run Bookkeeping record, keeps its Task Execution Records), wired from both the list and detail pages (requested post-implementation, added 2026-08-22)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational only
- **User Story 2 (Phase 4)**: Depends on Foundational only — independent of US1's execution engine (a task can be created/edited through the UI even before the cron heartbeat exists), though a complete demo benefits from US1 being done first
- **User Story 3 (Phase 5)**: Depends on Foundational **and** on US1's `runSchedule`/`runGuard` (T015, T010) being implemented — its manual-trigger route calls them directly
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within Each Phase

- Foundational: T003–T006 and T009–T011 are independent [P] files; T007 needs T003/T004; T008 needs T007
- US1: T012–T014 are independent [P] files; T015 needs T013/T014/T007/T004; T016 needs T012/T015/T010/T009; T017 needs T016; T018 needs T017
- US2: T019 needs T005; T020 is a standalone dictionary change; T021–T024 each need T019/T020 (and T021 additionally needs T007/T009); T025 needs T021
- US3: T026 needs T020; T027 needs T010/T015/T026; T028 needs T007/T026

### Parallel Opportunities

- Setup: T002 can run alongside T001
- Foundational: T003, T004, T005, T006, T009, T010, T011 can all be built in parallel (7 independent files); T007 and T008 are sequential after T003/T004
- US1: T012, T013, T014 can be built in parallel once Foundational is done
- US2: T019 can start as soon as Foundational (T005) is done, in parallel with all of US1
- Polish: T029 and T030 can run in parallel; T031 is best run after both

---

## Parallel Example: Foundational Phase

```bash
# Once Setup is done, these seven files have no dependencies on each other:
Task: "Create frontend/lib/scheduler/types.ts with ScheduleDefinition, ScheduleRunRecord, LastRunRecord"
Task: "Create frontend/lib/scheduler/errors.ts with SchedulerError/SchedulerErrorCode"
Task: "Create frontend/lib/scheduler/models.ts with the Supported Model catalog"
Task: "Create frontend/lib/scheduler/config.ts with readSchedulerConfig/validateSchedulerConfig"
Task: "Create frontend/lib/scheduler/parseSchedule.ts with front-matter parsing and listSchedules()"
Task: "Create frontend/lib/scheduler/runGuard.ts with the anti-overlap guard"
Task: "Extract registerNativeTools from app/mcp/route.ts into lib/mcp-tools/register.ts"
```

## Parallel Example: User Story 1

```bash
Task: "Create frontend/lib/scheduler/isDue.ts computing due-ness via cron-parser"
Task: "Create frontend/lib/scheduler/toolRuntime.ts (in-process McpServer/Client pair)"
Task: "Create frontend/lib/scheduler/mistralClient.ts wrapping @mistralai/mistralai"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart.md Scenario 1 — a hand-written schedule file executes unattended and produces a run record
5. This alone proves the entire value proposition (spec.md, User Story 1's "Why this priority")

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add User Story 1 → validate independently → unattended execution works (MVP)
3. Add User Story 2 → validate independently → tasks are now manageable without touching raw files
4. Add User Story 3 → validate independently → manual trigger + history complete the feature
5. Polish → confirm every Success Criterion in spec.md holds

---

## Notes

- No test tasks: this repo has no automated test framework: verification is the quickstart.md walkthrough, matching every prior spec here (031, 030, …).
- [P] tasks touch different files with no unmet dependency — safe to parallelize (multiple engineers or multiple agent sessions).
- [Story] labels trace every Phase 3+ task back to spec.md's User Story 1/2/3.
- Commit after each task or logical group, per repo convention (see recent commit history: one focused commit per spec-numbered change).
