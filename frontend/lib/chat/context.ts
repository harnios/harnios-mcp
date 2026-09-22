import { readFile } from "@/lib/storage/files";

const AGENTS_PATH = "os/AGENTS.md";

export const CHAT_BASE_CONTEXT = `You are the Harnios assistant inside the authenticated Company OS.
Use the available Harnios MCP tools when they are useful. Be concise, explain actions clearly, and never claim a tool succeeded unless its result says so.
Read-only tools may run directly. Any mutation, deletion, message, code/job execution, external tool, or unknown tool requires explicit user approval.`;

export async function loadChatContext(): Promise<string> {
  const { content } = await readFile(AGENTS_PATH);
  const agents = content.toString("utf-8").slice(0, 120_000);
  return `${CHAT_BASE_CONTEXT}\n\nTrusted instructions from ${AGENTS_PATH}:\n${agents}`;
}
