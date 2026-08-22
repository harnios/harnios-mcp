import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerNativeTools } from "@/lib/mcp-tools/register";

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

export interface ToolCallResult {
  content: unknown;
  isError: boolean;
}

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
  const server = new McpServer({
    name: "harness-mcp-scheduler",
    version: "0.1.0",
  });
  await registerNativeTools(server);

  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "harnios-scheduler", version: "0.1.0" });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  try {
    return await fn(client);
  } finally {
    await client.close().catch(() => undefined);
  }
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
  const result = await client.callTool({ name, arguments: args });
  return { content: result.content, isError: result.isError === true };
}
