import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { DOCS_TOPICS, getDocsContent } from "@/lib/docs/content";
import { registerGatedTool } from "./toolGate";

function textResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }] };
}

/**
 * Registers the get_docs MCP tool (spec 035) — hands a connected assistant
 * the same in-app documentation the /docs page renders (lib/docs/content.ts,
 * FR-008), so it can answer an owner's questions about how the Harnios app
 * itself works. Deliberately a single tool with a `topic` enum parameter,
 * not one tool per topic (contracts/get-docs-tool.md, research.md §2) — an
 * invalid `topic` value never reaches the handler below: the MCP SDK
 * rejects it against the zod enum first, and that validation error already
 * names the accepted values (FR-007).
 */
export async function registerDocsTools(server: McpServer, disabledTools: ReadonlySet<string>): Promise<void> {
  registerGatedTool(
    server,
    disabledTools,
    "get_docs",
    {
      title: "Get App Documentation",
      description:
        "Returns documentation about how to use the Harnios app itself — navigation, the file " +
        "manager, tool management, Scheduled Tasks, settings/connections. This is NOT " +
        "documentation about the connected business's own OS/data content (use get_os_engine / " +
        "get_change_process for that). Omit topic for a general overview.",
      inputSchema: {
        topic: z
          .enum(DOCS_TOPICS)
          .optional()
          .describe("Which app-documentation topic to retrieve. Omit for the general overview."),
      },
    },
    // topic (when present) already passed the zod enum check above, so
    // getDocsContent always returns a string here, never undefined.
    async ({ topic }) => textResult(getDocsContent(topic)!),
  );
}
