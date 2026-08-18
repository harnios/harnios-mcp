# Research: External MCP Server Proxy

**Input**: [spec.md](./spec.md)

## §1. Outbound transport and client lifecycle

**Decision**: Use `@modelcontextprotocol/sdk`'s existing `client` and `client/streamableHttp` entry points (`Client` + `StreamableHTTPClientTransport`) — already a project dependency (`@modelcontextprotocol/sdk@1.26.0`, confirmed to ship `./client` and `./client/streamableHttp` exports; no new package needed). A fresh `Client`/`StreamableHTTPClientTransport` pair is created per outbound operation (one catalog refresh, or one tool call) and torn down immediately after — never held open across `/mcp` requests.

**Rationale**: `frontend/app/mcp/route.ts` is already fully stateless — `createMcpHandler` reconstructs the `McpServer` and re-runs every `register*Tools` call on *every* `/mcp` request (spec 025 research.md §1), and `getDisabledTools()` reads fresh from S3 every time rather than caching in memory. A persistent outbound connection can't outlive a single serverless invocation reliably anyway (Fluid Compute instance reuse is an optimization, not a guarantee), so a short-lived connection per operation is the only approach consistent with how this app already runs, and it removes an entire class of "stale session" bugs.

**Alternatives considered**: Keeping a long-lived `Client` per external connection in module scope — rejected: works only by accident when the same function instance happens to be reused, silently breaks (hangs or errors on a dead session) the moment it isn't, and the SDK's `StreamableHTTPClientTransport` already re-negotiates a session on `connect()` cheaply enough that pooling isn't worth the failure surface.

## §2. Per-call timeout, independent of the route's `maxDuration`

**Decision**: Every outbound call (catalog fetch and tool call alike) is wrapped in its own `AbortController`-driven timeout, well under the route's `maxDuration: 60` — a tool call timeout around 15s (matches spec SC-002/SC-003) and a shorter one (~8s) for catalog refreshes, since those must not block an unrelated tool call in the same request.

**Rationale**: `maxDuration: 60` is shared by the *whole* `/mcp` request (every native tool call plus every proxied one). Without an independent, shorter timeout, one slow/unreachable external server could consume the entire budget and take down calls to unrelated native tools in the same request.

**Alternatives considered**: Relying on the SDK transport's own default fetch timeout — rejected: not guaranteed to exist or to be shorter than the route budget, and not owner-configurable per connection.

## §3. Tool catalog caching (avoiding a network call on every `/mcp` request)

**Decision**: Each connected external server's tool catalog (name, description, input/output JSON Schema) is cached in S3 under a new reserved prefix, alongside a `fetchedAt` timestamp. On each `/mcp` request, the cache is used as-is if younger than a fixed TTL (an implementation constant, per spec.md Assumptions — not user-configurable in v1); if stale, one bounded-timeout refresh attempt is made, falling back to the existing stale cache (or an empty list, if there is none yet) on failure, matching spec.md's edge case for a temporarily-unreachable server during refresh.

**Rationale**: Registering an external server's tools on `tools/list` requires knowing their names/schemas *before* any tool is called — and `/mcp` request handling already re-runs tool registration from scratch every time (§1). Fetching the catalog over the network on every single request (even ones that never call a proxied tool) would add external latency to every interaction with Harnios. A bounded cache, refreshed opportunistically, keeps that cost off the common path while bounding staleness. This mirrors the existing `getDisabledTools()`-style "read fresh, but from S3, not from the network" pattern used for native tool state — the only difference is that the S3 record itself now has a TTL, since (unlike native tool state) the source of truth here is a third party outside this app's control.

**Alternatives considered**: No caching, always fetch live — rejected in the spec's own constraints (adds external round-trip latency to every request, including ones unrelated to the external server). A background cron-refreshed cache — rejected: this app has no scheduler/worker outside of request handling (research precedent: spec 019 live-file-sync and spec 025 both keep everything request-triggered); introducing one would be a much larger architectural change for a bounded-staleness problem a simple TTL already solves.

## §4. Registering dynamically-discovered tools through the existing native-tool machinery

