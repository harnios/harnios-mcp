import { readFile } from "@/lib/storage/files";
import { StorageError } from "@/lib/storage/errors";
import type { ChatMode } from "./mode";

const AGENTS_PATH = "os/AGENTS.md";
const LEGACY_AGENTS_PATH = "AGENTS.md";

const CHAT_BASE_CONTEXT = `You are the Harnios assistant inside the authenticated Company OS.
Be concise, explain actions clearly, and never claim an operation succeeded unless its result says so.
All enabled Harnios MCP tools may run directly when appropriate.`;

const MODE_CONTEXT: Record<ChatMode, string> = {
  harnios: `You are in Harnios mode. The server reads AGENTS.md through MCP before every new user request; follow those instructions before selecting or calling other tools. Use the most relevant tools and ground all claims about Company OS files, data, configuration, or state in tool results. Never substitute assumptions or memory for a tool result. Do not narrate tool calls, intermediate actions, or tool results in your prose: the UI already displays that activity. Reply only with the final user-facing result, unless the user explicitly asks for execution details.`,
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
