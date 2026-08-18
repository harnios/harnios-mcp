import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport, StreamableHTTPError } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ExternalProxyError } from "./types";
import type { ExternalServerConnection, ProxiedTool } from "./types";

/**
 * Per-call timeouts, independent of the `/mcp` route's shared
 * `maxDuration: 60` (research.md §2) — a catalog refresh gets a shorter
 * budget since it must not block an unrelated tool call in the same
 * request; a tool call gets up to spec.md SC-002/SC-003's 15s.
 */
const CATALOG_FETCH_TIMEOUT_MS = 8_000;
const TOOL_CALL_TIMEOUT_MS = 15_000;

/**
 * Set on every outbound proxy request so the receiving `/mcp` endpoint (if
 * it's itself a Harnios instance) knows not to register *its own* external
 * connections while handling it (`app/mcp/route.ts`). Without this, a
 * connection that points back at this same deployment — directly (a
 * self-connection) or through a cycle across several connected instances —
 * would recurse without bound: registering external tools for an inbound
 * request triggers an outbound catalog fetch, which is itself a fresh
 * inbound request that tries to do the same thing again. Capping proxy
 * chains at one hop closes this off entirely, at the cost of not reaching a
 * tool on a *third* hop through a chain of proxies — an explicit, sane
 * boundary rather than an accident.
 */
export const EXTERNAL_PROXY_HOP_HEADER = "x-harnios-external-proxy-hop";

/**
 * Maps a failure from the outbound SDK client into the proxy's own error
 * codes (contracts/external-mcp-proxy-protocol.md) — distinguishing "the
 * external system said no" from "Harnios couldn't reach it at all"
 * (research.md §5).
 */
function classifyError(err: unknown): ExternalProxyError {
  if (err instanceof StreamableHTTPError) {
    if (err.code === 401 || err.code === 403) {
      return new ExternalProxyError(
        "external_unauthorized",
        `External server rejected the configured token (HTTP ${err.code})`,
      );
    }
    return new ExternalProxyError("external_unreachable", `External server returned an error: ${err.message}`);
  }

  if (err instanceof McpError) {
    if (err.code === ErrorCode.RequestTimeout) {
      return new ExternalProxyError("external_timeout", "External server did not respond in time");
    }
    return new ExternalProxyError(
      "external_invalid_response",
      `External server returned an invalid MCP response: ${err.message}`,
    );
  }

  if (err instanceof Error && err.name === "AbortError") {
    return new ExternalProxyError("external_timeout", "External server did not respond in time");
  }

  return new ExternalProxyError(
    "external_unreachable",
    `Could not reach the external server: ${err instanceof Error ? err.message : String(err)}`,
  );
}

/**
 * Opens a short-lived client for exactly one operation and tears it down
 * immediately after (research.md §1) — never held open across `/mcp`
 * requests.
 */
async function withClient<T>(
  connection: ExternalServerConnection,
  timeoutMs: number,
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const transport = new StreamableHTTPClientTransport(new URL(connection.url), {
    requestInit: {
      headers: { Authorization: `Bearer ${connection.token}`, [EXTERNAL_PROXY_HOP_HEADER]: "1" },
    },
  });
  const client = new Client({ name: "harnios-external-mcp-proxy", version: "0.1.0" });

  try {
    await client.connect(transport, { timeout: timeoutMs });
    return await fn(client);
  } catch (err) {
    throw classifyError(err);
  } finally {
    await client.close().catch(() => {});
  }
}

/** Fetches the current tool catalog from a connection's external server (research.md §3). */
export async function listExternalTools(connection: ExternalServerConnection): Promise<ProxiedTool[]> {
  return withClient(connection, CATALOG_FETCH_TIMEOUT_MS, async (client) => {
    const result = await client.listTools(undefined, { timeout: CATALOG_FETCH_TIMEOUT_MS });
    return result.tools.map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema as Record<string, unknown> | undefined,
      outputSchema: tool.outputSchema as Record<string, unknown> | undefined,
    }));
  });
}

/** Forwards one `tools/call` to a connection's external server (research.md §5). */
export async function callExternalTool(
  connection: ExternalServerConnection,
  toolName: string,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  return withClient(connection, TOOL_CALL_TIMEOUT_MS, async (client) => {
    const result = await client.callTool({ name: toolName, arguments: args }, undefined, {
      timeout: TOOL_CALL_TIMEOUT_MS,
    });
    return result as CallToolResult;
  });
}
