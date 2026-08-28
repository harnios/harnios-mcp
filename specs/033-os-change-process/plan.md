# Implementation Plan: OS Change Process

**Branch**: `033-os-change-process` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/033-os-change-process/spec.md`

## Summary

First-time setup (`get_os_init`) stops pre-creating skills, policies, and templates based on a
guessed business type — it now only interviews for and writes `os/identity.md`, plus the
already-universal `os/routing.md`/`data/index.md`/`data/inbox.md` scaffolding. A new fourth
code-bundled engine resource, `get_change_process` (registered exactly like `get_os_engine`/
`get_os_init`/`get_os_upgrade` in `frontend/lib/mcp-tools/engineTools.ts`), gives any connected
assistant the propose → confirm → implement procedure for structural changes: create/modify a
skill, create/modify a schedule, edit `os/routing.md` or a policy, request a new external
connection, or establish a place and shape for a kind of business content that has never been
tracked before (optionally with a companion skill for handling future instances of it). In-progress proposals live as plain Markdown at `os/changes/<slug>/{spec.md,plan.md,
tasks.md}`, read and written entirely with the existing native file tools — no new tool
architecture, no new persistence mechanism. `engine.md` gets `os-engine-version: 2` and a
changelog entry so already-existing instances receive the capability through the existing
confirm-before-rewrite upgrade gate (`get_os_upgrade`), unchanged. See
[research.md](./research.md) for the decisions behind each of these choices, and
[data-model.md](./data-model.md) / [contracts/](./contracts/) for the concrete file/tool shapes.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router), Node.js runtime — no new runtime
requirements; this feature adds no server-side execution logic of its own (unlike the scheduler),
only markdown content and one new tool registration following an existing pattern.

**Primary Dependencies**: None new. Reuses `@modelcontextprotocol/sdk` (`registerGatedTool`,
already used by `engineTools.ts`) and `node:fs` (`readFileSync`, already used to bundle
`engine.md`/`init.md`/`os-upgrade.md`).

**Storage**: The app's single existing S3-compatible bucket — no new storage system. Change
proposals as plain Markdown files under a new, ordinary (non-hidden) `os/changes/<slug>/` prefix.

**Testing**: This repo has no automated test framework (confirmed unchanged since spec 031/032).
Verification is manual, via [quickstart.md](./quickstart.md).

**Target Platform**: No change — this feature has no runtime/process requirements beyond the app
already running (unlike spec 032's scheduler, which needs a persistent Node process). Works
identically on Vercel serverless and on a persistent VPS/Coolify deployment.

**Project Type**: Web application (existing single Next.js app in `frontend/`) — no new
top-level project.

**Performance Goals**: N/A — this feature is conversational/file-based, not a background process
with a latency target.

**Constraints**: FR-006 — implementation must create/modify only the files named in a confirmed
plan. FR-008 — an unconfirmed or declined proposal must leave the live structure (`os/skills/`,
`os/schedules/`, `os/routing.md`, policies) completely unmodified. FR-011 — an `AGENTS.md`
upgrade to `os-engine-version: 2` must not alter or remove any pre-existing skill/schedule/rule.

**Scale/Scope**: Single-owner, single-instance scope (matches the existing assumption that one
account acts as both everyday user and change-approver — spec.md Assumptions). No concurrency
design beyond simple slug-collision suffixing (research.md §4).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no ratified principles) — no
project-specific gates apply. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/033-os-change-process/
├── plan.md                          # This file
├── research.md                      # Phase 0 output
├── data-model.md                    # Phase 1 output
├── quickstart.md                    # Phase 1 output
├── contracts/
│   ├── get-change-process-tool.md   # New MCP tool contract
│   ├── change-proposal-files.md     # os/changes/<slug>/ file format contract
│   └── engine-content-changes.md    # Precise diffs to engine.md / init.md / engineTools.ts
└── tasks.md                         # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

Single existing Next.js app (`frontend/`) — no new top-level project, no new module directory.
This feature touches only the existing `lib/os/engine/` content and its registration:

```text
frontend/
└── lib/
    ├── os/
    │   └── engine/
    │       ├── change-process.md    # NEW — get_change_process content (research.md §1)
    │       ├── engine.md            # MODIFIED — os-engine-version 1→2, new Build line, v2 changelog
    │       └── init.md              # MODIFIED — Phase 2 table + policies + domain skills removed;
    │                                 #            Phase 1/3/4 trimmed to identity + universal scaffolding
    └── mcp-tools/
        └── engineTools.ts           # MODIFIED — 4th ENGINE_CONTENT key + ENGINE_TOOLS entry
```

No changes to `os-upgrade.md` (its compare-and-confirm procedure already handles any version bump
generically — confirmed in research.md §3), to the scheduler (spec 032, referenced but untouched),
to any HTTP route, or to any existing tool's registration mechanism.

**Structure Decision**: Extends the existing single Next.js app in `frontend/` — no new project,
no new deployable unit, no new dependency. New content is one new file
(`lib/os/engine/change-process.md`) plus edits to two existing engine markdown files and one
existing registration array; `os/changes/<slug>/` is bucket content written at runtime by a
connected assistant following `change-process.md`, not application code.

## Complexity Tracking

*No constitution violations — this section is intentionally empty.*
