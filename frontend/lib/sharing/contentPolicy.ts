import { isSafeInlineShareMimeType, mimeTypeForPath } from "@/lib/storage/fileTypes";

export type ShareContentKind = "pdf" | "image" | "media" | "text" | "markdown" | "unsupported";

const TEXT_EXTENSIONS = new Set(["txt", "csv", "json", "py", "css", "xml", "bpmn"]);

export function contentKind(path: string, contentType = mimeTypeForPath(path)): ShareContentKind {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "md") return "markdown";
  if (contentType === "application/pdf") return "pdf";
  if (isSafeInlineShareMimeType(contentType) && contentType.startsWith("image/")) return "image";
  if (isSafeInlineShareMimeType(contentType) && (contentType.startsWith("audio/") || contentType.startsWith("video/"))) return "media";
  if (TEXT_EXTENSIONS.has(extension) && !["html", "htm"].includes(extension)) return "text";
  return "unsupported";
}

export function isInlineShareKind(kind: ShareContentKind): boolean {
  return kind !== "unsupported";
}

export function safeShareContentType(kind: ShareContentKind, originalType: string): string {
  if (kind === "pdf" || kind === "image" || kind === "media") return originalType;
  return "text/plain; charset=utf-8";
}

export function filenameForPath(path: string): string {
  const name = path.split("/").pop() || "shared-file";
  return name.replace(/[\r\n"\\]/g, "_");
}
