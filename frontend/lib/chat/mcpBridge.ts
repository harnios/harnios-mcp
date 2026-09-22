import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { jsonSchema, tool, type Tool } from "ai";
import { callTool } from "@/lib/mcp-tools/inProcessClient";

const READ_ONLY_TOOLS = new Set([
  "read_file", "list_directory", "list_directory_tree", "find_files_by_name", "search_file_content",
  "get_os_engine", "get_os_upgrade", "get_os_init", "get_inbox", "get_docs",
]);

export function requiresToolApproval(name: string, external = false): boolean {
  return external || !READ_ONLY_TOOLS.has(name);
}

function isExternalTool(name: string): boolean {
  return !READ_ONLY_TOOLS.has(name) && !["write_file", "create_file", "update_file", "delete_file", "create_directory", "delete_directory", "move_file", "send_email", "send_telegram_message", "run_python", "run_job", "get_os_engine", "get_os_upgrade", "get_os_init", "get_inbox", "get_docs"].includes(name);
}

function safeToolResult(result: unknown): unknown {
  if (typeof result === "string") return result.slice(0, 120_000);
  return result;
}

export async function discoverFromClient(client: Client): Promise<Record<string, Tool>> {
  const { tools } = await client.listTools();
  return Object.fromEntries(tools.map((definition) => {
    const approval = requiresToolApproval(definition.name, isExternalTool(definition.name));
    return [definition.name, tool({
      description: definition.description || `Harnios MCP tool: ${definition.name}`,
      inputSchema: jsonSchema(definition.inputSchema as Record<string, unknown>),
      needsApproval: approval,
      execute: async (input) => {
        const result = await callTool(client, definition.name, input as Record<string, unknown>);
        return { isError: result.isError, content: safeToolResult(result.content) };
      },
    })];
  }));
}

export function safeToolName(name: unknown): string {
  return typeof name === "string" ? name.slice(0, 120) : "unknown tool";
}
