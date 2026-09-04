// Uses the WASM backend (@pydantic/monty/wasm), not the native napi build
// (@pydantic/monty) — the native build's precompiled linux-x64-gnu binary
// requires GLIBC 2.38, which is newer than Debian Bookworm's 2.36 (the base
// this project's production hosts use); the WASM backend has no such
// requirement and exposes an API deliberately kept identical to the native
// one (same Monty/MontySession/CollectString/MontySyntaxError/
// MontyRuntimeError/MontyCrashedError), so nothing below needed to change.
import { Monty, MontyCrashedError, MontyRuntimeError, MontySyntaxError, type WorkerPool } from "@pydantic/monty/wasm";

/** Distinct failure categories for run_python (spec 037 FR-007, data-model.md PythonSandboxError). */
export type PythonSandboxErrorCode =
  | "invalid_input"
  | "syntax_error"
  | "runtime_error"
  | "timeout"
  | "memory_limit_exceeded"
  | "sandbox_unavailable";

/** Structured sandbox failure, mirroring StorageError/MessagingError's `{ code, message }` shape. */
export class PythonSandboxError extends Error {
  constructor(
    public readonly code: PythonSandboxErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PythonSandboxError";
  }
}

/** Fixed, non-caller-configurable resource ceiling (research.md §4) — only wall-clock is caller-tunable. */
const DEFAULT_MAX_MEMORY_BYTES = 64_000_000;

/**
 * Cap on captured stdout (spec FR-011). A plain callback with a manually
 * bounded buffer is used instead of Monty's built-in `CollectString`
 * specifically because `CollectString` *throws* `MontyRuntimeError`
 * (`MemoryError`) once its own cap is exceeded (dist/print.js) rather than
 * truncating — which would turn "the script printed a lot" into a hard
 * failure indistinguishable from a genuine sandbox `maxMemory` violation
 * (both raise the identically-worded `"memory limit exceeded: X bytes > Y
 * bytes"`, deliberately kept in sync per that file's own comment). Silently
 * capping here instead keeps `memory_limit_exceeded` meaning only "the
 * sandbox's own resource limit was hit," not "stdout was long."
 */
const MAX_STDOUT_CHARS = 100_000;

// Lazily created, reused across calls within this process — mirrors the
// module-level singleton idiom already used for the S3 client
// (frontend/lib/storage/client.ts). `Monty.create()` resolves to a
// `WorkerPool` (a pool of wasm workers) on this backend — unlike the native
// backend, where `Monty` itself is the pool — but the resulting object has
// the same `checkout()`/`close()`/`[Symbol.asyncDispose]()` shape.
let montyPromise: Promise<WorkerPool> | null = null;
function getMonty(): Promise<WorkerPool> {
  montyPromise ??= Monty.create();
  return montyPromise;
}

export interface RunPythonResult {
  stdout: string;
  stdoutTruncated: boolean;
  result: unknown;
  durationMs: number;
}

/**
 * Runs `code` in a fresh, isolated Monty session with no filesystem/network/
 * env access (spec FR-008 — no `mount`/`os` callback is wired in; `args` is
 * the only way data enters the script). Throws `PythonSandboxError` on any
 * failure — never a raw Monty exception — so callers only need to handle one
 * error type (contracts/mcp-tools-python.md).
 */
export async function runPython(
  code: string,
  args: Record<string, unknown> | undefined,
  timeoutSeconds: number,
): Promise<RunPythonResult> {
  let monty: WorkerPool;
  try {
    monty = await getMonty();
  } catch (err) {
    throw new PythonSandboxError("sandbox_unavailable", describeUnknown(err));
  }

  let stdout = "";
  let stdoutTruncated = false;
  const printCallback = (_stream: "stdout" | "stderr", text: string): void => {
    if (stdoutTruncated) return;
    const remaining = MAX_STDOUT_CHARS - stdout.length;
    if (text.length <= remaining) {
      stdout += text;
    } else {
      stdout += text.slice(0, remaining);
      stdoutTruncated = true;
    }
  };

  const started = Date.now();
  let session;
  try {
    session = await monty.checkout({
      limits: { maxDurationSecs: timeoutSeconds, maxMemory: DEFAULT_MAX_MEMORY_BYTES },
    });
  } catch (err) {
    throw new PythonSandboxError("sandbox_unavailable", describeUnknown(err));
  }

  try {
    const result = await session.feedRun(code, { inputs: args, printCallback });
    return { stdout, stdoutTruncated, result: result ?? null, durationMs: Date.now() - started };
  } catch (err) {
    throw mapMontyError(err);
  } finally {
    await session[Symbol.asyncDispose]();
  }
}

/**
 * Maps a thrown Monty error to a `PythonSandboxError` (research.md §6,
 * empirically verified — not assumed from docs). Only `MontySyntaxError`
 * maps unambiguously by class; a `MontyRuntimeError` covers genuine runtime
 * exceptions, unsupported-Python-subset constructs (surfacing as
 * `NotImplementedError`), a real sandbox `maxMemory` violation (surfacing as
 * `MemoryError`), *and* the in-sandbox wall-clock limit (surfacing as
 * `TimeoutError`) alike, so the leading token of its message decides between
 * them. `MontyCrashedError` (worker killed outright) maps to `timeout` when
 * the pool's own watchdog was what fired, otherwise `sandbox_unavailable`.
 */
function mapMontyError(err: unknown): PythonSandboxError {
  if (err instanceof MontySyntaxError) {
    return new PythonSandboxError("syntax_error", err.message);
  }
  if (err instanceof MontyRuntimeError) {
    if (err.exception.typeName === "MemoryError") {
      return new PythonSandboxError("memory_limit_exceeded", err.message);
    }
    if (err.message.startsWith("TimeoutError:")) {
      return new PythonSandboxError("timeout", err.message);
    }
    return new PythonSandboxError("runtime_error", err.message);
  }
  if (err instanceof MontyCrashedError) {
    return new PythonSandboxError(err.timedOut ? "timeout" : "sandbox_unavailable", err.message);
  }
  return new PythonSandboxError("sandbox_unavailable", describeUnknown(err));
}

function describeUnknown(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
