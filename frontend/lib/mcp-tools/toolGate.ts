import type { McpServer, ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AnySchema, ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

const BOOTSTRAP_WINDOW_MS = 5 * 60_000;

type BootstrapStatus = "ready" | "missing";

interface BootstrapState {
  status: BootstrapStatus;
  recordedAt: number;
}

interface ToolExtra {
  authInfo?: { token: string };
  sessionId?: string;
}

const bootstrapByClient = new Map<string, BootstrapState>();
const bootstrapByServer = new WeakMap<McpServer, BootstrapState>();

export const MCP_BOOTSTRAP_INSTRUCTIONS =
  'For every task, your first storage call MUST be read_file with {"path":"AGENTS.md"}. ' +
  "Read and follow AGENTS.md before selecting or calling any other tool. " +
  "Do not substitute get_inbox, get_os_init, or another shortcut as the first call. " +
  "If AGENTS.md returns not_found, call get_os_engine and repair AGENTS.md before continuing.";

function withBootstrapInstruction(name: string, description?: string): string {
  const bootstrap = name === "read_file"
    ? 'BOOTSTRAP ENTRY: For every task, use this tool first with {"path":"AGENTS.md"}, then follow that file before any other tool call. If it returns not_found, call get_os_engine and repair AGENTS.md before continuing.'
    : `BOOTSTRAP REQUIRED: ${MCP_BOOTSTRAP_INSTRUCTIONS}`;
  return description ? `${bootstrap} ${description}` : bootstrap;
}

function clientKey(extra: ToolExtra | undefined): string | undefined {
  if (extra?.authInfo?.token) return `token:${extra.authInfo.token}`;
  if (extra?.sessionId) return `session:${extra.sessionId}`;
  return undefined;
}

function getBootstrapState(server: McpServer, extra: ToolExtra | undefined): BootstrapState | undefined {
  const key = clientKey(extra);
  const state = key ? bootstrapByClient.get(key) : bootstrapByServer.get(server);
  if (!state) return undefined;
  if (Date.now() - state.recordedAt <= BOOTSTRAP_WINDOW_MS) return state;
  if (key) bootstrapByClient.delete(key);
  else bootstrapByServer.delete(server);
  return undefined;
}

function setBootstrapState(server: McpServer, extra: ToolExtra | undefined, status: BootstrapStatus): void {
  const state = { status, recordedAt: Date.now() };
  const key = clientKey(extra);
  if (key) bootstrapByClient.set(key, state);
  else bootstrapByServer.set(server, state);
}

function clearBootstrapState(server: McpServer, extra: ToolExtra | undefined): void {
  const key = clientKey(extra);
  if (key) bootstrapByClient.delete(key);
  else bootstrapByServer.delete(server);
}

function resultCode(result: CallToolResult): string | undefined {
  for (const block of result.content ?? []) {
    if (block.type !== "text") continue;
    try {
      const value = JSON.parse(block.text) as { code?: unknown };
      if (typeof value.code === "string") return value.code;
    } catch {
      // Plain-text tool output is not an error envelope.
    }
  }
  return undefined;
}

function bootstrapRequiredResult(): CallToolResult {
  return {
    isError: true,
    content: [{
      type: "text",
      text: JSON.stringify({
        code: "agents_bootstrap_required",
        message:
          'This tool was not executed. First call read_file with {"path":"AGENTS.md"}, ' +
          "read and follow its instructions, then retry the requested tool.",
      }),
    }],
  };
}

/**
 * Forwards to server.registerTool(name, config, cb) only when `name` is not
 * in `disabledTools` — otherwise it is never registered at all, so it's
 * absent from tools/list and a call to it fails exactly like an
 * unrecognized tool name (not the SDK's own distinguishable "Tool X
 * disabled" error, which only applies to tools that were registered and
 * then disabled).
 *
 * `disabledTools` is fetched once per /mcp request by the caller
 * (lib/mcp-tools/store.ts's getDisabledTools(), spec 025 research.md §6)
 * and threaded through every register*Tools(server, disabledTools) call —
 * not re-read here per tool, since that would mean one S3 read per tool per
 * request instead of one per request (research.md §2). Supersedes spec
 * 023's MCP_DISABLED_TOOLS env-var read (spec 025 FR-007/FR-011).
 *
 * Mirrors McpServer.registerTool's own generic signature (mcp.d.ts) rather
 * than a `Parameters<McpServer["registerTool"]>` pass-through — the latter
 * collapses to `never` because indexed access on a generic method loses its
 * type parameters, which TypeScript can't be told to re-infer from a rest
 * parameter.
 */
export function registerGatedTool<
  OutputArgs extends ZodRawShapeCompat | AnySchema,
  InputArgs extends undefined | ZodRawShapeCompat | AnySchema = undefined,
>(
  server: McpServer,
  disabledTools: ReadonlySet<string>,
  name: string,
  config: {
    title?: string;
    description?: string;
    inputSchema?: InputArgs;
    outputSchema?: OutputArgs;
    annotations?: ToolAnnotations;
    _meta?: Record<string, unknown>;
  },
  cb: ToolCallback<InputArgs>,
): void {
  if (!disabledTools.has(name)) {
    const hasInputSchema = config.inputSchema !== undefined;
    const invoke = cb as unknown as (...args: unknown[]) => CallToolResult | Promise<CallToolResult>;
    const guardedCallback = (async (...callbackArgs: unknown[]) => {
      const args = (hasInputSchema ? callbackArgs[0] : {}) as Record<string, unknown>;
      const extra = (hasInputSchema ? callbackArgs[1] : callbackArgs[0]) as ToolExtra | undefined;
      const state = getBootstrapState(server, extra);
      const isAgentsRead = name === "read_file" && args.path === "AGENTS.md";
      const isRepairEntry = name === "get_os_engine" && state?.status === "missing";

      if (!isAgentsRead && !isRepairEntry && state?.status !== "ready") {
        return bootstrapRequiredResult();
      }

      const result = await invoke(...callbackArgs);
      if (isAgentsRead) {
        if (result.isError !== true) setBootstrapState(server, extra, "ready");
        else if (resultCode(result) === "not_found") setBootstrapState(server, extra, "missing");
        else clearBootstrapState(server, extra);
      } else if (isRepairEntry && result.isError !== true) {
        setBootstrapState(server, extra, "ready");
      }
      return result;
    }) as unknown as ToolCallback<InputArgs>;

    server.registerTool(
      name,
      { ...config, description: withBootstrapInstruction(name, config.description) },
      guardedCallback,
    );
  }
}
