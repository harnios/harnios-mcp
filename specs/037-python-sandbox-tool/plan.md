# Implementation Plan: Run Python Scripts via MCP Tool

**Branch**: `037-python-sandbox-tool` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add one new MCP tool, `run_python`, that executes a small Python script — provided inline or by reference to an existing `.py` file already stored in the workspace — inside an in-process sandboxed interpreter ([Monty](https://github.com/pydantic/monty), `@pydantic/monty`), and returns its captured stdout and final-expression value within the same request. No external service, container, or VM is used, so the tool behaves identically whether harness-mcp runs on Vercel serverless or self-hosted via Coolify. The sandboxed script gets no filesystem/network/env access in this version. Registered through the existing `registerNativeTools` path, so it is available to both live-connected agents and Scheduled Tasks (spec 032), same as every other tool — confirmed with the user as acceptable scope.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router), Node.js runtime — same as the rest of `frontend/`. No new language/runtime for the app itself.

**Primary Dependencies**: `@pydantic/monty` (NEW — pinned exact version `0.0.22`, matching this repo's existing convention of exact-pinned dependencies), imported from its **WASM entrypoint** (`@pydantic/monty/wasm`), not the native napi entrypoint (`@pydantic/monty`) — the native `linux-x64-gnu` binary requires GLIBC >= 2.38, newer than Coolify's Debian Bookworm build base (GLIBC 2.36), confirmed by reproducing the failure via SSH on the actual production host (research.md §2). The WASM backend has no glibc dependency and is deliberately API-identical to the native one. `@modelcontextprotocol/sdk` + `mcp-handler` (tool registration/transport, existing), `zod` (input schema, existing) — no other new dependencies.

**Storage**: The existing single S3-compatible bucket (spec 001/007) — the `path` input case reads a `.py` file through the existing `readFile()` in `frontend/lib/storage/files.ts`, completely unchanged. No new storage system.

**Testing**: No automated test framework exists in this repo (research.md §5, consistent with specs 002/011/022) and none is introduced for this feature — verification is the manual `quickstart.md` walkthrough.

**Target Platform**: Same stateless Next.js Route Handler as the rest of the app, deployed to both Vercel (serverless, `maxDuration: 60`) and self-hosted Coolify (Docker/Railpack). Using Monty's WASM backend rather than its native napi build (research.md §2) means this project still has no native/glibc-dependent runtime code, keeping platform compatibility a non-issue across both deploy targets.

**Project Type**: Web service extension — new modules inside the existing single Next.js app (`frontend/`), not a new project/service.

**Performance Goals**: A run should complete and return within a few seconds for a small script — well under the MCP route's 60s `maxDuration` ceiling (`frontend/app/mcp/route.ts`), with the tool's own configurable timeout (default 5s, max 20s) leaving real headroom (research.md §4).

**Constraints**: Sandboxed script has zero filesystem/network/env access in this version (spec FR-008) — no host capability is wired into Monty's `externalLookup` in v1. Output is capped with an explicit truncation flag rather than returned unbounded (spec FR-011). Monty interprets a Python subset only — no third-party packages, no class inheritance, no generators, no `match`/`del`/`async with` (research.md §3) — this is a hard constraint on what scripts can do, not a tunable, and the tool description must set that expectation for callers.

**Scale/Scope**: One new tool, two new small library files, no changes to any existing tool's behavior — same additive scope as specs 017 and 022.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no project-specific principles have been ratified) — there are no gates to evaluate against. No violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/037-python-sandbox-tool/
├── plan.md                          # This file (/speckit-plan command output)
├── research.md                      # Phase 0 output (/speckit-plan command)
├── data-model.md                    # Phase 1 output (/speckit-plan command)
├── quickstart.md                    # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── mcp-tools-python.md          # Phase 1 output (/speckit-plan command)
└── tasks.md                         # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

This repo has no separate backend/frontend split — everything deployable lives in the single `frontend/` Next.js app. This feature follows the existing `lib/<capability>/` (implementation) + `lib/mcp-tools/<area>Tools.ts` (MCP registration) layering already used by messaging (spec 017) and tree search (spec 022):

```text
frontend/
├── lib/
│   ├── python/
│   │   └── sandbox.ts          # NEW — Monty pool singleton, runPython(), PythonSandboxError, error mapping
│   ├── storage/
│   │   └── files.ts            # existing — readFile(), reused unchanged for the `path` input case
│   └── mcp-tools/
│       ├── register.ts         # existing — add `await registerPythonTools(server, disabledTools)`
│       ├── catalog.ts          # existing — add { name: "run_python", group: "Code Execution" }
│       ├── messagingTools.ts   # existing — pattern this feature's error-result helper follows
│       └── pythonTools.ts      # NEW — registerPythonTools(server, disabledTools): run_python
├── next.config.ts              # existing — add serverExternalPackages: ["@pydantic/monty"]
└── instrumentation.ts          # existing — optionally extended with a boot-time sandbox smoke test alongside the existing verifyStorageConnection()
```

**Structure Decision**: New logic lives in two new files (`lib/python/sandbox.ts`, `lib/mcp-tools/pythonTools.ts`), mirroring the existing `lib/<capability>/` + `lib/mcp-tools/<area>Tools.ts` split. `register.ts` and `catalog.ts` each get one addition. `next.config.ts` gets one new `serverExternalPackages` entry. No existing tool's behavior changes.

## Complexity Tracking

*No constitution gates apply (see Constitution Check above) — this section is not needed.*
