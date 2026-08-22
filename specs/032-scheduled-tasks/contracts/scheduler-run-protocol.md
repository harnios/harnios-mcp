# Contract: Scheduler Run Protocol (in-process tool-calling loop)

**Input**: [spec.md](../spec.md), [research.md](../research.md), [data-model.md](../data-model.md)

Describes what happens, in order, when a Scheduled Task executes — whether triggered by the
1-minute heartbeat (`frontend/lib/scheduler/tick.ts`) or a manual "run now"
(`POST /schedules/[id]/run`). Both entry points call the same `runSchedule(task)` function so
their behavior is identical except for how they decide *whether* to start (due-check vs. none)
and how they report back to the caller (fire-and-forget vs. awaited HTTP response).

## Preconditions

- The task is not already executing (anti-overlap guard, FR-012) — checked by the caller
  (`tick.ts` or the `run` route) before `runSchedule` is invoked.
- `MISTRAL_API_KEY` is configured; if not, `runSchedule` fails fast with a `missing_config`
  `SchedulerError` and a Task Execution Record is written with `status: "failure"` — no model
  call is attempted.

## Steps

1. **Open an in-process tool runtime** (research.md §1): construct an `McpServer`, register
   native tools via the shared `registerNativeTools`, connect it to a `Client` over
   `InMemoryTransport.createLinkedPair()`. Call `client.listTools()` and map the result into
   Mistral's function-tool format.
2. **Seed the conversation**:
   - `system`: a fixed instruction identifying this as Harnios's unattended scheduler — act
     directly, never ask a clarifying question (there is no one to answer), and finish with a
     short plain-text summary of what was done — followed by the current date and time, both in
     UTC and in the task's effective timezone (its own `timezone` front-matter field, falling
     back to `SCHEDULER_TIMEZONE`). Without this, a prompt that itself reasons about dates (e.g.
     "for every row whose next-run date has passed") has no reliable way to know what "now" is.
   - `user`: the task's prompt (its file body, verbatim).
3. **Loop**, up to a fixed `MAX_ITERATIONS` (8):
   a. Call Mistral's chat-completion endpoint with the accumulated `messages` and the tool list
      from step 1.
   b. If the response contains no tool calls: the loop ends successfully; its final text content
      becomes the Task Execution Record's `summary`.
   c. If the response contains one or more tool calls: execute each, in order, via
      `client.callTool({name, arguments})`. Each call's result (including `isError: true`, e.g. a
      `missing_config` messaging error) is appended to `messages` as a `tool` role message and
      to the record's `toolCalls` list — the model sees the same failure shape a live connected
      assistant would and decides whether to retry, use a different tool, or report the failure
      in its own final summary. No code-level retry of a tool call.
   d. Continue the loop.
4. **Hard timeout**: the entire loop (steps 3a–3d) is wrapped in a 5-minute `Promise.race`
   (FR-012a). If it fires: the run is marked `status: "failure"`, `errorCode:
   "run_timed_out"`, `summary` synthesized from whatever partial `toolCalls` were recorded so
   far.
5. **`MAX_ITERATIONS` exceeded** without the model producing a final tool-call-free turn: marked
   `status: "failure"`, `errorCode: "max_iterations_exceeded"`.
6. **Any other unhandled error** (Mistral API unreachable, malformed response): marked `status:
   "failure"` with the corresponding `SchedulerErrorCode` (`llm_unreachable` /
   `llm_invalid_response`).
7. **Always**, regardless of outcome: write one Task Execution Record to
   `.scheduler/runs/{runId}.json`, update `.scheduler/last-run/{taskId}.json` (`lastRunAt` set to
   "now", regardless of success/failure — FR-011's no-catch-up guarantee depends on this), close
   the in-process `Client`, and release the task's slot in the anti-overlap guard.

## Guarantees

- A tool available to the model is exactly the native tool set, gated by whatever an owner has
  currently disabled via `/tools` (FR-007, FR-008) — never a proxied external tool.
- A failure at any step produces exactly one Task Execution Record with `status: "failure"` and
  never throws out of `runSchedule` uncaught — the caller (`tick.ts`'s sequential loop, or the
  `run` route) is guaranteed a settled promise either way (FR-010).
- The anti-overlap guard is always released in a `finally`, so a timed-out or crashed run does
  not permanently block that task's future executions.
