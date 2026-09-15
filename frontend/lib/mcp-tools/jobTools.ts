import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { JobError } from "@/lib/jobs/registry";
import { runRegisteredJob } from "@/lib/jobs/runner";
import { ok } from "./result";
import { registerGatedTool } from "./toolGate";

function jobError(err: unknown): CallToolResult {
  const value = err instanceof JobError ? err : new JobError("execution_failed", err instanceof Error ? err.message : String(err));
  return { isError: true, content: [{ type: "text", text: JSON.stringify({ code: value.code, message: value.message }) }] };
}

export async function registerJobTools(server: McpServer, disabledTools: ReadonlySet<string>): Promise<void> {
  registerGatedTool(server, disabledTools, "run_job", {
    title: "Run Job",
    description: "Runs a registered workflow stored under os/jobs in the workspace. Supply its jobId and declared arguments only. The job can access only its manifest-authorized files and returns output metadata plus an aggregate summary, never file contents.",
    inputSchema: { jobId: z.string(), args: z.record(z.string(), z.unknown()) },
  }, async ({ jobId, args }) => {
    try { return ok(await runRegisteredJob(jobId, args)); }
    catch (err) { return jobError(err); }
  });
}
