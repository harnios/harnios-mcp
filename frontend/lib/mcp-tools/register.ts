import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "@/lib/mcp-tools";
import { registerDocsTools } from "@/lib/mcp-tools/docsTools";
import { registerEngineTools } from "@/lib/mcp-tools/engineTools";
import { registerInboxTools } from "@/lib/mcp-tools/inboxTools";
import { registerMessagingTools } from "@/lib/mcp-tools/messagingTools";
import { getDisabledTools } from "@/lib/mcp-tools/store";
import { registerTreeTools } from "@/lib/mcp-tools/treeTools";

/**
 * Registers every native (non-proxied) tool this server exposes — file
 * operations, engine bootstrap, messaging, inbox, tree search — with
 * owner-managed disabled-tool gating already applied. Shared by the real
 * `/mcp` HTTP endpoint (app/mcp/route.ts) and the scheduler's in-process
 * tool runtime (lib/scheduler/toolRuntime.ts, spec 032), so a Scheduled
 * Task's model sees exactly the same tool surface — and the same
 * owner-disabled tools — as a live connected assistant. Deliberately does
 * NOT include registerExternalTools (spec 031's proxied tools) — extracted
 * out of app/mcp/route.ts, which composes external tools separately.
 */
export async function registerNativeTools(server: McpServer): Promise<ReadonlySet<string>> {
  const disabledTools = await getDisabledTools();
  await registerTools(server, disabledTools);
  await registerEngineTools(server, disabledTools);
  await registerMessagingTools(server, disabledTools);
  await registerInboxTools(server, disabledTools);
  await registerTreeTools(server, disabledTools);
  await registerDocsTools(server, disabledTools);
  return disabledTools;
}
