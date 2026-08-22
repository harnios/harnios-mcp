import { SchedulerError } from "./errors";

/**
 * Settings the scheduler depends on — administrator-provisioned via
 * environment variables (data-model.md, spec.md Assumptions). Mirrors
 * lib/messaging/config.ts's shape.
 */
export interface SchedulerConfig {
  mistralApiKey: string;
  model: string;
  timezone: string;
  runTimeoutMs: number;
  enabled: boolean;
}

const DEFAULT_RUN_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Reads scheduler configuration from process.env, applying defaults for
 * optional fields. Never throws, even if required values are missing —
 * mirrors lib/messaging/config.ts's readMessagingConfig() so it's safe to
 * call at module-import time. Use validateSchedulerConfig() to check the
 * result before relying on it to make an LLM call.
 */
export function readSchedulerConfig(): SchedulerConfig {
  return {
    mistralApiKey: process.env.MISTRAL_API_KEY ?? "",
    model: process.env.MISTRAL_MODEL?.trim() || "mistral-large-latest",
    timezone: process.env.SCHEDULER_TIMEZONE?.trim() || "UTC",
    runTimeoutMs: DEFAULT_RUN_TIMEOUT_MS,
    enabled: (process.env.SCHEDULER_ENABLED?.trim().toLowerCase() ?? "true") !== "false",
  };
}

/** Throws a `missing_config` SchedulerError naming the missing field. */
export function validateSchedulerConfig(config: SchedulerConfig): void {
  if (!config.mistralApiKey) {
    throw new SchedulerError("missing_config", "Missing required scheduler configuration: MISTRAL_API_KEY");
  }
}
