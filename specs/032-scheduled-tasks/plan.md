# Implementation Plan: Scheduled Tasks

**Branch**: `032-scheduled-tasks` | **Date**: 2026-08-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/032-scheduled-tasks/spec.md`

## Summary

An owner defines any number of independent Scheduled Tasks — each a Markdown file at
`os/schedules/*.md` with a cron schedule, an assigned Mistral model, and a prompt. A 1-minute
in-process `node-cron` heartbeat (started from `frontend/instrumentation.ts`, only on a
persistent Node process — never on Vercel serverless) finds due, enabled tasks and runs each
through a bounded tool-calling loop against the Mistral API, giving the model access to this
server's own native MCP tools (send_email, send_telegram_message, file operations, …) via an
in-process `McpServer`/`Client` pair over `InMemoryTransport` — no HTTP loopback, no external
proxied tools. Every run (scheduled or manual) is capped at 5 minutes, produces a durable Task
Execution Record in S3, and a dedicated owner-only `/schedules` UI (default-language only for
v1) lists tasks, lets the owner create/edit (model + prompt + schedule) them with save-time
validation, toggle them, trigger an immediate run regardless of enabled state, and review
history. See [research.md](./research.md) for the decisions behind each of these choices and
[data-model.md](./data-model.md) / [contracts/](./contracts/) for the concrete shapes.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router), Node.js runtime (`NEXT_RUNTIME ===
"nodejs"`) — no Edge runtime involvement.

**Primary Dependencies**: `@modelcontextprotocol/sdk` (already present — `McpServer`, `Client`,
`InMemoryTransport`), new: `@mistralai/mistralai`, `node-cron`, `cron-parser` (+
`@types/node-cron` if the installed version doesn't ship its own types).

**Storage**: The app's single existing S3-compatible bucket — no new storage system. Task
definitions as Markdown files under `os/schedules/`; execution/bookkeeping records as JSON under
a new reserved prefix `.scheduler/` (mirrors `.messaging/`, `.mcp-tools/`, `.external-mcp/`).

**Testing**: This repo has no automated test framework (spec 031 plan.md, confirmed still true).
Verification is manual, via [quickstart.md](./quickstart.md), same as every prior feature here.

**Target Platform**: A long-running Node.js process — required for the in-process cron heartbeat
to function at all. Works on a VPS/Coolify deployment; the heartbeat self-disables when
`process.env.VERCEL` is set, so Vercel serverless deployments remain unaffected (tasks simply
never auto-fire there; manual "run now" still works within a single request's lifetime).

**Project Type**: Web application (existing single Next.js app in `frontend/`) — no new
top-level project.

**Performance Goals**: SC-002 — a due task starts within 1 minute of becoming due (bounded by
the 1-minute heartbeat interval itself).

**Constraints**: FR-012a — 5-minute hard cap per task execution. FR-011 — at most one execution
per task per due-check (no catch-up). Single persistent instance only (no multi-replica
coordination — see Non-Goals below).

**Scale/Scope**: SC-006 — at least 20 independently scheduled tasks running concurrently
(sequentially executed within a given tick, per research.md §3/§8) without drops, duplication,
or misattribution.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no ratified principles) — no
project-specific gates apply. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/032-scheduled-tasks/
├── plan.md                          # This file
├── research.md                      # Phase 0 output
├── data-model.md                    # Phase 1 output
├── quickstart.md                    # Phase 1 output
├── contracts/
│   ├── scheduled-tasks-routes.md    # Owner-facing /schedules HTTP routes
│   └── scheduler-run-protocol.md    # In-process tool-calling execution loop
└── tasks.md                         # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

Single existing Next.js app (`frontend/`) — no new top-level project. New feature code lives
entirely under a new `frontend/lib/scheduler/` module plus a new `frontend/app/schedules/` route
group, following the exact shape already established by `frontend/lib/messaging/` +
`frontend/app/tools/connections/` (spec 017/031):

```text
frontend/
├── lib/
│   ├── scheduler/                   # NEW
│   │   ├── types.ts                 # ScheduleDefinition, ScheduleRunRecord, LastRunRecord
│   │   ├── errors.ts                # SchedulerError + SchedulerErrorCode (mirrors messaging/errors.ts)
│   │   ├── config.ts                # readSchedulerConfig/validateSchedulerConfig (mirrors messaging/config.ts)
│   │   ├── models.ts                # fixed Supported Model catalog
│   │   ├── store.ts                 # .scheduler/ S3 records (mirrors messaging/store.ts)
│   │   ├── parseSchedule.ts         # front-matter parsing + listSchedules()
│   │   ├── isDue.ts                 # cron-parser due-check against LastRunRecord
│   │   ├── toolRuntime.ts           # in-process McpServer/Client pair (research.md §1)
│   │   ├── mistralClient.ts         # @mistralai/mistralai wrapper
│   │   ├── runSchedule.ts           # the tool-calling loop (contracts/scheduler-run-protocol.md)
│   │   ├── tick.ts                  # runDueSchedules() — sequential, anti-overlap guarded
│   │   └── cronRuntime.ts           # startScheduler() — node-cron + globalThis guard
│   │
│   ├── mcp-tools/
│   │   └── register.ts              # NEW — registerNativeTools extracted from app/mcp/route.ts
│   │
│   └── storage/
│       └── directories.ts           # MODIFIED — exclude .scheduler/ (mirrors existing exclusions)
│
├── app/
│   ├── mcp/route.ts                 # MODIFIED — imports registerNativeTools from lib/mcp-tools/register.ts
│   ├── page.tsx                     # MODIFIED — one new DASHBOARD_LINKS entry
│   │
│   └── schedules/                   # NEW
│       ├── page.tsx                 # GET /schedules — list
│       ├── new/page.tsx             # GET /schedules/new — create form
│       ├── create/route.ts          # POST /schedules/create
│       ├── [id]/
│       │   ├── page.tsx             # GET /schedules/[id] — detail + history
│       │   ├── edit/page.tsx        # GET /schedules/[id]/edit
│       │   ├── route.ts             # POST /schedules/[id] — save edits
│       │   ├── enabled/route.ts     # POST /schedules/[id]/enabled — toggle
│       │   └── run/route.ts         # POST /schedules/[id]/run — manual trigger
│
├── instrumentation.ts               # MODIFIED — 4th startup block calling startScheduler()
├── .env.example                     # MODIFIED — MISTRAL_API_KEY, MISTRAL_MODEL, SCHEDULER_TIMEZONE, SCHEDULER_ENABLED
└── lib/i18n/dictionaries/
    ├── types.ts                     # MODIFIED — new `schedules` Dictionary section
    └── en/it/ru/es/de/fr.ts         # MODIFIED — all six updated for type-safety; only `en` gets real copy for v1 (research.md §6)
```

**Structure Decision**: Extends the existing single Next.js app in `frontend/` — no new
project, no new deployable unit. New code is isolated to `lib/scheduler/` and `app/schedules/`,
touching exactly four existing files (`app/mcp/route.ts`, `lib/storage/directories.ts`,
`instrumentation.ts`, `app/page.tsx`) plus the i18n dictionary set, all as small, additive,
independently-verifiable changes (see tasks sequencing in research.md and the Phase breakdown
below).

## Complexity Tracking

*No constitution violations — this section is intentionally empty.*
