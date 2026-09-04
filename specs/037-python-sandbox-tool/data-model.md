# Data Model: Run Python Scripts via MCP Tool

**Input**: [spec.md](spec.md), [research.md](research.md)

This feature introduces no persisted entities — nothing about a run is stored in the bucket. The only persisted thing involved is the caller's own `.py` script file, which already exists as an ordinary entry in the existing S3-backed storage (spec 001/002) and is read, not written, by this feature (research.md §7). The "entities" below are in-memory shapes used by the new tool.

## RunRequest

The validated input to one `run_python` call (User Stories 1 and 2).

| Field | Type | Notes |
|---|---|---|
| `code` | `string \| undefined` | Inline Python source. Exactly one of `code`/`path` must be present (FR-004). |
| `path` | `string \| undefined` | Location of an existing `.py` file in storage, same path format every other file tool uses. Exactly one of `code`/`path` must be present. |
| `args` | `Record<string, unknown> \| undefined` | Named values bound as globals in the script (FR-005). Must be JSON-safe. |
| `timeoutSeconds` | `number \| undefined` | Caller-supplied wall-clock ceiling; defaults to 5, capped at 20 (research.md §4). |

When `path` is set, its content is fetched via the existing `readFile()` (`frontend/lib/storage/files.ts`) before a `RunRequest`'s `code` is considered resolved — `readFile()`'s own `StorageError` (`not_found`, `type_mismatch`, `storage_unreachable`) propagates unchanged through the existing `errorResult()` convention (Edge Cases: "reference to a saved script that doesn't exist").

## RunResult

What a successful `run_python` call returns (FR-001, FR-006).

| Field | Type | Notes |
|---|---|---|
| `stdout` | `string` | Everything the script printed, captured via Monty's `CollectString`. |
| `stdoutTruncated` | `boolean` | `true` if `stdout` was capped before the script finished producing output (FR-011). |
| `result` | `unknown \| null` | The value of the script's last top-level expression (Monty's REPL-style return), or `null` if the script produced none. |
| `durationMs` | `number` | Wall-clock time the run actually took. |
| `source` | `"inline" \| { path: string }` | Echoes which input form was used, so a caller working from a saved script can confirm which one ran. |

## PythonSandboxError

The distinct failure shape for everything that isn't a `path`-read failure (FR-007) — mirrors `MessagingError`'s pattern (spec 017) of a dedicated error-code namespace alongside the existing `StorageError`.

| Code | Meaning | Maps from (research.md §6) |
|---|---|---|
| `invalid_input` | Neither or both of `code`/`path` given. | Validated before any Monty call is made. |
| `syntax_error` | The script does not parse. | `MontySyntaxError`. |
| `runtime_error` | The script parsed but failed while running — including a genuine Python exception (e.g. `ZeroDivisionError`) and an unsupported-subset construct (e.g. class inheritance) surfacing as `NotImplementedError`. | `MontyRuntimeError`, message prefix other than `"TimeoutError:"`. |
| `timeout` | The run exceeded `timeoutSeconds`. | `MontyRuntimeError`, message prefix `"TimeoutError:"`. |
| `memory_limit_exceeded` | The run exceeded its fixed memory ceiling. | `MontyRuntimeError` with `exception.typeName === "MemoryError"` (research.md §6, empirically confirmed during implementation). |
| `sandbox_unavailable` | The native sandbox module failed to load or initialize (e.g. missing platform binary — research.md §2). | Anything thrown outside a normal script run, before/instead of a `feedRun()` result. |

## Relationships / flow

```
run_python({ code | path, args?, timeoutSeconds? })
  └─ validate exactly one of code/path (FR-004)
       ├─ invalid → PythonSandboxError("invalid_input")
       └─ valid:
            path given → readFile(path)                      # existing storage/files.ts, unchanged
                           ├─ failure → errorResult(err)       # existing StorageError convention, untouched
                           └─ success → code = content
            └─ runPython(code, args, timeoutSeconds)          # lib/python/sandbox.ts (NEW)
                 ├─ success → RunResult
                 └─ failure → mapMontyError(err) → PythonSandboxError → pythonErrorResult()
```

No new error types are introduced beyond `PythonSandboxError` — the `path`-read path continues to use the existing `errorResult()`/`StorageError` convention unchanged, exactly as `messagingTools.ts` already keeps its own error namespace alongside the file tools' (research.md §7, spec 017 precedent).
