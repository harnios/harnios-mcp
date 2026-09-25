import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { ToolCallResult } from "@/lib/mcp-tools/inProcessClient";
import { callTool } from "@/lib/mcp-tools/inProcessClient";

export type BehaviorToolExecution = "real" | "dry_run";
export type BehaviorToolOutcome = "success" | "error" | "simulated_success";

export interface BehaviorToolTraceEntry {
  name: string;
  arguments: unknown;
  execution: BehaviorToolExecution;
  outcome: BehaviorToolOutcome;
  application_status: "not_applicable" | "not_applied";
  result_preview: unknown;
}

export interface BehaviorToolExecutionContext {
  trace: BehaviorToolTraceEntry[];
  signal?: AbortSignal;
}

const REAL_READ_ONLY_TOOLS = new Set([
  "read_file",
  "list_directory",
  "list_directory_tree",
  "find_files_by_name",
  "search_file_content",
  "get_os_engine",
  "get_os_upgrade",
  "get_os_init",
  "get_change_process",
  "get_inbox",
  "get_upload_link",
  "get_docs",
]);

const MAX_ARGUMENT_PREVIEW_CHARS = 8_000;
const MAX_RESULT_PREVIEW_CHARS = 1_200;

function preview(value: unknown, maxChars: number): unknown {
  let serialized: string;
  try {
    serialized = JSON.stringify(value) ?? "null";
  } catch {
    serialized = JSON.stringify({ unavailable: true });
  }
  if (serialized.length <= maxChars) {
    try {
      return JSON.parse(serialized) as unknown;
    } catch {
      return serialized;
    }
  }
  return { truncated: true, preview: serialized.slice(0, maxChars) };
}

function simulatedSuccess(): ToolCallResult {
  return {
    isError: false,
    content: [{ type: "text", text: JSON.stringify({ status: "success" }) }],
  };
}

export function isRealBehaviorReadTool(name: string): boolean {
  return REAL_READ_ONLY_TOOLS.has(name);
}

export function createBehaviorTestExecutor(client: Client, context: BehaviorToolExecutionContext) {
  return async (name: string, args: Record<string, unknown>): Promise<ToolCallResult> => {
    const execution: BehaviorToolExecution = isRealBehaviorReadTool(name) ? "real" : "dry_run";

    if (context.signal?.aborted) {
      const result: ToolCallResult = {
        isError: true,
        content: [{ type: "text", text: JSON.stringify({ code: "test_timeout", message: "The behavior test exceeded its time limit." }) }],
      };
      context.trace.push({
        name,
        arguments: preview(args, MAX_ARGUMENT_PREVIEW_CHARS),
        execution,
        outcome: "error",
        application_status: execution === "dry_run" ? "not_applied" : "not_applicable",
        result_preview: preview(result.content, MAX_RESULT_PREVIEW_CHARS),
      });
      return result;
    }

    const traceEntry: BehaviorToolTraceEntry = {
      name,
      arguments: preview(args, MAX_ARGUMENT_PREVIEW_CHARS),
      execution,
      outcome: "error",
      application_status: execution === "dry_run" ? "not_applied" : "not_applicable",
      result_preview: null,
    };
    context.trace.push(traceEntry);
    const result = execution === "real" ? await callTool(client, name, args) : simulatedSuccess();
    traceEntry.outcome = execution === "dry_run" ? "simulated_success" : result.isError ? "error" : "success";
    traceEntry.result_preview = preview(result.content, MAX_RESULT_PREVIEW_CHARS);
    return result;
  };
}
