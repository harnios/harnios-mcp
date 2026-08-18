# Quickstart: Validate the External MCP Server Proxy

Manual validation guide (this project has no automated test suite — research.md §8). Run these scenarios against a running `next dev` instance after implementation.

## Prerequisites

- MinIO/S3-compatible storage stack running and configured (spec 001).
- `frontend`: `npm install && npm run dev`.
- Owner credentials configured and an active owner session (`/oauth/login`).
- A way to send a raw HTTP request with a custom `Authorization` header (e.g. `curl`) to exercise `/mcp` directly.
- **A real external MCP server is not required for Scenarios 1, 4, 5, 6, 8, or 9.** Harnios's own `/mcp` endpoint already is one (spec 002), and already supports personal-access-token auth (spec 013) — connecting a Harnios instance to *itself* as its own "external server" (using a personal access token as the bearer token) is a quick way to exercise connect/refresh/list and collision handling without standing up a second server: because of the one-hop proxy cap (research.md §9), this self-connection's catalog fetch reaches a version of `/mcp` that offers *only* native tools, so every one of its "tools" collides with the real native tool of the same name — a ready-made, deterministic collision case for Scenario 4. **Scenarios 2, 3, and 7 need a second, real external MCP server** exposing at least one tool whose name doesn't collide with a native one, since the self-connection's tools are never actually registered (they all lose the collision) — there's nothing callable to forward through it.

## Scenario 1 — Connect an external server and see its tools (US1, US3, FR-001, FR-003, FR-014)

1. On the running instance, go to `/settings/personal-access-tokens` and create a token named `proxy-test` (spec 013). Copy the secret.
2. Go to `/tools/connections` → "New connection." Fill in `label: Self Test`, `url: http://localhost:3000/mcp`, `token: <secret from step 1>`. Submit.
3. **Expect**: redirected to `/tools/connections`; `Self Test` appears with `enabled: true` and a `fetchedAt` from just now (the immediate refresh on create, FR-014) — no waiting for a background TTL.
4. Call `tools/list` on `/mcp` with a *different* valid credential (e.g. another PAT), e.g.:
   ```sh
   curl -X POST http://localhost:3000/mcp \
     -H "Authorization: Bearer <a-different-valid-token>" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   ```
5. **Expect**: the response includes every native tool (`create_file`, `read_file`, …) exactly once each — no duplicates, no hang, no timeout. The self-connection's own outbound catalog fetch hit the one-hop-capped version of `/mcp` (research.md §9), which itself only offers native tools, so `Self Test`'s cached catalog on `/tools/connections` ends up being that same native-tool list; since every one of those names is already taken by the real native tools, `resolveExternalTools` reports all of them as collisions (visible on `/tools/connections`) rather than registering (or recursing) anything.

## Scenario 2 — Assistant calls a proxied tool (US1, FR-004, SC-002)

1. With a connection in place to a distinct external server exposing at least one non-colliding tool (e.g. a small test MCP server exposing a single `ping` tool), call it through Harnios:
   ```sh
   curl -X POST http://localhost:3000/mcp \
     -H "Authorization: Bearer <valid-token>" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"ping","arguments":{}}}'
   ```
2. **Expect**: a successful result within a few seconds, matching what calling that external server's `/mcp` directly with the same arguments would return (SC-002 — well under 15s in the common case).

## Scenario 3 — External server unreachable or times out (US1, FR-007, SC-003, Edge Cases)

1. Create a connection pointing at an unreachable address, e.g. `url: http://localhost:9/mcp` (nothing listening).
2. Call one of its (cached, from before it became unreachable — or manually add one via `/tools/connections/[id]/refresh` while temporarily reachable, then break it) tools via `tools/call`.
3. **Expect**: `isError: true` with `code: "external_unreachable"` or `"external_timeout"` (contracts/external-mcp-proxy-protocol.md), returned well under the request's overall 60s budget (SC-003) — the request does not hang.

## Scenario 4 — Name collision is refused, not silently overwritten (FR-013)

1. With `Self Test` from Scenario 1 still connected (its tools collide with every native tool name), reload `/tools/connections`.
2. **Expect**: the connection's catalog shows entries like `create_file`, `read_file`, etc. all marked as *not registered* due to a collision, naming the native tool each lost to.
3. Call `create_file` via `/mcp` as normal.
4. **Expect**: behaves exactly as the native `create_file` always has — the colliding proxied version never took over.

## Scenario 5 — Owner manages exposure (US2, FR-008, FR-017, SC-004)

1. On `/tools`, find a tool from a connected external server and disable it (same confirm-then-apply flow as native tools, spec 025).
2. Call it via `tools/list`.
3. **Expect**: absent from the list; every other tool (native and external) unaffected — takes effect on this very next request (SC-004).
4. On `/tools/connections`, disable the *whole* connection (FR-017) via its confirm screen.
5. Call `tools/list` again.
6. **Expect**: none of that connection's tools appear, even ones that were individually still enabled — but the connection's `label`/`url` are still shown on `/tools/connections` (not deleted).
7. Re-enable the connection.
8. **Expect**: its (still-individually-enabled) tools reappear on the next `tools/list`.

## Scenario 6 — Token is write-only (FR-015)

1. On `/tools/connections/[id]/edit` for any connection, observe the `token` field.
2. **Expect**: empty, with copy explaining the current token is not shown and will only change if replaced.
3. Submit the edit form with `token` left blank, having changed only `label`.
4. **Expect**: `label` updates; subsequent proxied calls still succeed (the original token is still in effect).

## Scenario 7 — Rate limiting protects the external server (FR-016, Edge Cases)

1. Call the same proxied tool rapidly enough to exceed the configured per-connection limit.
2. **Expect**: the excess call(s) return `isError: true, code: "rate_limited"` without ever reaching the external server (verify via the external server's own logs/request count, if available), while calls to a *different* connected server's tools in the same window still succeed normally.

## Scenario 8 — Removing a connection (FR-009)

1. On `/tools/connections`, remove a connection (via its confirm screen).
2. Call `tools/list`.
3. **Expect**: none of that connection's tools appear at all — not even as "disabled."
4. Reload `/tools/connections`.
5. **Expect**: the connection itself is gone from the list, not just marked disabled.

## Scenario 9 — No external server connected: zero regression (FR-011, SC-005)

1. Remove every External Server Connection (or start from a fresh bucket).
2. Exercise every native tool exactly as in `specs/002-s3-mcp-server/quickstart.md`, `specs/017-mcp-email-telegram-tools/quickstart.md`, and `specs/022-mcp-tree-search/quickstart.md`.
3. **Expect**: identical behavior to before this feature existed — no added latency, no new fields, no behavior change.