**Decision**: Proxied tools are registered through the *same* `McpServer.registerTool` path (via the existing `registerGatedTool` wrapper in `toolGate.ts`) as every native tool — not through a separate, parallel mechanism. Since `registerTool`'s `inputSchema`/`outputSchema` only accept Zod (v3 or v4) schemas (confirmed by reading `server/zod-compat.ts`'s `AnySchema = z3.ZodTypeAny | z4.$ZodType` — there is no raw-JSON-Schema variant), each proxied tool's JSON Schema (as declared by the external server) is converted at registration time into a best-effort Zod object schema: known primitive/array/enum/object shapes map directly, anything the converter doesn't confidently recognize falls back to a permissive `z.unknown()` for that field rather than rejecting the whole tool.

**Rationale**: `McpServer`'s own doc comment states plainly: "for advanced usage (like sending notifications or setting custom request handlers), use the underlying Server instance" — and `McpServer.registerTool` already installs the *only* `ListTools`/`CallTool` handlers on that underlying `Server` the first time any tool is registered (`_toolHandlersInitialized`). Installing a second, competing pair of handlers directly on `mcpServer.server` to pass through raw JSON Schema unconverted would silently override or fight with the handlers `registerTool` already installs for every native tool — meaning native tools would have to be reimplemented on the same low-level path too, a far larger blast radius. Local schema validation being best-effort (rather than a byte-for-byte JSON-Schema-to-Zod translation) is an acceptable tradeoff, not a correctness gap: the external server performs its own authoritative validation when the call is actually forwarded (§5), so Harnios's local schema only needs to be good enough to give the calling assistant a reasonable tool description and shape — not to be the source of truth.

**Alternatives considered**: A full JSON-Schema-to-Zod conversion library — rejected for v1 as unnecessary weight for the common case (flat object schemas with primitive/array/enum fields), which the lightweight converter already covers; can be swapped in later without changing the registration path if a connected server's schema turns out to need it.

## §5. Forwarding a call and shaping its result/error

**Decision**: On a proxied tool's callback, Harnios: (1) checks the per-connection rate limit (§6), (2) opens a short-lived client to the external server (§1) under the call's timeout (§2), (3) issues `tools/call` with the assistant's arguments verbatim, and (4) returns the external server's `CallToolResult` to the assistant essentially unchanged on success. Transport-level failures that never reach a real tool response (unreachable host, timeout, non-2xx/auth rejection) are caught and turned into a Harnios-shaped `isError` result carrying a distinguishing `code` (e.g. `external_unreachable`, `external_timeout`, `external_unauthorized`, `rate_limited`) — deliberately mirroring the existing `{ code, message }` error shape already used by every native tool (`lib/mcp-tools/result.ts`), for a consistent experience across native and proxied tools.

