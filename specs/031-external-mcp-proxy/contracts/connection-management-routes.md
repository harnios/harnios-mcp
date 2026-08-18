# Contract: External Server Connection Management Routes

**Input**: [spec.md](../spec.md), [research.md](../research.md), [data-model.md](../data-model.md)

Owner-only routes for creating, editing, pausing/resuming, refreshing, and removing External Server Connections (data-model.md). Follows the same owner-session-gating and confirm-then-apply conventions as `specs/025-manage-tools-page/contracts/manage-tools-routes.md`. None of these routes, or any capability they expose, is reachable through any MCP tool (FR-002) — this is deliberately a second, separate surface from `/mcp`.

Every route below requires an active owner session (`hasActiveOwnerSession()`); without one, every route responds identically to the existing pattern (`401` for `POST` API routes, `302` redirect to `/oauth/login?continue=<url>` for pages) — omitted from the per-route tables below for brevity, exactly as spec 025's contract already does.

## `GET /tools/connections`

Lists every External Server Connection. For each: `label`, `url`, `enabled` state, and its Cached Tool Catalog status (`fetchedAt`, tool count, `lastError` if any) — so a persistently-unreachable connection is visible, not silent (research.md §3). Any tool dropped due to a name collision (FR-013) is called out here by name, against which connection it belongs to, and which earlier registration it lost to.

Each row links to edit, enable/disable, refresh-now, and remove.

## `GET /tools/connections/new` / `POST /tools/connections/create`

(`create` is its own path segment, not `POST /tools/connections` itself — Next.js doesn't allow a route handler and a page to occupy the same path, and `GET /tools/connections` is the list page above; mirrors `/settings/personal-access-tokens/create`'s existing convention.)

| Step | Behavior |
|---|---|
| `GET` | Renders a form: `label`, `url`, `token` (all required, plain text input — no confirm step, matching how other one-shot creates in this app work, e.g. personal access tokens). |
| `POST`, any required field missing or `url` not a valid absolute `http(s)://` URL | Rejected with a clear validation error, no record written. |
| `POST`, valid | A new External Server Connection is created (`enabled: true`), **and** an immediate catalog refresh is attempted synchronously (FR-014 — a newly connected server's tools must not wait for the background TTL) before redirecting to `/tools/connections`. If that immediate refresh fails, the connection is still saved (`lastError` set on its catalog record) — creation isn't blocked by the external server being unreachable at that instant, since the owner may be configuring it slightly ahead of the external side being ready. |

## `GET /tools/connections/[id]/edit` / `POST /tools/connections/[id]`

| Step | Behavior |
|---|---|
| `GET` | Renders `label` and `url` pre-filled; `token` field is **empty** with placeholder copy explaining it's write-only and will only change if a new value is entered (Clarifications, FR-015). |
| `POST`, `id` doesn't match any connection | `404`-equivalent error, no write. |
| `POST`, `token` left blank | `label`/`url` updated as submitted; the previously-stored token is left untouched. |
| `POST`, `token` provided | `label`/`url`/`token` all updated; the new token takes effect on the very next proxied call — no separate "rotate" step. |
| `POST`, valid (either case) | `updatedAt` refreshed, and — same as creation — an immediate catalog refresh is attempted before redirecting, since editing the `url` (or a corrected `token`) is exactly the moment the owner most wants to confirm it now works. |

## `POST /tools/connections/[id]/enabled` (whole-connection pause/resume, FR-017)

Mirrors spec 025's `/tools/[name]/status` confirm-then-apply shape, applied to a whole connection instead of one tool:

| Condition | Behavior |
|---|---|
| `GET /tools/connections/[id]/confirm?to=enabled\|disabled` | Confirmation screen naming the connection and the pending change, with the same "already-connected assistant sessions may not see this until they reconnect" warning spec 025 already shows for native tools. No side effect (bookmarkable/reloadable safely). |
| `POST /tools/connections/[id]/enabled`, `id` valid, `to` is `enabled` or `disabled` | The connection's `enabled` field is updated; its saved `url`/`token`/`label` are untouched (FR-017 — pausing is not deleting). Redirects to `/tools/connections?changed=<id>&to=<to>`. Takes effect on the assistant's very next `/mcp` request (its tools disappear/reappear from `tools/list` accordingly), same immediacy guarantee as spec 025 FR-006. |

## `POST /tools/connections/[id]/refresh` (manual "refresh now")

| Condition | Behavior |
|---|---|
| `id` valid | Bypasses the TTL and immediately attempts a catalog fetch (research.md §2 timeout still applies), overwriting the Cached Tool Catalog record on success or updating `lastError` on failure. Redirects back to `/tools/connections` where the updated `fetchedAt`/`lastError`/tool list is visible. |
| `id` valid, connection currently `enabled: false` | Refresh still runs (so the owner can verify a fix before re-enabling) — the connection stays disabled; its tools remain absent from `/mcp` regardless of catalog freshness. |

## `POST /tools/connections/[id]/remove` (FR-009)

| Condition | Behavior |
|---|---|
| `id` valid | Behind the same confirm-then-apply pattern as enable/disable (`GET /tools/connections/[id]/confirm?to=removed`) given this is destructive — the connection's saved config (including the token) is permanently deleted, along with its Cached Tool Catalog and Rate Limit State records. Not recoverable; the owner must re-enter the URL and token to reconnect. |
| Applied | None of that connection's tools appear on the assistant's next `/mcp` request. Redirects to `/tools/connections?changed=<id>&to=removed`. |

## Extending the existing per-tool toggle (`POST /tools/[name]/status`, spec 025)

That route currently validates `name` against the static `TOOL_CATALOG` (`lib/mcp-tools/catalog.ts`) only. It's extended to also accept any `name` found in *any* connected External Server Connection's Cached Tool Catalog (data-model.md), applying the same `disabledTools` mechanism (FR-008) — a proxied tool's enable/disable state lives in the same shared record as native tools, not in a separate one. `GET /tools` (spec 024/025) is extended the same way: proxied tools are listed alongside native ones, each showing which connection it came from.

## Unaffected

Every existing `/tools` route and its behavior for native tools (spec 023/024/025) is unchanged. `/mcp`'s request/response contract and auth requirement (spec 002/008/013) are unchanged.
