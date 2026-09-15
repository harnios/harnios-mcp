import { ClassInstance, NOT_HANDLED, type OsCallback } from "@pydantic/monty/wasm";
import { readFile } from "@/lib/storage/files";

export class VirtualFilesystemError extends Error {
  constructor(public readonly code: "filesystem_denied" | "output_too_large", message: string) { super(message); this.name = "VirtualFilesystemError"; }
}

export interface VirtualFilesystem {
  os: OsCallback;
  stagedOutput(): Buffer | null;
}

/** A minimal S3-backed virtual filesystem for one input and one staged output. */
export function createVirtualFilesystem(inputPath: string, virtualInputPath: string, virtualOutputPath: string, maxBytes: number): VirtualFilesystem {
  let input: Buffer | null = null;
  let output: Buffer | null = null;
  const requirePath = (args: unknown[]): string => {
    const path = args[0];
    if (typeof path !== "string") throw new VirtualFilesystemError("filesystem_denied", "FilesystemDenied: invalid path.");
    return path;
  };
  const read = async (path: string): Promise<Buffer> => {
    if (path === virtualOutputPath && output) return output;
    if (path !== virtualInputPath) throw new VirtualFilesystemError("filesystem_denied", "FilesystemDenied: path is not authorized.");
    input ??= (await readFile(inputPath)).content;
    return input;
  };
  const write = (path: string, value: unknown): null => {
    if (path !== virtualOutputPath) throw new VirtualFilesystemError("filesystem_denied", "FilesystemDenied: path is not authorized.");
    const next = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf-8");
    if (next.byteLength > maxBytes) throw new VirtualFilesystemError("output_too_large", "OutputTooLarge: staged output exceeds its limit.");
    output = next; return null;
  };
  const os: OsCallback = async (name, args) => {
    const path = requirePath(args);
    if (name === "Path.read_text") return (await read(path)).toString("utf-8");
    if (name === "Path.read_bytes") return new Uint8Array(await read(path));
    if (name === "Path.write_text" || name === "Path.append_text") {
      const current = name === "Path.append_text" && output ? output.toString("utf-8") : "";
      return write(path, `${current}${String(args[1] ?? "")}`);
    }
    if (name === "Path.write_bytes" || name === "Path.append_bytes") {
      const value = args[1] instanceof Uint8Array ? Buffer.from(args[1]) : Buffer.from(String(args[1] ?? ""));
      return write(path, name === "Path.append_bytes" && output ? Buffer.concat([output, value]) : value);
    }
    if (name === "Path.exists") return path === virtualInputPath || path === virtualOutputPath;
    if (name === "Path.is_file") return path === virtualInputPath || path === virtualOutputPath;
    if (name === "Path.stat") { const value = await read(path); return { st_size: value.byteLength }; }
    if (name === "open") {
      const mode = typeof args[1] === "string" ? args[1] : "r";
      if (mode.includes("+") || mode.includes("a")) throw new VirtualFilesystemError("filesystem_denied", "FilesystemDenied: unsupported open mode.");
      if (mode.includes("r")) {
        if (path !== virtualInputPath && !(path === virtualOutputPath && output)) throw new VirtualFilesystemError("filesystem_denied", "FilesystemDenied: path is not authorized.");
        const file = { read: async () => (await read(path)).toString("utf-8"), close: () => null };
        return new ClassInstance(file, { allowedMethods: ["read", "close"], name: "VirtualFile" });
      }
      if (mode.includes("w")) {
        if (path !== virtualOutputPath) throw new VirtualFilesystemError("filesystem_denied", "FilesystemDenied: path is not authorized.");
        const file = { write: (value: unknown) => { write(path, value); return String(value).length; }, close: () => null };
        return new ClassInstance(file, { allowedMethods: ["write", "close"], name: "VirtualFile" });
      }
      throw new VirtualFilesystemError("filesystem_denied", "FilesystemDenied: unsupported open mode.");
    }
    return NOT_HANDLED;
  };
  return { os, stagedOutput: () => output };
}
