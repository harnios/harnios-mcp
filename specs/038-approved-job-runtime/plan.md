# Implementation Plan: Persistent Job Runtime

**Branch**: `038-approved-job-runtime` | **Date**: 2026-09-15 | **Spec**: [spec.md](./spec.md)

## Summary

Add an MCP tool, `run_job`, that resolves a registered job from the Harnios S3 filesystem, validates its manifest and caller arguments, executes its persisted Python script through the existing Monty sandbox, and returns compact metadata. A per-run virtual filesystem maps only manifest-authorized S3 paths into the sandbox; reads are fetched on demand and writes remain in memory until the script succeeds and the output passes its size limit. Version one permits exactly one output file per run so publication can be atomic. `run_python` remains unchanged for ad-hoc, filesystem-free execution.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 App Router, Node.js runtime.

**Primary Dependencies**: Existing `@pydantic/monty/wasm`, MCP SDK, Zod, and S3 client. No new dependency.

**Storage**: Harnios S3 filesystem only. Registered artifacts are under `os/jobs/<jobId>/`: `manifest.json`, `script.py`, and optional `skill.md`. Inputs and the one published output remain at paths selected by the manifest.

**Testing**: Existing repository convention is manual, end-to-end quickstart validation; no test framework is added by this feature.

**Target Platform**: Existing Next.js MCP route and scheduled-task runtime, including the WASM Monty backend already selected for Coolify compatibility.

**Project Type**: Existing web service extension.

**Performance Goals**: A typical short job completes within its manifest limit and below the route's 60-second ceiling. The default limit is 5 seconds and the maximum is 20 seconds, matching `run_python`. Inputs are transferred only when the sandbox reads them; output metadata rather than file contents is returned.

**Constraints**:

- Job artifacts and workspace files use only the Harnios S3 filesystem; no repository, local disk, database, or new service is introduced.
- The sandbox has no host filesystem, network, or environment access. Its virtual paths map solely to explicitly authorized S3 paths.
- A job manifest defines its argument schema, script, one readable input path selected through an argument, one writable output path, timeout, output limit, and allowed summary fields. The runtime converts the validated S3 input argument to a normalized virtual path before exposing it to the script.
- Writes are staged for the run and published only after sandbox success and only if the required output was staged. Version one permits one output file, avoiding an impossible multi-object atomic commit over S3.
- The current decision allows any authenticated MCP client to edit `os/`. Thus manifests are trusted only as current configuration, not as an immutable approval boundary; access control for `os/` is intentionally deferred.

**Scale/Scope**: One additive tool and supporting job/virtual-filesystem modules. `run_python`, existing file tools, OAuth, and the scheduler protocol retain their behavior.

## Constitution Check

`.specify/memory/constitution.md` remains the unfilled Spec Kit template, so it creates no project-specific gates. The plan nevertheless follows existing conventions: reuse S3, route handlers, typed errors, gated MCP registration, and the current manual verification practice.

## Project Structure

### Documentation

```text
specs/038-approved-job-runtime/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── mcp-tools-jobs.md
```

### Source Code

```text
frontend/
├── lib/
│   ├── jobs/
│   │   ├── registry.ts          # Load and validate job artifacts from os/jobs/
│   │   ├── virtualFilesystem.ts # Per-run S3-backed Monty OS callback
│   │   └── runner.ts            # Resolve → validate → sandbox → publish result
│   ├── python/
│   │   └── sandbox.ts           # Extend with an internal OS-callback execution option
│   ├── mcp-tools/
│   │   ├── jobTools.ts          # registerJobTools(), run_job handler
│   │   ├── register.ts          # Register job tools
│   │   └── catalog.ts           # Catalog entry for run_job
│   └── storage/
│       └── files.ts             # Existing S3 read/write primitives reused
└── lib/docs/tools.md            # Document run_job; keep run_python's no-filesystem promise
```

**Structure Decision**: The registry, virtual filesystem, and run orchestration form a distinct `lib/jobs/` boundary. `sandbox.ts` keeps its reusable pool and error taxonomy, accepting an internal execution option rather than letting callers expose arbitrary OS callbacks. The MCP handler contains only input validation and result serialization.

## Complexity Tracking

No constitution violation or additional service is introduced. The virtual filesystem is necessary to meet the requirement that scripts process S3 files in place without host filesystem access.
