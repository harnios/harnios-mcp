import { z } from "zod";
import { readFile } from "@/lib/storage/files";
import { normalizeFilePath } from "@/lib/storage/paths";

const jobIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const manifestSchema = z.object({
  id: jobIdSchema,
  version: z.number().int().positive(),
  title: z.string().min(1),
  input: z.object({ name: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/), prefix: z.string().min(1), extensions: z.array(z.string().regex(/^\.[a-z0-9]+$/)).min(1) }),
  output: z.object({ path: z.string().min(1), maxBytes: z.number().int().positive() }),
  timeoutSeconds: z.number().int().min(1).max(20),
  summary: z.array(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/)).max(32),
}).strict();

export type JobManifest = z.infer<typeof manifestSchema>;
export class JobError extends Error {
  constructor(public readonly code: "invalid_input" | "job_not_found" | "job_invalid" | "input_denied" | "filesystem_denied" | "execution_failed" | "timeout" | "output_too_large" | "output_missing" | "publish_failed", message: string) {
    super(message); this.name = "JobError";
  }
}

export interface RegisteredJob { manifest: JobManifest; script: string; inputPath: string; virtualInputPath: string; virtualOutputPath: string; scriptArgs: Record<string, unknown>; }

function virtualPath(path: string): string { return `/${normalizeFilePath(path)}`; }
function inPrefix(path: string, prefix: string): boolean {
  const normalized = normalizeFilePath(path); const base = normalizeFilePath(prefix);
  return normalized === base || normalized.startsWith(`${base}/`);
}

export async function resolveRegisteredJob(jobId: string, args: Record<string, unknown>): Promise<RegisteredJob> {
  if (!jobIdSchema.safeParse(jobId).success || !args || Array.isArray(args)) throw new JobError("invalid_input", "jobId and args are required.");
  const base = `os/jobs/${jobId}`;
  let manifestFile; let scriptFile;
  try { [manifestFile, scriptFile] = await Promise.all([readFile(`${base}/manifest.json`), readFile(`${base}/script.py`)]); }
  catch (err) { throw new JobError("job_not_found", `Registered job "${jobId}" was not found.`); }
  let manifest: JobManifest;
  try { manifest = manifestSchema.parse(JSON.parse(manifestFile.content.toString("utf-8"))); }
  catch { throw new JobError("job_invalid", `Registered job "${jobId}" has an invalid manifest.`); }
  if (manifest.id !== jobId || !scriptFile.content.length) throw new JobError("job_invalid", `Registered job "${jobId}" is invalid.`);
  const keys = Object.keys(args);
  if (keys.length !== 1 || keys[0] !== manifest.input.name || typeof args[manifest.input.name] !== "string") throw new JobError("invalid_input", `Provide exactly the ${manifest.input.name} argument.`);
  const inputPath = normalizeFilePath(args[manifest.input.name] as string);
  const extension = inputPath.slice(inputPath.lastIndexOf(".")).toLowerCase();
  if (!inputPath || !inPrefix(inputPath, manifest.input.prefix) || !manifest.input.extensions.includes(extension)) throw new JobError("input_denied", "The selected input is outside this job's policy.");
  const outputPath = normalizeFilePath(manifest.output.path);
  if (!outputPath || outputPath.startsWith("os/")) throw new JobError("job_invalid", "The job output path is invalid.");
  return { manifest, script: scriptFile.content.toString("utf-8"), inputPath, virtualInputPath: virtualPath(inputPath), virtualOutputPath: virtualPath(outputPath), scriptArgs: { [manifest.input.name]: virtualPath(inputPath) } };
}
