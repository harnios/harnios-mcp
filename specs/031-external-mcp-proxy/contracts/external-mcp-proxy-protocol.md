# Contract: External MCP Proxy Protocol

**Input**: [spec.md](../spec.md), [research.md](../research.md), [data-model.md](../data-model.md)

Two directions: how Harnios talks *out* to a connected external MCP server, and what a proxied tool looks like on the *inbound* `/mcp` surface an assistant connects to. Extends [specs/002-s3-mcp-server/contracts/mcp-tools.md](../../002-s3-mcp-server/contracts/mcp-tools.md)'s "Common error shape" with proxy-specific codes.

## Outbound: Harnios → external server

For every **enabled** External Server Connection (data-model.md), on each `/mcp` request:

| Step | Behavior |
|---|---|
| Catalog available and fresh (`now - fetchedAt < TTL`) | No outbound call made; cached `tools` used as-is. |
| Catalog missing or stale | One bounded-timeout (research.md §2) attempt to connect and call `tools/list` on `url`, authenticated with `Authorization: Bearer {token}`. On success, the Cached Tool Catalog record is overwritten with the new `tools`/`fetchedAt`, `lastError: null`. On failure, the *existing* `tools`/`fetchedAt` are left as-is (served stale) and `lastError` is set to the failure's `{ code, message }` — or, if there is no existing catalog at all yet, `tools: []` is used. |

For a `tools/call` to a specific proxied tool:

| Step | Behavior |
|---|---|
| Connection disabled, or removed since the catalog was cached | Tool is not registered at all this request (see Inbound below) — this case cannot reach the call step. |
| Rate limit already reached for this connection (research.md §6) | Call is refused locally; the external server is never contacted. Result: `isError: true`, `{ code: "rate_limited", message: "..." }`. |
| Rate limit OK | A bounded-timeout (research.md §2) `tools/call` is issued to `url` with the assistant's arguments and `Authorization: Bearer {token}`, under a fresh short-lived client (research.md §1). |
| External server responds with a normal tool result (success or the tool's own `isError`) | Returned to the assistant unchanged (research.md §5) — Harnios does not reinterpret business-level success/failure. |
| Connection refused / DNS failure / network error | `isError: true`, `{ code: "external_unreachable", message: "..." }` |
| Timeout exceeded | `isError: true`, `{ code: "external_timeout", message: "..." }` |
| HTTP 401/403, or the external server rejects the token during the MCP handshake | `isError: true`, `{ code: "external_unauthorized", message: "..." }` |
| Response is malformed / not valid MCP (research.md §5, spec.md Edge Cases) | `isError: true`, `{ code: "external_invalid_response", message: "..." }` |

## Proxy-specific error codes

Extends the existing `{ code, message }` shape (`specs/002-s3-mcp-server/contracts/mcp-tools.md`'s "Common error shape") with:

| Code | Meaning |
|---|---|
| `external_unreachable` | The external server's `url` could not be reached at all. |
| `external_timeout` | The external server didn't respond within the proxy's own timeout (research.md §2), independent of the request's overall `maxDuration`. |
| `external_unauthorized` | The stored token was rejected by the external server. |
| `external_invalid_response` | The external server returned something that isn't a valid MCP tool result. |
| `rate_limited` | Harnios's own per-connection rate limit (research.md §6, FR-016) was hit; the external server was never contacted for this call. |

## Inbound: what an assistant connected to `/mcp` sees

| Condition | Behavior |
|---|---|
| A Proxied Tool's `name` doesn't collide with any native tool or any other connected server's tool, its connection is `enabled: true`, and it isn't in the shared `disabledTools` list | Registered on `tools/list` exactly like a native tool (via `registerGatedTool`, research.md §4) — same calling convention, same place in the list, no marker distinguishing it as "external." |
| A Proxied Tool's `name` collides with an already-registered tool (native, or from a different, earlier-registered connection) | Not registered at all this request (FR-013); the collision is recorded so the owner sees it on the tool management page (contracts/connection-management-routes.md). The earlier-registered tool keeps working unaffected. |
| Tool's connection is `enabled: false`, or the tool's `name` is in `disabledTools`, or the connection has been removed | Absent from `tools/list` — calling it behaves exactly like calling any unrecognized tool name (mirrors `toolGate.ts`'s existing behavior for disabled native tools). |
| Two calls to the *same* proxied tool arrive in the same `/mcp` request (batched) | Each is rate-limited and forwarded independently — no per-request deduplication. |

## Unaffected

Every native tool's contract (`specs/002-s3-mcp-server/contracts/mcp-tools.md`, `specs/017-mcp-email-telegram-tools`, `specs/020-mcp-inbox-tool`, `specs/022-mcp-tree-search`) is unchanged. `/mcp`'s own authentication (OAuth access token or personal access token, spec 008/013) is unchanged and unaffected by whether any external server is connected (spec.md FR-011/SC-005).
