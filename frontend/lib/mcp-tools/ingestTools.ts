import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ALL_ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES } from "@/lib/storage/fileTypes";
import { getPublicAppUrl, PublicUrlConfigError } from "@/lib/config/publicUrl";
import { registerGatedTool } from "./toolGate";

export async function registerIngestTools(server: McpServer, disabledTools: ReadonlySet<string>): Promise<void> {
  registerGatedTool(server, disabledTools, "get_upload_link", {
    title: "Get Upload Link",
    description: "Returns the authenticated browser upload page and its S3 inbox destination. It never transfers or returns file contents.",
    inputSchema: {},
  }, async () => {
    try {
      return { content: [{ type: "text", text: JSON.stringify({ url: `${getPublicAppUrl()}/upload`, destinationPath: "data/inbox/", acceptedExtensions: ALL_ALLOWED_EXTENSIONS.map((ext) => `.${ext}`), maxBytes: MAX_UPLOAD_BYTES }) }] };
    } catch (err) {
      const message = err instanceof PublicUrlConfigError ? err.message : "Public application URL is unavailable";
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ code: "configuration_error", message }) }] };
    }
  });
}
