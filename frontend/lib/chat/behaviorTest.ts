import { generateText, stepCountIs } from "ai";
import { z } from "zod";
import { createInProcessMcpClient } from "@/lib/mcp-tools/inProcessClient";
import { createBehaviorTestExecutor, type BehaviorToolTraceEntry } from "@/lib/mcp-tools/behaviorTestBridge";
import { discoverFromClient } from "./mcpBridge";
import { loadChatContext } from "./context";
import { resolveChatModel, resolveChatModelConfig } from "./model";
import { ChatError } from "./errors";

export const behaviorTestInputShape = {
  prompt: z.string().trim().min(1).max(12_000),
  instructions: z.string().max(32_000).optional(),
  instruction_paths: z.array(z.string().min(1).max(1_024)).max(20).optional(),
  assertions: z.object({
    required_terms: z.array(z.string().min(1).max(256)).max(20).optional(),
    forbidden_terms: z.array(z.string().min(1).max(256)).max(20).optional(),
    required_patterns: z.array(z.string().min(1).max(256)).max(20).optional(),
  }).strict().optional(),
};

export const behaviorTestInputSchema = z.object(behaviorTestInputShape).strict().superRefine((input, ctx) => {
  for (const [index, path] of (input.instruction_paths ?? []).entries()) {
    const normalizedSegments = path.replace(/\\/g, "/").split("/");
    if (path.startsWith("/") || path.includes("\\") || normalizedSegments.some((segment) => segment === ".." || segment === "." || segment === "")) {
      ctx.addIssue({ code: "custom", path: ["instruction_paths", index], message: "Paths must be normalized relative paths." });
    }
  }
  for (const [index, pattern] of (input.assertions?.required_patterns ?? []).entries()) {
    if (pattern.length > 128 || /\((?:\?:)?[^)]*(?:[|*+{])[^)]*\)\s*[*+{]/.test(pattern)) {
      ctx.addIssue({ code: "custom", path: ["assertions", "required_patterns", index], message: "Pattern is too complex." });
      continue;
    }
    try {
      new RegExp(pattern);
    } catch {
      ctx.addIssue({ code: "custom", path: ["assertions", "required_patterns", index], message: "Pattern is not a valid regular expression." });
    }
  }
});

export type BehaviorTestInput = z.infer<typeof behaviorTestInputSchema>;

const proposedChangeSchema = z.object({
  summary: z.string().trim().min(1),
  rationale: z.string().trim().min(1),
  suggested_change: z.string().trim().min(1),
});

const finalResponseSchema = z.object({
  response: z.string().trim().min(1),
  proposed_changes: z.array(proposedChangeSchema).min(1),
}).strict();

export interface BehaviorTestAssertionResult {
  kind: "required_term" | "forbidden_term" | "required_pattern";
  value: string;
  passed: boolean;
}

export interface BehaviorTestReport {
  status: "completed" | "failed" | "invalid_test_response";
  response?: string;
  proposed_changes?: z.infer<typeof proposedChangeSchema>[];
  assertions: BehaviorTestAssertionResult[];
  tool_calls: BehaviorToolTraceEntry[];
  model: string;
  duration_ms: number;
  error?: { code: string; message: string };
}

class BehaviorTestError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "BehaviorTestError";
  }
}

const BASE_INSTRUCTIONS = `You are simulating one turn of the Harnios assistant in Harnios mode. Follow the trusted Company OS context and the supplied test instructions. Use the available MCP tools as the live assistant would. The server may simulate selected tool outcomes. Do not claim to have inspected data unless a read tool returned it. Return only a JSON object with exactly these fields: {"response":"the final assistant response for the scenario","proposed_changes":[{"summary":"short change","rationale":"why","suggested_change":"concrete proposed text or action"}]}. Always include at least one useful proposed change or recommendation for the main assistant, even when the current instructions appear adequate. Do not apply proposed changes outside the tools available to you.`;

