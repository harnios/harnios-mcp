import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { EXTERNAL_PROXY_HOP_HEADER } from "@/lib/external-mcp/client";
import { registerExternalTools } from "@/lib/mcp-tools/externalTools";
import { registerNativeTools } from "@/lib/mcp-tools/register";
import { verifyPersonalAccessToken } from "@/lib/oauth/personalAccessTokens";
import { verifyAccessToken } from "@/lib/oauth/tokens";

// mcp-handler's ServerOptions type only declares name/version, but it
// forwards serverInfo as-is to the SDK's McpServer, which also accepts
// description. Keeping this untyped avoids TS excess-property checks.
const serverInfo = {
  name: "harness-mcp-s3",
  version: "0.1.0",
  description: "read assistant/AGENTS.md; call get_os_engine/get_os_upgrade/get_os_init to set up or repair it (spec 016)",
};

/**
 * Two handler variants, split on whether the inbound request itself carries
 * `EXTERNAL_PROXY_HOP_HEADER` (spec 031, research.md's proxy-depth cap): a
 * request that arrived *as* an outbound proxy call from this same app (or
 * another Harnios instance) never registers external tools itself, capping
 * any proxy chain — including a connection that points back at this very
 * deployment, directly or through a cycle — at one hop. Without this, such
 * a connection recurses without bound: registering external tools triggers
 * an outbound catalog fetch, which is itself a fresh inbound `/mcp` request
 * that would try to do the same thing again.
 */
const handlerWithExternal = createMcpHandler(
  async (server) => {
    const disabledTools = await registerNativeTools(server);
    await registerExternalTools(server, disabledTools);
  },
  { serverInfo },
  { maxDuration: 60, verboseLogs: true },
);

const handlerWithoutExternal = createMcpHandler(
  async (server) => {
    await registerNativeTools(server);
  },
  { serverInfo },
  { maxDuration: 60, verboseLogs: true },
);

// spec 008-mcp-oauth, FR-001: every tool request must carry a valid,
// unexpired, unrevoked access token before any storage operation runs.
// spec 013-mcp-token-auth, FR-003/FR-004: a personal access token is an
// additional, independent way to authenticate — tried as a fallback so OAuth
// access tokens keep working exactly as before.
function withAuth(handler: typeof handlerWithExternal) {
  return withMcpAuth(
    handler,
    async (_req, bearerToken) => {
      if (!bearerToken) return undefined;
      return (await verifyAccessToken(bearerToken)) ?? (await verifyPersonalAccessToken(bearerToken));
    },
    {
      required: true,
      resourceMetadataPath: "/.well-known/oauth-protected-resource",
    },
  );
}

const authHandlerWithExternal = withAuth(handlerWithExternal);
const authHandlerWithoutExternal = withAuth(handlerWithoutExternal);

function selectHandler(request: Request): typeof authHandlerWithExternal {
  return request.headers.has(EXTERNAL_PROXY_HOP_HEADER) ? authHandlerWithoutExternal : authHandlerWithExternal;
}

export const GET: typeof authHandlerWithExternal = (request, ...rest) => selectHandler(request)(request, ...rest);
export const POST: typeof authHandlerWithExternal = (request, ...rest) => selectHandler(request)(request, ...rest);
