import { CronExpressionParser } from "cron-parser";
import { isSupportedModel } from "./models";

export interface TaskFormInput {
  name: string;
  cron: string;
  model: string;
  timezone: string;
  prompt: string;
}

/**
 * Validates a Scheduled Task's fields before the dedicated management UI
 * saves it (FR-014a) — a task cannot be created or updated into an invalid
 * state through this interface. Deliberately UI-only: a task file edited
 * directly through the general-purpose file storage interface is not
 * subject to this check (spec.md Edge Cases, research.md §4).
 */
export function validateTaskInput(input: TaskFormInput): string | undefined {
  if (!input.name.trim()) return "Name is required.";
  if (!input.prompt.trim()) return "Prompt is required.";

  if (!input.cron.trim()) return "Cron expression is required.";
  try {
    CronExpressionParser.parse(input.cron.trim(), input.timezone.trim() ? { tz: input.timezone.trim() } : {});
  } catch (err) {
    return `Cron expression is invalid: ${(err as Error).message}`;
  }

  if (!input.model.trim() || !isSupportedModel(input.model.trim())) {
    return "Model must be one of the supported models.";
  }

  if (input.timezone.trim()) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: input.timezone.trim() });
    } catch {
      return "Timezone must be a valid IANA zone name.";
    }
  }

  return undefined;
}

export function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "task";
}