**Rationale**: Directly satisfies spec.md FR-004/FR-007 and the Assumptions note that proxied results are passed through, not reinterpreted — Harnios should not try to be smarter than the external server about its own business errors (e.g. "no orders found" is the external server's normal tool result, not a Harnios-level failure).

**Alternatives considered**: Passing every failure through unchanged, including transport errors — rejected: an assistant seeing a raw fetch/timeout exception can't distinguish "the external system said no" from "Harnios couldn't reach the external system at all," which spec.md's edge cases and FR-007 explicitly call out as needing to be distinguishable.

## §6. Rate limiting proxied calls, per connection

**Decision**: Reuse the fixed-window counter pattern already implemented for `send_email`/`send_telegram_message` (`lib/messaging/rateLimit.ts`) — one S3-backed `{ windowStart, count }` record per external connection, checked and incremented before every proxied call, non-atomic read-check-then-write (the same accepted best-effort tradeoff already made there and in `lib/oauth/rateLimit.ts`).

**Rationale**: Directly satisfies FR-016, and reuses a pattern this codebase already has in two places rather than inventing a third rate-limiting mechanism.

**Alternatives considered**: A single rate limit shared across all external connections — rejected: a slow/chatty external server would then throttle calls to every *other* connected server too, which spec.md's edge case explicitly rules out ("does not affect calls to other tools or other external servers").

## §7. Storing the bearer token (write-only per Clarifications)

**Decision**: The token is stored as a plain field inside the connection's JSON record, under a new reserved S3 prefix excluded from the file explorer and MCP directory/file tools (same exclusion mechanism `lib/storage/directories.ts` already applies to `OAUTH_PREFIX`/`TOOLS_PREFIX`). No route or MCP tool ever reads that field back out to any caller — the connection-list read path (used by the management UI and by tool registration) always returns a `hasToken: boolean` in its place, never the value; the field is only ever written (create/replace), matching FR-015's write-only requirement.

**Rationale**: Harnios must reproduce the raw token on every outbound call (unlike an OAuth *client* secret, which Harnios only ever *verifies* against a hash — see `clientSecretHash` in `lib/oauth/types.ts` — because there Harnios is the party being authenticated *to*, not the party authenticating *out*). Hashing is therefore not applicable here; the closest existing precedent for a secret Harnios must reproduce is the personal-access-token flow, which keeps the raw value out of any listable record by using it as a lookup key rather than a field — not directly reusable here since the token must be read back out (to attach as `Authorization: Bearer …`), not just compared. Storing it as a plain field in a reserved, non-listable prefix is consistent with this app's existing trust boundary: bucket access is already the trust boundary for every other piece of app state (S3 credentials themselves are plaintext environment variables), and FR-010/FR-015 are satisfied by keeping the field out of every *listable/readable* surface, not by adding a new encryption layer with no precedent elsewhere in the app.

**Alternatives considered**: Application-level encryption at rest (e.g. AES with a key from an env var) — rejected for v1: no other secret in this app is encrypted this way, it would introduce a new key-management concern (where does *that* key live?) without closing any gap the reserved-prefix exclusion doesn't already close, and it can be layered in later without changing the record shape (the field would still just be "the token," now with an extra encode/decode step).

## §8. Testing approach

**Decision**: No automated test framework exists in this repo (consistent with every prior spec, e.g. spec 025 research.md §8) and none is introduced here. Verification is the manual `quickstart.md` walkthrough, as with every other feature in this codebase.

**Rationale**: Matches established project convention; introducing a first-ever test framework is out of scope for this feature.

## §9. Capping proxy chains at one hop (self-reference / cycles)

**Decision**: Every outbound proxy request (`lib/external-mcp/client.ts`) carries a fixed header, `x-harnios-external-proxy-hop`. `app/mcp/route.ts` checks for it on the *inbound* request and, if present, registers only native tools for that request — `registerExternalTools` is skipped entirely, regardless of how many connections are configured or how stale their catalogs are.

**Rationale**: Discovered by actually running the feature end to end (per quickstart.md Scenario 1's suggested self-connection trick) rather than by static reasoning: a connection whose `url` points back at this same deployment — directly (a self-connection, exactly as the quickstart originally suggested for easy testing) or indirectly through a cycle across multiple connected Harnios-like instances — recurses without bound. Registering external tools for an inbound `/mcp` request attempts a catalog refresh for any stale connection (research.md §3); that refresh is itself a fresh outbound `POST /mcp`, which arrives back at this same route as a brand-new *inbound* request, which again tries to register external tools, again attempts a refresh, and so on — observed directly as dozens of concurrent 8-second-timeout `POST /mcp` log lines during manual verification, not a hypothetical. Capping every proxy chain at exactly one hop closes this off unconditionally, independent of how many connections exist or how they're configured, and is a defensible product boundary on its own merits (a tool reached through two layers of proxying is a design smell worth surfacing, not silently supporting).

**Consequence for quickstart.md**: the self-connection testing trick (Scenario 1) now demonstrates *this* behavior rather than a working self-referential catalog — with the hop cap in place, a self-connection's catalog fetch reaches a version of `/mcp` that only offers native tools, so every native tool name is returned once, cleanly, with no collisions and no recursion; quickstart.md's Scenario 4 (collision handling) needs a genuinely distinct second external server to observe a real collision, not the self-connection shortcut originally proposed.

**Alternatives considered**: Detecting "points back at itself" by comparing the connection's `url` against the deployment's own origin — rejected: unreliable (different hostnames/ports/proxies can alias the same deployment) and doesn't address multi-instance cycles at all. An `AsyncLocalStorage`-based in-process call-depth guard — rejected: the recursive call arrives as a genuinely new inbound HTTP request, not a nested function call in the same async context, so it wouldn't observe any state set during the outbound call that produced it.
