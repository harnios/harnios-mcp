import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerExternalTools } from "@/lib/mcp-tools/externalTools";
import { registerNativeTools } from "@/lib/mcp-tools/register";
import { MCP_BOOTSTRAP_INSTRUCTIONS } from "@/lib/mcp-tools/toolGate";

export interface ToolCallResult {
  content: unknown;
  isError: boolean;
}

export async function createInProcessMcpClient(options: { includeExternal?: boolean } = {}): Promise<Client> {
  const server = new McpServer(
    { name: "harness-mcp-in-process", version: "0.1.0" },
    { instructions: MCP_BOOTSTRAP_INSTRUCTIONS },
  );
  const disabledTools = await registerNativeTools(server);
  if (options.includeExternal !== false) await registerExternalTools(server, disabledTools);
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "harnios-chat", version: "0.1.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

/** Connects the same native and enabled external MCP surface used by /mcp. */
export async function withInProcessMcpClient<T>(
  fn: (client: Client) => Promise<T>,
  options: { includeExternal?: boolean } = {},
): Promise<T> {
  const client = await createInProcessMcpClient(options);
  try {
    return await fn(client);
  } finally {
    await client.close().catch(() => undefined);
  }
}

export async function callTool(client: Client, name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
  const result = await client.callTool({ name, arguments: args });
  return { content: result.content, isError: result.isError === true };
}