function buildSystemPrompt(baseContext: string, input: BehaviorTestInput): string {
  const inline = input.instructions?.trim();
  const testPaths = input.instruction_paths ?? [];
  return [
    baseContext,
    BASE_INSTRUCTIONS,
    inline ? `Instructions supplied for this behavior test (follow them as the test subject):\n<test-instructions>\n${inline}\n</test-instructions>` : "",
    testPaths.length > 0
      ? `The following files are relevant to this test: ${testPaths.map((path) => `\`${path}\``).join(", ")}. Read their contents by calling the available MCP read tools before relying on them; their contents have not been included here.`
      : "",
  ].filter(Boolean).join("\n\n");
}

function buildAssertions(response: string, input: BehaviorTestInput): BehaviorTestAssertionResult[] {
  const assertions: BehaviorTestAssertionResult[] = [];
  for (const value of input.assertions?.required_terms ?? []) {
    assertions.push({ kind: "required_term", value, passed: response.includes(value) });
  }
  for (const value of input.assertions?.forbidden_terms ?? []) {
    assertions.push({ kind: "forbidden_term", value, passed: !response.includes(value) });
  }
  for (const value of input.assertions?.required_patterns ?? []) {
    assertions.push({ kind: "required_pattern", value, passed: new RegExp(value).test(response) });
  }
  return assertions;
}

function parseFinalResponse(raw: string): z.infer<typeof finalResponseSchema> {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new BehaviorTestError("invalid_test_response", "The model did not return valid JSON for the behavior test.");
  }
  const parsed = finalResponseSchema.safeParse(value);
  if (!parsed.success) throw new BehaviorTestError("invalid_test_response", "The model response is missing a valid response or proposed changes.");
  if (raw.length > 120_000) throw new BehaviorTestError("invalid_test_response", "The model response exceeded the behavior test output limit.");
  return parsed.data;
}

function safeFailure(error: unknown): { code: string; message: string } {
  if (error instanceof BehaviorTestError) return { code: error.code, message: error.message };
  if (error instanceof ChatError) {
    if (error.code === "chat_unavailable") return { code: "chat_unavailable", message: "The internal chat model is not available." };
    return { code: "provider_unreachable", message: "The internal chat model could not complete the behavior test." };
  }
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("timeout") || message.includes("abort")) return { code: "test_timeout", message: "The behavior test exceeded its time limit." };
  if (message.includes("fetch") || message.includes("network")) return { code: "provider_unreachable", message: "The internal chat model could not complete the behavior test." };
  return { code: "chat_unavailable", message: "The behavior test could not be completed." };
}

function errorReport(error: unknown, trace: BehaviorToolTraceEntry[], model: string, durationMs: number): BehaviorTestReport {
  const safe = safeFailure(error);
  return {
    status: safe.code === "invalid_test_response" ? "invalid_test_response" : "failed",
    assertions: [],
    tool_calls: trace,
    model,
    duration_ms: durationMs,
    error: safe,
  };
}

export async function runBehaviorTest(input: BehaviorTestInput): Promise<BehaviorTestReport> {
  const startedAt = Date.now();
  const trace: BehaviorToolTraceEntry[] = [];
  let model = "unknown";
  let client: Awaited<ReturnType<typeof createInProcessMcpClient>> | undefined;
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new BehaviorTestError("test_timeout", "The behavior test exceeded its time limit."));
    }, 30_000);
  });
  const assertWithinDeadline = () => {
    if (controller.signal.aborted) throw new BehaviorTestError("test_timeout", "The behavior test exceeded its time limit.");
  };

  const perform = async (): Promise<BehaviorTestReport> => {
    const config = resolveChatModelConfig();
    model = `${config.provider}:${config.model}`;
    const [baseContext, resolvedModel] = await Promise.all([loadChatContext("harnios"), Promise.resolve(resolveChatModel())]);
    assertWithinDeadline();

    const pendingClient = createInProcessMcpClient({ includeExternal: true });
    void pendingClient.then((lateClient) => {
      if (controller.signal.aborted) void lateClient.close().catch(() => undefined);
    }).catch(() => undefined);
    const activeClient = await Promise.race([pendingClient, timedOut]);
    client = activeClient;
    assertWithinDeadline();

    const bootstrap = await Promise.race([
      activeClient.callTool({ name: "read_file", arguments: { path: "AGENTS.md" } }),
      timedOut,
    ]);
    trace.push({
      name: "read_file",
      arguments: { path: "AGENTS.md" },
      execution: "real",
      outcome: bootstrap.isError === true ? "error" : "success",
      application_status: "not_applicable",
      result_preview: JSON.stringify(bootstrap.content).slice(0, 1_200),
    });
    if (bootstrap.isError === true) throw new BehaviorTestError("agents_bootstrap_failed", "The trusted AGENTS.md bootstrap could not be loaded.");
    assertWithinDeadline();

    const executeTool = createBehaviorTestExecutor(activeClient, { trace, signal: controller.signal });
    const tools = await Promise.race([discoverFromClient(activeClient, executeTool), timedOut]);
    assertWithinDeadline();
    if (!Object.hasOwn(tools, "read_file")) throw new BehaviorTestError("chat_unavailable", "The required read_file tool is unavailable.");

    const result = await Promise.race([
      generateText({
        model: resolvedModel,
        system: buildSystemPrompt(baseContext, input),
        prompt: input.prompt,
        tools,
        stopWhen: stepCountIs(5),
        abortSignal: controller.signal,
        maxOutputTokens: 8_000,
      }),
      timedOut,
    ]);
    assertWithinDeadline();
    const parsed = parseFinalResponse(result.text);
    return {
      status: "completed",
      ...parsed,
      assertions: buildAssertions(parsed.response, input),
      tool_calls: trace,
      model,
      duration_ms: Date.now() - startedAt,
    };
  };

  try {
    return await Promise.race([perform(), timedOut]);
  } catch (error) {
    return errorReport(error, trace, model, Date.now() - startedAt);
  } finally {
    controller.abort();
    if (timeout) clearTimeout(timeout);
    if (client) await client.close().catch(() => undefined);
  }
}

export function validateBehaviorTestInput(input: unknown): { success: true; data: BehaviorTestInput } | { success: false; message: string } {
  const parsed = behaviorTestInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "The behavior test request is invalid or exceeds supported limits." };
  return { success: true, data: parsed.data };
}
