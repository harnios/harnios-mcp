import { readFile } from "@/lib/storage/files";
import { StorageError } from "@/lib/storage/errors";
import type { ChatMode } from "./mode";

const AGENTS_PATH = "os/AGENTS.md";
const LEGACY_AGENTS_PATH = "AGENTS.md";

const CHAT_BASE_CONTEXT = `You are the Harnios assistant inside the authenticated Company OS.
Be concise, explain actions clearly, and never claim an operation succeeded unless its result says so.
Read-only tools may run directly. Any mutation, deletion, message, code/job execution, external tool, or unknown tool requires explicit user approval.`;

const MODE_CONTEXT: Record<ChatMode, string> = {
  harnios: `You are in Harnios mode. For every new user request, you MUST call at least one available Harnios MCP tool before giving the final answer. Use the most relevant tool and ground all claims about Company OS files, data, configuration, or state in tool results. Never substitute assumptions or memory for a tool result. After receiving the needed result, answer the user without making redundant tool calls.`,
  general: `You are in General mode. Harnios MCP tools are intentionally unavailable. Answer conversational and general-knowledge questions directly. Do not claim to have inspected or changed current Company OS files, data, configuration, or state.`,
};

export async function loadChatContext(mode: ChatMode = "harnios"): Promise<string> {
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
  return `${CHAT_BASE_CONTEXT}\n\n${MODE_CONTEXT[mode]}\n\nTrusted instructions from ${loadedPath}:\n${agents}`;
}
