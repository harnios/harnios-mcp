import { listDirectory } from "@/lib/storage/directories";
import { readFile } from "@/lib/storage/files";
import { StorageError } from "@/lib/storage/errors";
import type { ScheduleDefinition } from "./types";

const SCHEDULES_DIR = "os/schedules";

function idFromPath(path: string): string {
  const filename = path.split("/").pop() ?? path;
  return filename.replace(/\.md$/i, "");
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Parses a Scheduled Task file's `---key: value---` front matter and body
 * (data-model.md). Hand-rolled rather than a dependency — this repo already
 * prefers small hand-rolled parsers for flat formats like this (see
 * lib/external-mcp/schemaConvert.ts). Returns `undefined` (never throws) if
 * the file doesn't have the required shape or fields — callers must skip
 * and warn, not fail the whole listing (spec.md Edge Cases).
 */
export function parseScheduleFile(path: string, raw: string): ScheduleDefinition | undefined {
  if (!raw.startsWith("---")) return undefined;

  const closingIndex = raw.indexOf("\n---", 3);
  if (closingIndex === -1) return undefined;

  const frontMatterBlock = raw.slice(3, closingIndex).trim();
  const bodyStart = raw.indexOf("\n", closingIndex + 4);
  const body = (bodyStart === -1 ? "" : raw.slice(bodyStart + 1)).trim();

  const fields: Record<string, string> = {};
  for (const line of frontMatterBlock.split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = stripQuotes(line.slice(separatorIndex + 1));
    if (key) fields[key] = value;
  }

  const { name, cron, model } = fields;
  if (!name || !cron || !model || !body) return undefined;

  return {
    id: idFromPath(path),
    path,
    name,
    cron,
    enabled: fields.enabled?.toLowerCase() !== "false",
    model,
    timezone: fields.timezone || undefined,
    body,
  };
}

/**
 * Lists every Scheduled Task under os/schedules/*.md. A malformed file is
 * skipped with a logged warning, never thrown — one broken schedule file
 * must never block the whole tick or the whole list page (spec.md Edge
 * Cases, FR-010). Returns an empty list if os/schedules/ doesn't exist yet
 * (no task has ever been created).
 */
export async function listSchedules(): Promise<ScheduleDefinition[]> {
  let files: Array<{ path: string }>;
  try {
    files = (await listDirectory(SCHEDULES_DIR)).files;
  } catch (err) {
    if (err instanceof StorageError && err.code === "not_found") return [];
    throw err;
  }

  const schedules: ScheduleDefinition[] = [];
  for (const file of files) {
    if (!file.path.toLowerCase().endsWith(".md")) continue;
    try {
      const { content } = await readFile(file.path);
      const schedule = parseScheduleFile(file.path, content.toString("utf-8"));
      if (schedule) {
        schedules.push(schedule);
      } else {
        console.warn(`[scheduler] skipping malformed schedule file: ${file.path}`);
      }
    } catch (err) {
      console.warn(`[scheduler] failed to read schedule file "${file.path}":`, err);
    }
  }
  return schedules;
}

export async function getSchedule(id: string): Promise<ScheduleDefinition | undefined> {
  const schedules = await listSchedules();
  return schedules.find((schedule) => schedule.id === id);
}

export interface ScheduleFileInput {
  name: string;
  cron: string;
  enabled: boolean;
  model: string;
  timezone: string;
  body: string;
}

/** Serializes a Scheduled Task's front matter + body — the inverse of parseScheduleFile(). */
export function serializeScheduleFile(input: ScheduleFileInput): string {
  const lines = [
    "---",
    `name: "${input.name.replace(/"/g, '\\"')}"`,
    `cron: "${input.cron}"`,
    `enabled: ${input.enabled}`,
    `model: "${input.model}"`,
  ];
  if (input.timezone.trim()) lines.push(`timezone: "${input.timezone.trim()}"`);
  lines.push(`updated: ${new Date().toISOString().slice(0, 10)}`, "---", "", input.body.trim(), "");
  return lines.join("\n");
}

export function pathForSlug(slug: string): string {
  return `${SCHEDULES_DIR}/${slug}.md`;
}
