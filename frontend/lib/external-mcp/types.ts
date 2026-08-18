/** data-model.md — External Server Connection: one remote MCP server the owner has registered. */
export interface ExternalServerConnection {
  id: string;
  label: string;
  url: string;
  /** Write-only (Clarifications, FR-015): never returned by any read path — see store.ts's list/get helpers. */
  token: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** `ExternalServerConnection` with `token` omitted, for every surface that must not expose it (FR-010, FR-015). */
export type ExternalServerConnectionSummary = Omit<ExternalServerConnection, "token"> & { hasToken: boolean };

/** data-model.md — a tool as declared by a connected external server's `tools/list` response. */
export interface ProxiedTool {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

/** data-model.md — Cached Tool Catalog: last-known `tools/list` result for one connection. */
export interface CachedToolCatalog {
  connectionId: string;
  fetchedAt: string;
  tools: ProxiedTool[];
  lastError: { code: string; message: string } | null;
}

/** data-model.md — External Rate Limit State: one fixed-window counter per connection. */
export interface ExternalRateLimitState {
  windowStart: string;
  count: number;
}

/** contracts/external-mcp-proxy-protocol.md — proxy-specific error codes, extending the native `{ code, message }` shape. */
export type ExternalProxyErrorCode =
  | "external_unreachable"
  | "external_timeout"
  | "external_unauthorized"
  | "external_invalid_response"
  | "rate_limited";

export class ExternalProxyError extends Error {
  code: ExternalProxyErrorCode;

  constructor(code: ExternalProxyErrorCode, message: string) {
    super(message);
    this.name = "ExternalProxyError";
    this.code = code;
  }
}
