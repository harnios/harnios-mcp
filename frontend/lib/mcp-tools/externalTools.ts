import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { callExternalTool } from "@/lib/external-mcp/client";
import { getOrRefreshCatalog } from "@/lib/external-mcp/catalog";
import { checkAndRecordExternalCall } from "@/lib/external-mcp/rateLimit";
import { convertJsonSchemaToZod } from "@/lib/external-mcp/schemaConvert";
import { listExternalServerConnectionsFull } from "@/lib/external-mcp/store";
import type { CachedToolCatalog, ExternalProxyError, ExternalServerConnection, ProxiedTool } from "@/lib/external-mcp/types";
import { TOOL_CATALOG } from "./catalog";
import { registerGatedTool } from "./toolGate";

export interface ExternalToolRegistration {
  connectionId: string;
  tool: ProxiedTool;
}

export interface ExternalToolCollision {
  connectionId: string;
  connectionLabel: string;
  toolName: string;
}

/**
 * Resolves which externally-sourced tools should actually be registered,
 * applying FR-013's collision rule: a tool whose name matches a native tool
 * (`TOOL_CATALOG`) or an already-resolved external tool from an earlier
 * connection is skipped, not silently overridden — the earlier registration
 * wins. Pure function — shared by the live `/mcp` registration path below
 * and `/tools/connections`'s owner-facing view, so a collision is visible
 * in both places without a separate persisted record.
 */
export function resolveExternalTools(
  connections: Array<{ id: string; label: string; enabled: boolean }>,
  catalogsByConnectionId: ReadonlyMap<string, CachedToolCatalog>,
): { registrations: ExternalToolRegistration[]; collisions: ExternalToolCollision[] } {
  const takenNames = new Set(TOOL_CATALOG.map((entry) => entry.name));
  const registrations: ExternalToolRegistration[] = [];
  const collisions: ExternalToolCollision[] = [];

  for (const connection of connections) {
    if (!connection.enabled) continue;
    const catalog = catalogsByConnectionId.get(connection.id);
    if (!catalog) continue;

    for (const tool of catalog.tools) {
      if (takenNames.has(tool.name)) {
        collisions.push({ connectionId: connection.id, connectionLabel: connection.label, toolName: tool.name });
        continue;
      }
      takenNames.add(tool.name);
      registrations.push({ connectionId: connection.id, tool });
    }
  }

  return { registrations, collisions };
}

/** Mirrors lib/mcp-tools/result.ts's errorResult shape for proxy-specific failures (contracts/external-mcp-proxy-protocol.md). */
function externalErrorResult(err: unknown): CallToolResult {
  const proxyError = err as ExternalProxyError;
  const code = proxyError?.code ?? "external_unreachable";
  const message = proxyError?.message ?? "Unknown proxy error";
  return { isError: true, content: [{ type: "text", text: JSON.stringify({ code, message }) }] };
}

/**
 * Registers every currently-available externally-sourced tool onto `server`
 * (spec 031). Fetches each enabled connection's cached-or-refreshed tool
 * catalog (research.md §3), resolves name collisions (FR-013), and wires
 * each surviving tool through the existing `registerGatedTool` so it's
 * gated by `disabledTools` exactly like a native tool (FR-008).
 *
 * `outputSchema` is deliberately never declared for a proxied tool, even
 * when the external server declares one: Harnios forwards whatever content
 * the external server returns unchanged (research.md §5, FR-004), and it
 * has no way to guarantee that content matches a locally-converted,
 * best-effort output schema — declaring one risks the SDK rejecting a
 * perfectly valid external result during local output validation.
 */
export async function registerExternalTools(server: McpServer, disabledTools: ReadonlySet<string>): Promise<void> {
  const connections = await listExternalServerConnectionsFull();
  const connectionsById = new Map<string, ExternalServerConnection>(connections.map((c) => [c.id, c]));

  const catalogsByConnectionId = new Map<string, CachedToolCatalog>();
  await Promise.all(
    connections
      .filter((connection) => connection.enabled)
      .map(async (connection) => {
        catalogsByConnectionId.set(connection.id, await getOrRefreshCatalog(connection));
      }),
  );

  const { registrations } = resolveExternalTools(connections, catalogsByConnectionId);

  for (const { connectionId, tool } of registrations) {
    const connection = connectionsById.get(connectionId);
    if (!connection) continue;

    registerGatedTool(
      server,
      disabledTools,
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: convertJsonSchemaToZod(tool.inputSchema),
      },
      async (args) => {
        try {
          await checkAndRecordExternalCall(connection.id);
          return await callExternalTool(connection, tool.name, args as Record<string, unknown>);
        } catch (err) {
          return externalErrorResult(err);
        }
      },
    );
  }
}
