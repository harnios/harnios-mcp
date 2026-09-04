import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { readFile } from "@/lib/storage/files";
import { PythonSandboxError, runPython } from "@/lib/python/sandbox";
import { z } from "zod";
import { errorResult, ok } from "./result";
import { registerGatedTool } from "./toolGate";

const DEFAULT_TIMEOUT_SECONDS = 5;
const MAX_TIMEOUT_SECONDS = 20;

/**
 * Wraps a PythonSandboxError as an MCP `isError` result with the same
 * `{ code, message }` shape as lib/mcp-tools/result.ts's errorResult() and
 * messagingTools.ts's messagingErrorResult(), so callers use one parsing
 * convention across every tool in this server. A `path`-read failure never
 * reaches this helper — it goes through the unmodified `errorResult()`
 * instead (contracts/mcp-tools-python.md).
 */
function pythonErrorResult(err: unknown): CallToolResult {
  const sandboxError = err instanceof PythonSandboxError
    ? err
    : new PythonSandboxError("sandbox_unavailable", (err as Error)?.message ?? String(err));
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify({ code: sandboxError.code, message: sandboxError.message }) }],
  };
}

/** Registers the run_python MCP tool (spec 037). */
export async function registerPythonTools(server: McpServer, disabledTools: ReadonlySet<string>): Promise<void> {
  registerGatedTool(
    server,
    disabledTools,
    "run_python",
    {
      title: "Run Python",
      description:
        "Runs a small Python script in an isolated, in-process sandbox and returns what it printed plus " +
        "the value of its last top-level expression. Provide exactly one of code (inline source) or path " +
        "(an existing .py file already in storage, read the same way read_file does) — providing both or " +
        "neither fails immediately. IMPORTANT: this is NOT full Python — no third-party packages (no pip, " +
        "no numpy/pandas/etc.), no class inheritance, no generators, no match statements, no async " +
        "with/for. Writing ordinary Python that uses any of these will fail with a runtime_error naming " +
        "the unsupported construct, not silently work. The script has NO network, filesystem, or " +
        "environment-variable access — use args to pass it any data it needs. Runs are capped by " +
        "timeoutSeconds (default 5, max 20).",
      inputSchema: {
        code: z.string().optional().describe(
          "Inline Python source to run. Provide exactly one of code or path.",
        ),
        path: z.string().optional().describe(
          'Path to an existing .py file in storage to run instead of inline code, e.g. "scripts/report.py" ' +
            "— read the same way read_file does. Provide exactly one of code or path.",
        ),
        args: z.record(z.string(), z.unknown()).optional().describe(
          "Named values made available directly as variables in the script's global scope (not sys.argv) " +
            '— e.g. {"n": 5} lets the script reference n directly. Values must be JSON-safe.',
        ),
        timeoutSeconds: z.number().int().min(1).max(MAX_TIMEOUT_SECONDS).optional().describe(
          `Max wall-clock seconds before the run is aborted. Defaults to ${DEFAULT_TIMEOUT_SECONDS}, capped at ${MAX_TIMEOUT_SECONDS}.`,
        ),
      },
    },
    async ({ code, path, args, timeoutSeconds }) => {
      if ((code === undefined) === (path === undefined)) {
        return pythonErrorResult(
          new PythonSandboxError("invalid_input", "Provide exactly one of code or path, not both or neither."),
        );
      }

      let source: string;
      let sourceLabel: "inline" | { path: string };
      if (path !== undefined) {
        try {
          const file = await readFile(path);
          source = file.content.toString("utf-8");
        } catch (err) {
          return errorResult(err);
        }
        sourceLabel = { path };
      } else {
        source = code as string;
        sourceLabel = "inline";
      }

      try {
        const { stdout, stdoutTruncated, result, durationMs } = await runPython(
          source,
          args,
          timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS,
        );
        return ok({ stdout, stdoutTruncated, result, durationMs, source: sourceLabel });
      } catch (err) {
        return pythonErrorResult(err);
      }
    },
  );
}
