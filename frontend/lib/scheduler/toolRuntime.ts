import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { withInProcessMcpClient as withSharedInProcessMcpClient, callTool as callSharedTool } from "@/lib/mcp-tools/inProcessClient";
import type { ToolCallResult } from "@/lib/mcp-tools/inProcessClient";

/**
 * A Mistral function-tool definition, shaped for `chat.complete({ tools })`.
 */
export interface MistralToolDefinition {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export type { ToolCallResult } from "@/lib/mcp-tools/inProcessClient";

/**
 * Opens an in-process McpServer + Client pair connected over
 * InMemoryTransport (research.md §1, contracts/scheduler-run-protocol.md
 * step 1) — no HTTP loopback, no external proxied tools. The server side
 * registers exactly the native tool set (with owner-disabled tools already
 * gated out), and the client side is what a Scheduled Task's model loop
 * drives. `fn` receives the connected client; the pair is always torn down
 * afterward, even if `fn` throws.
 */
export async function withInProcessMcpClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  return withSharedInProcessMcpClient(fn, { includeExternal: false });
}

/** Maps the client's real tool list (JSON Schema, computed by the SDK) into Mistral's function-tool format. */
export async function listMistralTools(client: Client): Promise<MistralToolDefinition[]> {
  const { tools } = await client.listTools();
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema as Record<string, unknown>,
    },
  }));
}

export async function callTool(client: Client, name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
  return callSharedTool(client, name, args);
}
