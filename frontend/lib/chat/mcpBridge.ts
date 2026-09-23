import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { jsonSchema, tool, type Tool } from "ai";
import { callTool } from "@/lib/mcp-tools/inProcessClient";

function safeToolResult(result: unknown): unknown {
  if (typeof result === "string") return result.slice(0, 120_000);
  return result;
}

export async function discoverFromClient(client: Client): Promise<Record<string, Tool>> {
  const { tools } = await client.listTools();
  return Object.fromEntries(tools.map((definition) => {
    return [definition.name, tool({
      description: definition.description || `Harnios MCP tool: ${definition.name}`,
      inputSchema: jsonSchema(definition.inputSchema as Record<string, unknown>),
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
