---

description: "Task list template for feature implementation"
---

# Tasks: Run Python Scripts via MCP Tool

**Input**: Design documents from `/specs/037-python-sandbox-tool/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/mcp-tools-python.md](./contracts/mcp-tools-python.md)

**Tests**: Not included — this repo has no automated test framework (research.md §5); verification is the manual [quickstart.md](./quickstart.md) walkthrough, run in the Polish phase.

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task includes its exact file path

## Path Conventions

Single Next.js app at `frontend/` (no separate backend/frontend split — see plan.md Project Structure). New code lands in `frontend/lib/python/sandbox.ts` (Monty integration) and `frontend/lib/mcp-tools/pythonTools.ts` (tool registration), following the existing `lib/<capability>/` + `lib/mcp-tools/<area>Tools.ts` pattern (messaging, spec 017; tree search, spec 022).

---

## Phase 1: Setup

**Purpose**: Get the dependency and the new files' skeletons in place and wired into the server, before any real sandbox logic exists.

- [X] T001 Install and pin `@pydantic/monty` at exact version `0.0.22` in `frontend/package.json`/`frontend/package-lock.json` (matching this repo's existing exact-pin convention) — already done and functionally spiked this session (research.md §1-§3): package installs, resolves the `linux-x64-gnu` native binary, and `Monty.create()` → `pool.checkout()` → `session.feedRun()` all work as documented
- [X] T002 Add `serverExternalPackages: ["@pydantic/monty"]` to `frontend/next.config.ts` (Next 16's stable key for excluding a package from bundling/tracing — needed since this is the project's first native/napi dependency, research.md §2)
- [X] T003 [P] Create `frontend/lib/python/sandbox.ts` with the pool singleton (`Monty` itself is the pool — no separate `Pool` type exists, per its own docs) and the `PythonSandboxError` class from data-model.md
- [X] T004 [P] Create `frontend/lib/mcp-tools/pythonTools.ts` exporting `registerPythonTools(server, disabledTools)` (mirroring `messagingTools.ts`'s shape)
- [X] T005 Wire `registerPythonTools` into `frontend/lib/mcp-tools/register.ts`'s `registerNativeTools`: import it and add `await registerPythonTools(server, disabledTools);` alongside the existing calls (register.ts:21-30) — this single addition is what makes `run_python` reachable from both `app/mcp/route.ts` and the scheduler's `toolRuntime.ts` (confirmed acceptable scope with the user, spec User Story 3). Verified via an in-process MCP client smoke test this session: `client.listTools()` includes `run_python`.

**Checkpoint**: New files exist and are registered (registering zero tools) — the server still starts and every existing tool behaves exactly as before.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The core sandbox execution and error-mapping logic every user story's tool call depends on (research.md §4, §6).

**⚠️ CRITICAL**: No user story task can begin until this phase is complete.

- [X] T006 In `frontend/lib/python/sandbox.ts`, implement `runPython(code, args, timeoutSeconds)`: `getMonty()` → `monty.checkout({ limits: { maxDurationSecs, maxMemory: 64_000_000 } })` → `feedRun(code, { inputs: args, printCallback })`, returning `{ stdout, stdoutTruncated, result, durationMs }` — dispose the session explicitly via `session[Symbol.asyncDispose]()` in a `finally` block. **Deviation from the original task text**: `maxRecursionDepth` is left unset rather than fixed to a custom value — Monty's own documented default (1000) is reused as-is rather than inventing a tighter one.
- [X] T007 **Deviation from the original task text**: rather than using Monty's built-in `CollectString` (which *throws* `MontyRuntimeError("MemoryError", ...)` once its own cap is exceeded instead of truncating — confirmed by reading `dist/print.js` — which would make "long output" indistinguishable from a genuine sandbox memory-limit failure), `runPython` passes a plain `printCallback` function with a manually bounded buffer (`MAX_STDOUT_CHARS = 100_000`) that silently stops appending and sets `stdoutTruncated = true`, satisfying FR-011 (truncate, don't fail) exactly.
- [X] T008 Implemented `mapMontyError(err)` per research.md §6, **refined further this session** after reading Monty's actual type definitions: `MontySyntaxError` → `syntax_error`; `MontyRuntimeError` with `exception.typeName === "MemoryError"` → `memory_limit_exceeded` (a real sandbox `maxMemory` violation — no longer conflated with stdout capping, per T007); `MontyRuntimeError` with message starting `"TimeoutError:"` → `timeout`; any other `MontyRuntimeError` → `runtime_error` (message passed through verbatim); `MontyCrashedError` (worker killed outright — a case not in the original research, found while reading `errors.d.ts`) → `timeout` when `err.timedOut` else `sandbox_unavailable`; anything else → `sandbox_unavailable`.
- [X] T009 Added `pythonErrorResult(err)` in `frontend/lib/mcp-tools/pythonTools.ts`, mirroring `messagingErrorResult()` exactly.

**Checkpoint**: Verified this session via an in-process MCP client (`withInProcessMcpClient`) calling the real `run_python` tool end-to-end (not a standalone script) — inline execution with `args`, `runtime_error` for an unsupported construct, `timeout`, and `invalid_input` all produced the expected `{ code, message }` shapes.

---

## Phase 3: User Story 1 - Run a Python snippet on demand (Priority: P1) 🎯 MVP

**Goal**: A connected agent submits inline Python source and gets back its output and produced value within the same request.

**Independent Test**: Run quickstart.md §1, §3, and §4's `while True` case — inline code with and without `args`, and each distinct error category (`invalid_input`/`syntax_error`/`runtime_error`/`timeout`) — all achievable without any saved-script support existing yet.

### Implementation for User Story 1

- [X] T010 [US1] Registered the `run_python` tool with the full Zod input shape (`code`/`path`/`args`/`timeoutSeconds`), cross-field validation done in-handler; description text proactively states the Python-subset limits, mirroring `send_email`'s `isHtml` warning pattern
- [X] T011 [US1] Handler validates exactly one of `code`/`path` via `(code === undefined) === (path === undefined)` → `pythonErrorResult(invalid_input)`
- [X] T012 [US1] `code`-provided branch calls `runPython(code, args, timeoutSeconds ?? 5)` and maps success to `ok({ stdout, stdoutTruncated, result, durationMs, source: "inline" })`, failure to `pythonErrorResult(err)`
- [X] T013 [US1] Added `{ name: "run_python", group: "Code Execution" }` to `TOOL_CATALOG`

**Checkpoint**: Verified this session via the in-process MCP client — inline `run_python` calls work end-to-end: `{code: "x=1+2\nprint(...)\nx*10", args:{n:6}}` → `{stdout:"hello, x = 3\n", result:30}`; unsupported-subset construct → `runtime_error`; infinite loop with `timeoutSeconds:1` → `timeout` after ~1s; empty call → `invalid_input`.

---

## Phase 4: User Story 2 - Run a script already saved in the workspace (Priority: P2)

**Goal**: A connected agent runs a `.py` file already stored in the workspace by referencing its location, without resending source text.

**Independent Test**: Run quickstart.md §2 — save via `create_file`, run by `path`, edit via `update_file` and rerun to confirm the latest content is used, and confirm a missing `path` fails the same way `read_file` already does.

### Implementation for User Story 2

- [X] T014 [US2] Implemented the `path`-provided branch: `readFile(path)` from `frontend/lib/storage/files.ts`, decoded to UTF-8; on failure `return errorResult(err)` unchanged; on success, `runPython()` with `source: { path }` in the result.

**Checkpoint**: Implemented and type-checked; **not empirically exercised this session** — `frontend/.env.local` points at a live external bucket (per spec 022's tasks.md precedent), and writing a test script there via `create_file` was deliberately not done without the user's explicit go-ahead. The code path reuses `readFile`/`errorResult` completely unchanged (only new code is the branch dispatch itself, already covered by T011's validation logic, which was verified), so residual risk is low but this quickstart.md §2 walkthrough is left for the user (or a follow-up session with an isolated bucket) to run.

---

## Phase 5: User Story 3 - Run a script on an automated schedule (Priority: P3)

**Goal**: A Scheduled Task (spec 032) can call `run_python` the same way a live-connected agent can.

**Independent Test**: Run quickstart.md §7 — a Scheduled Task configured to call `run_python` executes it on its cron cadence and reports the result in its run record.

### Implementation for User Story 3

- [X] T015 [US3] Confirmed by reading `frontend/lib/scheduler/toolRuntime.ts`: `withInProcessMcpClient` calls `registerNativeTools(server)` directly and `listMistralTools`/callers use `client.listTools()` — no separate allow/deny list exists. No code change needed; this is also exactly the code path used for T005/T010's in-process verification, so it's been exercised directly, not just read.

**Checkpoint**: All three user stories now work independently — the full `run_python` contract (contracts/mcp-tools-python.md) is complete and reachable from both live agents and Scheduled Tasks.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation consistency, closing the two open risks flagged in research.md, and end-to-end validation.

- [X] T016 [P] Added the `run_python` row to `specs/023-mcp-tool-toggle/contracts/mcp-tool-toggle-config.md`'s "Addressable tool names" table, under a new "Code execution (`pythonTools.ts`)" grouping.
- [X] T017 [P] Extended `frontend/instrumentation.ts` with a boot-time smoke test (`await runPython('1', undefined, 1)`) alongside `verifyStorageConnection()`. Verified this session: rebuilt (`npm run build`) and ran `npm run start` — no "Python sandbox is unavailable" warning appeared, confirming the native binary loads correctly in a production build, not just `next dev`.
- [X] T018 Empirically triggered a real `maxMemory` violation this session (`Monty.checkout({ limits: { maxMemory: 5_000_000 } })` + a 50M-element list allocation): confirmed it throws `MontyRuntimeError` with `exception.typeName === "MemoryError"` and message `"MemoryError: memory limit exceeded: 800031671 bytes > 5000000 bytes"` — **identical shape** to what `mapMontyError()` (T008) already handles. No code change needed; the mapping was correct on the first attempt.
- [X] T019 Reviewed `git status`/`git diff --stat`: only the planned files changed (`register.ts` +2 lines, `catalog.ts` +1 entry, `next.config.ts` +4 lines, `instrumentation.ts` +11 lines, `package.json`/`package-lock.json` for the new dependency, plus the new `lib/python/sandbox.ts` and `lib/mcp-tools/pythonTools.ts` files and the spec/doc files) — no existing tool's behavior was touched.
- [~] T020 Partially run this session via an in-process MCP client rather than a real connected client over HTTP (quickstart.md assumes an external MCP client, which requires OAuth setup out of scope for this pass): §1 (inline + args), §3 (syntax_error/runtime_error/timeout), and part of §4 (invalid_input) all verified with matching output. §2 (saved-script `path` execution) was **not** run against the live external bucket configured in `.env.local` (see T014's note) — left for the user. §5 (no network/fs/env access) and §6/§7 (tool-toggle UI, Scheduled Task UI) were not exercised interactively this session — the underlying mechanisms (no `mount`/`os` callback wired in; `registerGatedTool`; `registerNativeTools` shared with the scheduler) are unchanged/inherited from existing, already-proven code, but a human click-through is still worth doing.
- [~] T021 The `next build` half is now verified (T017's note) — the native binary loads correctly through Next's production bundling/tracing locally. **Still open**: an actual Coolify deployment (to confirm its base image is glibc, not musl) and an actual Vercel preview deploy. This remains the single highest-priority thing to verify before considering this feature production-ready.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately (T001 already done)
- **Foundational (Phase 2)**: Depends on Setup (T001-T005) — BLOCKS all three user stories (all rely on `runPython`/`mapMontyError`)
- **User Stories (Phase 3-5)**: All depend on Foundational (T006-T009) completion
  - US1 and US2 touch the same file (`pythonTools.ts`) but add independent branches of the same handler — implement in priority order (US1 then US2, recommended) since US2's branch is additive to US1's, not parallel-safe against it
  - US3 touches no new files — it's a verification task only, safe any time after Setup
- **Polish (Phase 6)**: Depends on all three user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundational — no dependency on US2/US3, fully testable with `code` alone
- **User Story 2 (P2)**: Depends on Foundational **and** builds on US1's tool registration (same handler, added branch) — not independently registrable as a separate tool, but independently testable once added (its own quickstart section)
- **User Story 3 (P3)**: Depends only on Setup (T005) — verification-only, no implementation dependency on US1/US2

### Within Each User Story

- Sandbox core (`runPython`/`mapMontyError`) before any tool handler that calls it
- Input validation before dispatching to either the `code` or `path` branch
- Tool registration (schema + description) before the branch-specific logic that fills in its handler

### Parallel Opportunities

- T003 and T004 (new-file skeletons) touch different files — parallelizable
- T016 and T017 (Polish phase, different files) are parallelizable with each other and with T018/T019

---

## Parallel Example: Setup

```bash
# After T001-T002, these two skeleton files can be created together:
Task: "Create frontend/lib/python/sandbox.ts skeleton (T003)"
Task: "Create frontend/lib/mcp-tools/pythonTools.ts skeleton (T004)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T009) — critical, blocks everything else
3. Complete Phase 3: User Story 1 (T010-T013)
4. **STOP and VALIDATE**: run quickstart.md §1, §3, §4 against the local dev server
5. `run_python` with inline code already delivers the core capability (execute Python on demand)

### Incremental Delivery

1. Setup + Foundational → sandbox core ready
2. Add User Story 1 (inline execution) → validate via quickstart §1/§3/§4 (MVP)
3. Add User Story 2 (saved-script execution) → validate via quickstart §2
4. Add User Story 3 (Scheduled Task exposure) → validate via quickstart §7 (likely already true by construction — confirm, don't assume)
5. Polish (tool-toggle doc, optional boot smoke test, memory-limit confirmation, Coolify/Vercel native-binary verification, full quickstart run)

---

## Notes

- No test tasks: this repo has no automated test framework (research.md §5); `quickstart.md` is the verification artifact
- T001 (dependency install + pin) is already done and spiked this session — left in the list for traceability, not as pending work
- The two genuinely open risks are both in Polish, not blocking earlier phases: T018 (memory-limit error shape) and T021 (native binary on Coolify/Vercel) — both should be resolved before considering this feature done, per research.md §2 and §6
- Commit after each task or logical group
- US1 and US2 share one tool registration (`run_python`) rather than being separate tools — "independently testable" here means each input mode (`code` vs `path`) is independently verifiable via quickstart, not that they're separate MCP tools
