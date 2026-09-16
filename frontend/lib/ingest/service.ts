import { randomUUID } from "node:crypto";
import { createFile } from "@/lib/storage/files";
import { isAllowedExtension, MAX_UPLOAD_BYTES, mimeTypeForPath } from "@/lib/storage/fileTypes";
import { StorageError, tooLarge, unsupportedType } from "@/lib/storage/errors";

export class IngestError extends Error {
  constructor(public readonly code: "invalid_request" | "unsupported_type" | "too_large", message: string) { super(message); this.name = "IngestError"; }
}

function safeBasename(name: string): string {
  const base = name.replaceAll("\\", "/").split("/").pop()?.trim() ?? "";
  const safe = base.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^\.+$/, "").slice(0, 160);
  if (!safe || safe === "." || safe === "..") throw new IngestError("invalid_request", "The uploaded file must have a valid filename.");
  return safe;
}

export async function ingestSingleFile(file: File) {
  const originalName = safeBasename(file.name);
  if (!isAllowedExtension(originalName)) throw unsupportedType(originalName, originalName.split(".").pop() ?? "");
  if (file.size > MAX_UPLOAD_BYTES) throw tooLarge(originalName, MAX_UPLOAD_BYTES);
  const path = `data/inbox/${randomUUID()}-${originalName}`;
  const contentType = file.type || mimeTypeForPath(originalName);
  try {
    const metadata = await createFile(path, Buffer.from(await file.arrayBuffer()), contentType);
    return { originalName, ...metadata };
  } catch (err) {
    if (err instanceof StorageError) throw err;
    throw err;
  }
}
