import { randomBytes } from "node:crypto";
import type { ChatCompletionRequestMessage } from "@mistralai/mistralai/models/components";
import { readSchedulerConfig, validateSchedulerConfig } from "./config";
import { SchedulerError, type SchedulerErrorCode } from "./errors";
import { completeChat } from "./mistralClient";
import { putRecord } from "./store";
import { resolveTimezone } from "./timezone";
import { callTool, listMistralTools, withInProcessMcpClient } from "./toolRuntime";
import type {
  LastRunRecord,
  ScheduleDefinition,
  ScheduleRunRecord,
  ScheduleRunToolCall,
  ScheduleTrigger,
} from "./types";

const MAX_ITERATIONS = 8;
const RUN_TIMEOUT_MS = 5 * 60 * 1000;

/** "YYYY-MM-DD HH:mm:ss" in the given IANA timezone, for a human/model-readable local timestamp. */
function formatLocal(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

/**
 * The model has no other way to know what time it is — without this, a
 * prompt like "for every row whose next-run date has passed" has no
 * reliable way to determine what "passed" means (spec 032 follow-up:
 * scheduled tasks that themselves interpret a schedule table need to
 * compare dates against "now").
 */
function buildSystemPrompt(now: Date, timezone: string): string {
  return (
    "You are Harnios's unattended task scheduler. You are executing a Scheduled Task with no " +
    "human present to answer questions — act directly using the tools available to you rather " +
    "than asking for clarification. When you are done, or if you cannot complete the task, " +
    "respond with a short plain-text summary of what you did (or why you could not).\n\n" +
    `Current date and time: ${now.toISOString()} (UTC), ${formatLocal(now, timezone)} (${timezone}).`
  );
}

type RunOutcome =
  | { ok: true; summary: string }
  | { ok: false; errorCode: SchedulerErrorCode; errorMessage: string };

function safeJsonParse(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function timeoutOutcome(ms: number): Promise<RunOutcome> {
  return new Promise((resolve) => {
    setTimeout(
      () => resolve({ ok: false, errorCode: "run_timed_out", errorMessage: `Run exceeded the ${ms}ms execution limit` }),
      ms,
    );
  });
}

async function executeRun(task: ScheduleDefinition, now: Date, toolCalls: ScheduleRunToolCall[]): Promise<RunOutcome> {
  const config = readSchedulerConfig();
  try {
    validateSchedulerConfig(config);
  } catch (err) {
    const schedulerError = err as SchedulerError;
    return { ok: false, errorCode: schedulerError.code, errorMessage: schedulerError.message };
  }

  try {
    return await withInProcessMcpClient(async (client) => {
      const tools = await listMistralTools(client);
      const messages: ChatCompletionRequestMessage[] = [
        { role: "system", content: buildSystemPrompt(now, resolveTimezone(task)) },
        { role: "user", content: task.body },
      ];

      for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
        const response = await completeChat(config.mistralApiKey, {
          model: task.model,
          messages,
          tools: tools.length > 0 ? tools : undefined,
          toolChoice: "auto",
        });

        const message = response.choices[0]?.message;
        if (!message) {
          throw new SchedulerError("llm_invalid_response", "Mistral response contained no message");
        }

        const requestedCalls = message.toolCalls ?? [];
        if (requestedCalls.length === 0) {
          const summary = typeof message.content === "string" ? message.content : JSON.stringify(message.content ?? "");
          return { ok: true, summary: summary || "Task completed with no final summary." };
        }

        messages.push({ role: "assistant", content: message.content ?? null, toolCalls: requestedCalls });

        for (const call of requestedCalls) {
          const args =
            typeof call.function.arguments === "string" ? safeJsonParse(call.function.arguments) : call.function.arguments;
          const result = await callTool(client, call.function.name, args ?? {});
          toolCalls.push({ name: call.function.name, isError: result.isError });
          messages.push({
            role: "tool",
            toolCallId: call.id,
            name: call.function.name,
            content: typeof result.content === "string" ? result.content : JSON.stringify(result.content),
          });
        }
      }

      throw new SchedulerError("max_iterations_exceeded", `Exceeded ${MAX_ITERATIONS} tool-calling iterations`);
    });
  } catch (err) {
    if (err instanceof SchedulerError) {
      return { ok: false, errorCode: err.code, errorMessage: err.message };
    }
    return { ok: false, errorCode: "llm_invalid_response", errorMessage: (err as Error).message };
  }
}

/**
 * Executes one Scheduled Task run to completion — whether triggered by the
 * periodic tick or a manual "run now" (contracts/scheduler-run-protocol.md).
 * Always settles (never throws) and always writes a Task Execution Record
 * plus updated Last-Run Bookkeeping, regardless of outcome (FR-009, FR-010,
 * FR-011). Callers are responsible for the anti-overlap guard (runGuard.ts)
 * — this function does not check or reserve it itself.
 */
export async function runSchedule(task: ScheduleDefinition, trigger: ScheduleTrigger): Promise<ScheduleRunRecord> {
  const runId = randomBytes(16).toString("hex");
  const startedAtDate = new Date();
  const startedAt = startedAtDate.toISOString();
  const toolCalls: ScheduleRunToolCall[] = [];

  const result = await Promise.race([executeRun(task, startedAtDate, toolCalls), timeoutOutcome(RUN_TIMEOUT_MS)]);
  const finishedAt = new Date().toISOString();

  const record: ScheduleRunRecord = result.ok
    ? { runId, taskId: task.id, taskName: task.name, trigger, startedAt, finishedAt, toolCalls, status: "success", summary: result.summary }
    : {
        runId,
        taskId: task.id,
        taskName: task.name,
        trigger,
        startedAt,
        finishedAt,
        toolCalls,
        status: "failure",
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        summary: result.errorMessage,
      };

  await putRecord<ScheduleRunRecord>(`runs/${runId}`, record);
  await putRecord<LastRunRecord>(`last-run/${task.id}`, {
    lastRunAt: finishedAt,
    lastRunId: runId,
    lastStatus: record.status,
  });

  return record;
}
