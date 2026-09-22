import { readFile } from "@/lib/storage/files";
import { StorageError } from "@/lib/storage/errors";

const AGENTS_PATH = "os/AGENTS.md";
const LEGACY_AGENTS_PATH = "AGENTS.md";

export const CHAT_BASE_CONTEXT = `You are the Harnios assistant inside the authenticated Company OS.
Use the available Harnios MCP tools when they are useful. Be concise, explain actions clearly, and never claim a tool succeeded unless its result says so.
Read-only tools may run directly. Any mutation, deletion, message, code/job execution, external tool, or unknown tool requires explicit user approval.`;

export async function loadChatContext(): Promise<string> {
  let content: Buffer;
  let loadedPath = AGENTS_PATH;
  try {
    content = (await readFile(AGENTS_PATH)).content;
  } catch (error) {
    if (!(error instanceof StorageError) || error.code !== "not_found") throw error;
    content = (await readFile(LEGACY_AGENTS_PATH)).content;
    loadedPath = LEGACY_AGENTS_PATH;
  }
  const agents = content.toString("utf-8").slice(0, 120_000);
  return `${CHAT_BASE_CONTEXT}\n\nTrusted instructions from ${loadedPath}:\n${agents}`;
}
