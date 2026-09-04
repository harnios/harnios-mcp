# Contract: `run_python`

**Input**: [spec.md](../spec.md), [data-model.md](../data-model.md), [research.md](../research.md)

**Adds (additively)**: One new MCP tool. No existing tool is renamed, changed, or removed by this feature. Registered via `registerNativeTools` (`frontend/lib/mcp-tools/register.ts`), so it is available to both live-connected agents and Scheduled Tasks (spec 032), same as every other native tool.

## `run_python`

Executes a Python script — inline or read from an existing file in storage — inside an in-process sandbox (Monty), and returns its output within the same call. No filesystem/network/env access is available to the executed script.

- **Input**:
  ```ts
  {
    code?: string;            // inline Python source
    path?: string;            // path to an existing .py file in storage, e.g. "scripts/report.py"
    args?: Record<string, unknown>;  // named values bound as globals in the script
    timeoutSeconds?: number;  // 1-20, default 5
  }
  ```
  Exactly one of `code`/`path` MUST be provided (data-model.md RunRequest, spec FR-004).

- **Output** (success):
  ```ts
  {
    stdout: string;
    stdoutTruncated: boolean;
    result: unknown | null;   // value of the script's last top-level expression
    durationMs: number;
    source: "inline" | { path: string };
  }
  ```

- **Errors**:
  - `path`-read failures use the existing file-tool error convention unchanged: `isError: true`, `{ code, message }` with `code` one of the existing `StorageError` codes (`not_found`, `type_mismatch`, `storage_unreachable`) — no new codes for this case.
  - All other failures use a new, dedicated error namespace (`PythonSandboxError`, data-model.md), same shape (`isError: true`, `{ code, message }`):

    | Code | Meaning |
    |---|---|
    | `invalid_input` | Neither or both of `code`/`path` given. |
    | `syntax_error` | The script does not parse. |
    | `runtime_error` | The script parsed but failed while running, including use of a construct outside Monty's supported Python subset (research.md §3, §6). |
    | `timeout` | The run exceeded `timeoutSeconds`. |
    | `memory_limit_exceeded` | The run exceeded its fixed memory ceiling. |
    | `sandbox_unavailable` | The sandbox itself failed to initialize (research.md §2). |

- **Satisfies**: spec 037 FR-001 through FR-011.

## Cross-cutting

- No capability (filesystem, network, environment variables) beyond the caller-supplied `args` is available inside the executed script (spec FR-008) — this is an explicit non-goal for v1, not an oversight; extending it is left for a future spec (spec.md Assumptions).
- Subject to the same per-workspace tool enable/disable control as every other tool (spec FR-009) — added to `TOOL_CATALOG` (`frontend/lib/mcp-tools/catalog.ts`) under a new `"Code Execution"` group, and to the addressable-tool-names table in `specs/023-mcp-tool-toggle/contracts/mcp-tool-toggle-config.md`.
- Only Python source is accepted as `code`/via `path` — no other language, and no ability to install or reference third-party packages (research.md §3).
- A script run through `path` always reflects that file's current saved content at call time (spec User Story 2, Acceptance Scenario 2) — there is no separate caching or versioning of script content by this tool.
