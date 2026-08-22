export type SchedulerErrorCode =
  | "missing_config"
  | "invalid_schedule"
  | "llm_unreachable"
  | "llm_invalid_response"
  | "tool_call_failed"
  | "max_iterations_exceeded"
  | "run_timed_out";

export class SchedulerError extends Error {
  code: SchedulerErrorCode;

  constructor(code: SchedulerErrorCode, message: string) {
    super(message);
    this.name = "SchedulerError";
    this.code = code;
  }
}
