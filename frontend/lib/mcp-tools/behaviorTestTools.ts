import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  behaviorTestInputShape,
  runBehaviorTest,
  validateBehaviorTestInput,
} from "@/lib/chat/behaviorTest";
import { registerGatedTool } from "./toolGate";

export async function registerBehaviorTestTools(server: McpServer, disabledTools: ReadonlySet<string>): Promise<void> {
  registerGatedTool(server, disabledTools, "test_agent_behavior", {
    title: "Test Agent Behavior",
    description:
      "Simulates one Harnios chat turn using the configured internal model and the same enabled MCP tools. " +
      "Read tools run normally; mutating and external tools return simulated success without applying changes. " +
      "Returns a JSON report with the response, proposed changes, assertion results and real/dry-run tool trace.",
    inputSchema: behaviorTestInputShape,
  }, async (input) => {
    const validated = validateBehaviorTestInput(input);
    if (!validated.success) {
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ code: "invalid_input", message: validated.message }) }] };
    }
    const report = await runBehaviorTest(validated.data);
    return {
      isError: report.status !== "completed",
      content: [{ type: "text", text: JSON.stringify(report) }],
    };
  });
}
