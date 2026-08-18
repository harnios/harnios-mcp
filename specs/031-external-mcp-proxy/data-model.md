# Data Model: External MCP Server Proxy

**Input**: [spec.md](./spec.md), [research.md](./research.md)

All records live in the app's single existing S3-compatible bucket, under a new reserved prefix `.mcp-tools/external-servers/` (connections) and `.mcp-tools/external-catalog/` (cached tool catalogs) — siblings of the existing `.mcp-tools/status.json` (native tool enable/disable, spec 025), `.oauth/` (spec 008/013), and `.messaging/` (spec 017) reserved prefixes. Both new prefixes are excluded from `list_directory`/`find_files_by_name`/the `/files` web editor exactly as those existing prefixes already are (`lib/storage/directories.ts`).

## External Server Connection

One record per connection the owner has registered, keyed by a generated id: `.mcp-tools/external-servers/{id}.json`.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Generated on creation (mirrors `lib/oauth/personalAccessTokens.ts`'s `randomBytes(8).toString("hex")`); non-secret, used in URLs. |
| `label` | string | Owner-chosen display name (e.g. "Order Management"). Required, no uniqueness constraint. |
| `url` | string | The external MCP server's remote endpoint. Owner-supplied; validated as a well-formed absolute HTTP(S) URL, not otherwise restricted (spec.md does not require an allowlist beyond "owner-only, not assistant-writable" — research.md §7). |
| `token` | string | The bearer token sent as `Authorization: Bearer {token}` on every outbound call. **Write-only** (Clarifications): present in the stored record and in create/update requests, but never included in any read response or UI render after saving. |
| `enabled` | boolean | Owner-controlled whole-connection pause/resume (FR-017), independent of individual tool enable/disable (FR-008) and of removal (FR-009). Defaults to `true` on creation. |
| `createdAt` | string (ISO 8601) | Set on creation, never changed. |
| `updatedAt` | string (ISO 8601) | Set on every create/edit (including a token replacement or an `enabled` toggle). |

**Lifecycle**: created → (edited / enabled ↔ disabled)\* → removed (hard delete of the record; FR-009). There is no "connecting"/pending intermediate state — a connection is considered configured as soon as it's saved, and its actual reachability is only ever known at the moment a catalog fetch or tool call is attempted (surfaced via the cached catalog's own state, below, not via a field on the connection itself).

**Validation rules**:
- `label`, `url`, `token` are required and non-empty on creation.
- `url` must parse as an absolute `http://` or `https://` URL.
- On edit, `token` is optional (omitting it leaves the previously-stored token unchanged); every other field, if present, replaces the stored value.

## Cached Tool Catalog

One record per connection, keyed by the same id: `.mcp-tools/external-catalog/{id}.json`. Represents the last-known result of listing tools on that external server.

| Field | Type | Notes |
|---|---|---|
| `connectionId` | string | Matches the owning `External Server Connection.id`. |
| `fetchedAt` | string (ISO 8601) | When this catalog was last successfully fetched from the external server. Compared against the TTL constant (research.md §3) to decide whether a request-time refresh is attempted. |
| `tools` | array of `Proxied Tool` (below) | The full tool list as of `fetchedAt`. Empty array if the external server has never been successfully reached. |
| `lastError` | `{ code: string, message: string } \| null` | Set when the most recent fetch attempt failed (whether or not a previous successful `tools`/`fetchedAt` is still being served stale); cleared on the next successful fetch. Surfaced to the owner on the tool management page so a persistently-unreachable connection is visible, not silent. |

### Proxied Tool (embedded in Cached Tool Catalog, not a separate record)

| Field | Type | Notes |
|---|---|---|
| `name` | string | As declared by the external server. Must be unique across every native tool and every other connected external server's tools — a colliding name is dropped from registration (not stored differently here; the collision is detected and reported at registration time, using this cached list plus the native `TOOL_CATALOG`, per FR-013). |
| `title` | string \| undefined | As declared by the external server, if present. |
| `description` | string \| undefined | As declared by the external server, if present. |
| `inputSchema` | JSON Schema object | As declared by the external server; converted to a best-effort Zod shape only at registration time (research.md §4), not stored pre-converted, so a schema-conversion improvement doesn't require a cache invalidation. |
| `outputSchema` | JSON Schema object \| undefined | Same as `inputSchema`. |
| `enabled` | boolean | Owner-controlled per-tool state (FR-008), stored the same way native tool disable-state already is — as an entry in the existing shared `.mcp-tools/status.json` `disabledTools` list (spec 025), keyed by this tool's `name`, not as a field here. Kept out of this record so enable/disable doesn't require rewriting the (larger, network-sourced) catalog record. |

## External Rate Limit State

One record per connection, keyed by the same id: `.mcp-tools/external-servers/{id}-rate-limit.json` (sibling key to the connection record, same prefix). Shape identical to the existing `lib/messaging/rateLimit.ts` state:

| Field | Type | Notes |
|---|---|---|
| `windowStart` | string (ISO 8601) | Start of the current fixed window. |
| `count` | number | Calls recorded in the current window. |

## Relationships

```
External Server Connection (1) ──── (0..1) Cached Tool Catalog
External Server Connection (1) ──── (0..1) External Rate Limit State
Cached Tool Catalog (1) ──── (0..n) Proxied Tool  [embedded, not a separate S3 record]
```

A connection's tools disappear from the assistant's view when any of the following is true: the connection is `enabled: false` (FR-017), the connection has been removed (FR-009, and its records deleted), or the specific tool's `name` is in the shared `disabledTools` list (FR-008) — independent of whether its cached catalog entry is stale.
