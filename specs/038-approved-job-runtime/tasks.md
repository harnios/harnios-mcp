---

description: "Task list for Persistent Job Runtime implementation"
---

# Tasks: Persistent Job Runtime

**Input**: Design documents from `/specs/038-approved-job-runtime/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/mcp-tools-jobs.md](./contracts/mcp-tools-jobs.md)

**Tests**: No automated-test task is included because the repository's established convention is manual end-to-end verification. Each checkpoint references [quickstart.md](./quickstart.md); add automated coverage only when the project adopts a test harness.

**Organization**: Tasks are grouped by user story after shared runtime prerequisites, so the externally visible behavior can be validated incrementally.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files and no incomplete dependency)
- **[Story]**: User story in [spec.md](./spec.md)
- Every task names its exact target file.

## Path Conventions

All deployable code belongs to the Next.js app in `frontend/`. New job-runtime code belongs under `frontend/lib/jobs/`; MCP registration belongs in `frontend/lib/mcp-tools/`. Job artifacts are runtime S3 content under `os/jobs/<jobId>/`, not repository files.

---

## Phase 1: Setup

**Purpose**: Create the additive job-runtime module boundary and expose the new tool in the existing registration system.

- [X] T001 Create the `frontend/lib/jobs/` module boundary and skeleton exports in `frontend/lib/jobs/registry.ts`, `frontend/lib/jobs/virtualFilesystem.ts`, and `frontend/lib/jobs/runner.ts`.
- [X] T002 [P] Create `frontend/lib/mcp-tools/jobTools.ts` with the `registerJobTools(server, disabledTools)` skeleton following `frontend/lib/mcp-tools/pythonTools.ts`.
- [X] T003 [P] Add `{ name: "run_job", group: "Jobs" }` to `frontend/lib/mcp-tools/catalog.ts` and import/register `registerJobTools` in `frontend/lib/mcp-tools/register.ts` through `registerNativeTools`.

**Checkpoint**: `run_job` has a defined implementation location and shares the existing native-tool/scheduler registration path, but does not execute a job yet.

---

## Phase 2: Foundational Runtime (Blocking Prerequisites)

**Purpose**: Establish validated persisted artifacts, strict per-run S3 path policy, sandbox execution options, and error/result shapes required by every user story.

**⚠️ CRITICAL**: No user-story handler work begins until these tasks are complete.

- [X] T004 Define `JobManifest`, `RunJobRequest`, `RunJobResult`, `JobError`, strict lowercase-hyphen `jobId` validation, and the exact v1 manifest Zod schema in `frontend/lib/jobs/registry.ts`; require matching `id`, positive `version`, one path-valued input policy, one fixed output path, `timeoutSeconds` in 1–20, positive output byte limit, and allowlisted summary keys.
- [X] T005 Implement artifact resolution in `frontend/lib/jobs/registry.ts` that reads only `os/jobs/<jobId>/manifest.json` and `os/jobs/<jobId>/script.py` through `readFile()`, decodes UTF-8, maps missing artifacts to `job_not_found`, and maps malformed JSON/schema/id mismatch to `job_invalid` before loading a caller-selected input.
- [X] T006 Implement argument validation in `frontend/lib/jobs/registry.ts`: accept only the declared path argument plus manifest-declared JSON-safe scalar settings; normalize the selected S3 path; require its prefix as complete path components and one permitted extension; return `invalid_input` or `input_denied` without exposing unpermitted file existence; bind the validated path to the script only as its normalized virtual absolute path.
- [X] T007 Implement the per-run callback factory in `frontend/lib/jobs/virtualFilesystem.ts` for normalized virtual paths: permit reading exactly the resolved input; stage writing exactly the manifest output in memory; let a run read back its own overlay; reject unmatched reads, writes, listing, deletion, rename, `os.getenv`, and environment access as `filesystem_denied`; enforce the output byte ceiling on every staged write.
- [X] T008 Extend the internal API in `frontend/lib/python/sandbox.ts` so `runner.ts` can pass an OS callback into `session.feedRun()` while `runPython()` continues to grant no filesystem callback to existing `run_python`; preserve its current timeout, memory, stdout-cap, and exception mapping behavior.
- [X] T009 Implement `runRegisteredJob()` in `frontend/lib/jobs/runner.ts`: resolve artifacts, validate arguments, create one virtual-filesystem overlay, execute the persisted script with its manifest timeout, validate that the trailing script result is an object containing only allowlisted primitive/null summary fields, and map sandbox errors to the `JobError` contract.
- [X] T010 Extend `frontend/lib/jobs/virtualFilesystem.ts` and `frontend/lib/jobs/runner.ts` with deferred publication: require exactly one staged output, publish it through `createFile()` only after successful execution and summary validation; map absent output to `output_missing`, size overflow to `output_too_large`, publish exceptions to `publish_failed`, and return S3 metadata without stdout or file contents.

**Checkpoint**: The runtime can resolve a valid S3 job, confine the script to one input and one staged output, and publish only after a successful run. The open-write policy of `os/` remains intentionally unchanged and documented as non-secure.

---

## Phase 3: User Story 1 - Run a Registered Workflow (Priority: P1) 🎯 MVP

**Goal**: A connected client invokes a registered job by identifier and gets metadata for a completed in-place transformation, not file contents.

**Independent Test**: Follow [quickstart.md](./quickstart.md) §1 with an isolated `os/jobs/example-transform/` artifact directory and permitted input; confirm output publication and metadata-only result.

### Implementation for User Story 1

- [X] T011 [US1] Implement the `run_job` Zod input schema in `frontend/lib/mcp-tools/jobTools.ts` with exactly `jobId` and `args`, rejecting code, script path, filesystem, and caller timeout inputs through the structured `JobError` response.
- [X] T012 [US1] Wire `run_job` in `frontend/lib/mcp-tools/jobTools.ts` to `runRegisteredJob()` and serialize the contract's metadata-only success and `{ code, message }` error results.
- [X] T013 [US1] Define the exact representative, non-domain-specific `os/jobs/example-transform/manifest.json`, `script.py`, optional `skill.md`, and input-file contents in `specs/038-approved-job-runtime/quickstart.md`; create them only in an isolated S3 workspace during validation, never in a live configured bucket without explicit authorization.

**Checkpoint**: A live or in-process MCP client can complete one registered job run and receives only job version, output metadata, duration, and declared summary values.

---

## Phase 4: User Story 2 - Keep Workflows Separate from Conversations (Priority: P2)

**Goal**: Calls cannot supply code or alter resolved workflow behavior for that run; manifests/scripts persist in S3 under `os/` and are revalidated on each invocation.

**Independent Test**: Follow [quickstart.md](./quickstart.md) §6 and call a known job with extra code/path/permission-shaped fields; confirm `job_not_found`, `job_invalid`, or `invalid_input` before input storage is accessed.

### Implementation for User Story 2

- [X] T014 [US2] Harden `frontend/lib/jobs/registry.ts` against artifact escape and ambiguity: reject job identifiers with separators or whitespace, reject scripts/manifests outside the one computed `os/jobs/<jobId>/` prefix, and ensure the manifest cannot declare host paths, credentials, callbacks, network settings, or caller-selected permissions.
- [X] T015 [US2] Update `frontend/lib/docs/tools.md` and the `run_python` description in `frontend/lib/mcp-tools/pythonTools.ts` to distinguish filesystem-free ad-hoc `run_python` from persisted `run_job`, including the current caveat that any authenticated client can edit `os/` and it is not yet an approval boundary.
- [X] T016 [US2] Add `run_job` to `specs/023-mcp-tool-toggle/contracts/mcp-tool-toggle-config.md` and verify `frontend/lib/mcp-tools/catalog.ts`/`registerGatedTool` omit the entire `run_job` surface from discovery when disabled; do not add per-job disabling in v1.

**Checkpoint**: A run request's only authority is a job id plus declared arguments; it cannot carry executable code or permission expansion. Persistent artifacts are demonstrably reloaded from `os/` on each run.

---

## Phase 5: User Story 3 - Enforce Per-Workflow Data Boundaries (Priority: P3)

**Goal**: A running job reaches only its manifest-selected S3 input and output, never host files, sibling workspace files, network, or environment state.

**Independent Test**: Follow [quickstart.md](./quickstart.md) §2–§5: denied input, denied sibling/host/environment access, failed staged write preserving the old output, and output-limit rejection.

### Implementation for User Story 3

- [X] T017 [US3] Complete operation-specific handling in `frontend/lib/jobs/virtualFilesystem.ts` for `Path.read_text`, `Path.read_bytes`, `Path.write_text`, `Path.write_bytes`, append variants, `open`, `exists`, `is_file`, and `stat`, while preserving exact-path authorization and no-existence-leak behavior for all non-authorized paths.
- [X] T018 [US3] Refine `frontend/lib/jobs/runner.ts` and `frontend/lib/mcp-tools/jobTools.ts` to distinguish `filesystem_denied`, `execution_failed`, `timeout`, `output_too_large`, and `publish_failed`, while forwarding established S3 availability/type errors unchanged where the contract permits.
- [X] T019 [US3] Verify `run_job` is reachable from scheduled tasks through `frontend/lib/scheduler/toolRuntime.ts`'s shared `registerNativeTools` path and document the identical metadata-only behavior in `specs/038-approved-job-runtime/quickstart.md` §7.

**Checkpoint**: All virtual filesystem boundary cases pass manually; an unauthorized operation does not reveal file contents or alter an output.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finish operator-facing documentation and execute the full validation path.

- [X] T020 [P] Update the tool inventory and user-facing copy in `frontend/lib/docs/tools.md` for the `Jobs` group, input contract, metadata-only response, one-output limit, and deferred `os/` write security.
- [ ] T021 Run every scenario in `specs/038-approved-job-runtime/quickstart.md` against an isolated S3 workspace, including allowed run, invalid job, denied input/path, staged-write failure, output ceiling, timeout, disable toggle, and scheduled run; record any unresolved result in `specs/038-approved-job-runtime/quickstart.md`.
- [ ] T022 Review `git diff --check`, `npm run build` from `frontend/`, and the actual MCP tool list; verify no behavior change to filesystem-free `run_python` and no unplanned modification to existing file tools.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **Foundational (Phase 2)**: Depends on T001–T003 and blocks every user story.
- **US1 (Phase 3)**: Depends on T004–T010.
- **US2 (Phase 4)**: Depends on the artifact resolver in T004–T006; may proceed after the foundation but its documentation work should follow T011–T012 to describe the actual interface.
- **US3 (Phase 5)**: Depends on T007–T010 and benefits from the runnable US1 handler.
- **Polish (Phase 6)**: Depends on all intended user stories.

### User Story Dependencies

- **US1 (P1)**: Provides the smallest useful delivery: invoke one valid registered job and receive metadata.
- **US2 (P2)**: Builds on the same resolver but is independently testable through malformed/extra request inputs and artifact reload behavior.
- **US3 (P3)**: Builds on the virtual filesystem created for US1 and verifies its negative security cases.

### Parallel Opportunities

- T002 and T003 can proceed in parallel with T001's module skeleton creation.
- After T004, manifest resolution (T005) and sandbox extension (T008) touch different files and can proceed in parallel; T006 follows T005, and T007 informs T009.
- T015 and T016 can proceed in parallel after `run_job` is registered.
- T020 can proceed in parallel with T021 once implementation is complete.

---

## Parallel Example: Foundation

```text
Task: "Implement artifact resolution in frontend/lib/jobs/registry.ts"
Task: "Extend sandbox execution option in frontend/lib/python/sandbox.ts"
```

## Implementation Strategy

### MVP First (US1)

1. Finish setup and the shared runtime foundation.
2. Implement T011–T012 to expose `run_job`.
3. Validate one isolated job that reads one authorized input, writes one staged output, and returns metadata only.
4. Do not claim `os/` artifact approval or writer isolation: that is intentionally deferred.

### Incremental Delivery

1. US1 delivers generic S3-persisted job execution.
2. US2 clarifies the persisted-artifact contract and avoids confusion with `run_python`.
3. US3 proves negative path and publication-safety behavior.
4. Polish validates live, scheduled, disabled, and build behavior.
