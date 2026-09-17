import { createFile } from "@/lib/storage/files";
import { getPublicAppUrl } from "@/lib/config/publicUrl";
import { PythonSandboxError, runPythonWithOs } from "@/lib/python/sandbox";
import { JobError, resolveRegisteredJob } from "./registry";
import { createVirtualFilesystem, VirtualFilesystemError } from "./virtualFilesystem";

export interface RunJobResult {
  jobId: string; jobVersion: number; output: { path: string; url: string; downloadUrl: string; size: number; contentType: string; etag: string }; durationMs: number; summary: Record<string, string | number | boolean | null>;
}

function summaryFrom(value: unknown, allowed: string[]): Record<string, string | number | boolean | null> {
  const entries = value instanceof Map ? [...value.entries()] : value && typeof value === "object" && !Array.isArray(value) ? Object.entries(value as Record<string, unknown>) : null;
  if (!entries) throw new JobError("execution_failed", "A job must return an object with its declared summary fields.");
  const summary: Record<string, string | number | boolean | null> = {};
  for (const [key, item] of entries) {
    if (typeof key !== "string" || !allowed.includes(key) || !["string", "number", "boolean"].includes(typeof item) && item !== null) throw new JobError("execution_failed", "The job returned an invalid summary.");
    summary[key] = item as string | number | boolean | null;
  }
  return summary;
}

export async function runRegisteredJob(jobId: string, args: Record<string, unknown>): Promise<RunJobResult> {
  const job = await resolveRegisteredJob(jobId, args);
  const fs = createVirtualFilesystem(job.inputPath, job.virtualInputPath, job.virtualOutputPath, job.manifest.output.maxBytes);
  let run;
  try { run = await runPythonWithOs(job.script, job.scriptArgs, job.manifest.timeoutSeconds, fs.os); }
  catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("OutputTooLarge")) throw new JobError("output_too_large", message);
    if (message.includes("FilesystemDenied")) throw new JobError("filesystem_denied", message);
    if (err instanceof PythonSandboxError) throw new JobError(err.code === "timeout" ? "timeout" : "execution_failed", err.message);
    if (err instanceof VirtualFilesystemError) throw new JobError(err.code, err.message);
    throw new JobError("execution_failed", message);
  }
  const output = fs.stagedOutput();
  if (!output) throw new JobError("output_missing", "The job completed without writing its required output.");
  const summary = summaryFrom(run.result, job.manifest.summary);
  try {
    const metadata = await createFile(job.manifest.output.path, output);
    const publicUrl = getPublicAppUrl();
    const encodedPath = metadata.path.split("/").map(encodeURIComponent).join("/");
    const url = `${publicUrl}/files/${encodedPath}`;
    const downloadUrl = `${publicUrl}/api/file/download?path=${encodeURIComponent(metadata.path)}`;
    return { jobId, jobVersion: job.manifest.version, output: { path: metadata.path, url, downloadUrl, size: metadata.size, contentType: metadata.contentType, etag: metadata.etag }, durationMs: run.durationMs, summary };
  } catch (err) { throw new JobError("publish_failed", err instanceof Error ? err.message : String(err)); }
}
