# Implementation Plan: External MCP Server Proxy

**Branch**: `031-external-mcp-proxy` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/031-external-mcp-proxy/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Let the owner register one or more remote MCP servers (URL + static bearer token) that Harnios connects to as a client, and dynamically re-expose their tools on Harnios's own `/mcp` endpoint alongside its native file/email/telegram tools — so a connected assistant calls one endpoint and reaches both. Because `frontend/app/mcp/route.ts` already rebuilds its `McpServer` and re-runs every tool registration on *every* request (spec 025 research.md §1), the proxy plugs into that same per-request registration pass: each enabled connection's tool catalog is fetched once and cached in S3 with a TTL (avoiding a network round-trip on every unrelated `/mcp` request), each cached tool is registered through the existing `registerGatedTool` path with a best-effort JSON-Schema→Zod conversion, and its callback forwards the call to a short-lived outbound MCP client (`@modelcontextprotocol/sdk`'s `client`/`client/streamableHttp`, already a dependency) under its own timeout, independent of the route's shared `maxDuration: 60`. Configuration (URL, label, token) is owner-only, reachable solely through a new `/tools/connections` management surface — never through any MCP tool available to the assistant.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router), Node.js runtime — same as the rest of `frontend/`. No new language/runtime.

**Primary Dependencies**: No new npm packages. Reuses `@modelcontextprotocol/sdk@1.26.0`'s `./client` and `./client/streamableHttp` entry points (already installed; confirmed present in `node_modules`) for the outbound MCP connection, `@aws-sdk/client-s3` (every `lib/*/store.ts`) for persistence, and `lib/oauth/session`'s `hasActiveOwnerSession()` for gating the new management routes.

**Storage**: Two new reserved-prefix records in the same S3-compatible bucket every other piece of app state lives in: `.mcp-tools/external-servers/{id}.json` (connection config, including the write-only token) and `.mcp-tools/external-catalog/{id}.json` (cached tool list + `fetchedAt`/`lastError`) — see data-model.md. Native tool enable/disable state (`.mcp-tools/status.json`, spec 025) is reused unchanged for proxied tools too, keyed by tool name.

**Testing**: No automated test framework exists in this repo (research.md §8) and none is introduced — verification is the manual `quickstart.md` walkthrough, as with every prior feature.

**Target Platform**: Same as the rest of the app — Next.js Route Handlers/pages, deployable to Vercel or run locally. The outbound proxy call is itself subject to the same serverless constraints as everything else here (research.md §1: no long-lived connections across requests).

**Project Type**: Web application extension inside the existing single Next.js app (`frontend/`) — no new project, no backend/frontend split.

**Performance Goals**: A proxied `tools/call` returns in under 15s in the common case (spec.md SC-002), and fails clearly in under 15s when the external server is unreachable/times out (SC-003) — both enforced by a per-call timeout independent of the route's `maxDuration: 60` (research.md §2). A `/mcp` request that doesn't touch any proxied tool adds at most one cheap S3 read per connected connection (the cached catalog) when its TTL hasn't expired — no external network call on the common path (research.md §3).

**Constraints**: External connection configuration (URL, label, token) is reachable only through owner-session-gated routes — no MCP tool can create/edit/remove it (spec.md FR-002). A saved token is write-only: never returned by any read path after creation (FR-015). A name collision between a proxied tool and any existing tool (native or another connection's) is refused, not silently overridden (FR-013), and made visible to the owner. Existing native-tool behavior is unchanged when no external server is connected (FR-011, SC-005).

**Scale/Scope**: An arbitrary number of external connections may be registered simultaneously (FR-012); each carries its own cached catalog and its own independent rate-limit counter (research.md §6) so one misbehaving connection can't degrade another. New surface: 2 new S3-backed store modules, 1 new tool-registration module (parallel to `engineTools.ts`/`messagingTools.ts`), roughly 8 new owner-facing routes/pages under `/tools/connections`, and small extensions to 3 existing files (`app/mcp/route.ts`, `app/tools/page.tsx`, `app/tools/[name]/status/route.ts`) plus the `lib/storage/directories.ts` prefix exclusion and the 6-language i18n dictionaries for the new UI copy.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no project-specific principles have been ratified) — there are no gates to evaluate against. No violations to track. (Same finding as spec 025's plan.md.)

## Project Structure

### Documentation (this feature)

```text
specs/031-external-mcp-proxy/
├── plan.md                                    # This file (/speckit-plan command output)
├── research.md                                # Phase 0 output (/speckit-plan command)
├── data-model.md                              # Phase 1 output (/speckit-plan command)
├── quickstart.md                              # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── external-mcp-proxy-protocol.md         # Phase 1 output (/speckit-plan command)
│   └── connection-management-routes.md        # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md                        # /speckit-specify output, re-validated by /speckit-clarify
└── tasks.md                                    # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Single Next.js app, no backend/frontend split (spec 006). This feature adds a new `lib/external-mcp/` module (the outbound-facing half: connection storage, the short-lived client, catalog caching, rate limiting), a new `lib/mcp-tools/externalTools.ts` (the inbound-facing half: turns cached catalogs into registered, gated tools — parallel to the existing `engineTools.ts`/`messagingTools.ts`/`treeTools.ts`), a new `/tools/connections` management area, and small, mechanical extensions to the existing `/mcp` route and `/tools` pages:

```text
frontend/
├── lib/
│   ├── external-mcp/
│   │   ├── store.ts              # NEW — .mcp-tools/external-servers/ + .mcp-tools/external-catalog/ CRUD (data-model.md), mirrors lib/oauth/store.ts's getRecord/putRecord/listRecords pattern
│   │   ├── types.ts              # NEW — ExternalServerConnection, CachedToolCatalog, ProxiedTool (data-model.md)
│   │   ├── client.ts             # NEW — short-lived Client + StreamableHTTPClientTransport per operation (research.md §1), listExternalTools()/callExternalTool() with AbortController timeouts (research.md §2)
│   │   ├── catalog.ts            # NEW — TTL-aware getOrRefreshCatalog(connection) (research.md §3)
│   │   ├── rateLimit.ts          # NEW — per-connection fixed-window counter, mirrors lib/messaging/rateLimit.ts (research.md §6)
│   │   └── schemaConvert.ts      # NEW — best-effort JSON Schema → Zod shape converter (research.md §4)
│   ├── mcp-tools/
│   │   ├── externalTools.ts      # NEW — registerExternalTools(server, disabledTools): iterates enabled connections, resolves name collisions against TOOL_CATALOG + already-registered external names (FR-013), registers each via the existing registerGatedTool, callback forwards through lib/external-mcp/client.ts and shapes results/errors (contracts/external-mcp-proxy-protocol.md)
│   │   ├── catalog.ts            # existing (spec 024) — TOOL_CATALOG unchanged; used as the native half of collision detection
│   │   └── toolGate.ts           # existing (spec 023) — unchanged, reused as-is by externalTools.ts
│   ├── storage/
│   │   └── directories.ts        # existing — exclude the two new .mcp-tools/external-* prefixes from listings, alongside the existing OAUTH_PREFIX/TOOLS_PREFIX exclusions
│   └── i18n/dictionaries/
│       ├── types.ts              # existing (spec 015) — extend with a `connections` section: list/new/edit/confirm/remove copy, write-only-token explainer
│       └── {en,it,de,es,fr,ru}.ts # existing (spec 015) — same additions, all 6 languages
└── app/
    ├── mcp/
    │   └── route.ts               # existing (spec 002/023/025) — add registerExternalTools(server, disabledTools) alongside the 5 existing register*Tools calls
    └── tools/
        ├── page.tsx                # existing (spec 024/025) — list proxied tools alongside native ones, tagged with their connection's label
        ├── [name]/
        │   └── status/
        │       └── route.ts        # existing (spec 025) — accept a `name` found in any connected connection's cached catalog, not just TOOL_CATALOG (contracts/connection-management-routes.md)
        └── connections/
            ├── page.tsx             # NEW — list connections + catalog status (contracts/connection-management-routes.md)
            ├── new/
            │   └── page.tsx         # NEW — create form
            ├── create/
            │   └── route.ts         # NEW — POST create (+ immediate refresh, FR-014); own segment, not POST /tools/connections itself, since Next.js doesn't allow a route handler and a page at the same path (mirrors /settings/personal-access-tokens/create)
            └── [id]/
                ├── edit/
                │   └── page.tsx     # NEW — edit form (token field write-only/blank, FR-015)
                ├── route.ts         # NEW — POST edit
                ├── confirm/
                │   └── page.tsx     # NEW — shared confirm screen for enable/disable/remove (`?to=enabled|disabled|removed`)
                ├── enabled/
                │   └── route.ts     # NEW — POST whole-connection pause/resume (FR-017)
                ├── refresh/
                │   └── route.ts     # NEW — POST manual catalog refresh (FR-014)
                └── remove/
                    └── route.ts     # NEW — POST permanent delete (FR-009)
```

**Structure Decision**: The proxy logic is split the same way the rest of this app already separates concerns: an outbound-facing `lib/external-mcp/` module (owns S3 records, the outbound client, caching, rate limiting — nothing here knows about `McpServer`) and an inbound-facing `lib/mcp-tools/externalTools.ts` (owns registration/gating/result-shaping — nothing here knows about S3 or HTTP directly, only calls into `lib/external-mcp/`), mirroring how `lib/messaging/` (S3 + SMTP/Telegram calls) and `lib/mcp-tools/messagingTools.ts` (registration) are already split for spec 017. `/tools/connections` is a new sibling area to the existing `/tools`, following the same confirm-then-apply convention spec 025 established for anything that changes what an assistant can call. `/mcp/route.ts` gains exactly one new line (an additional `register*Tools` call), matching how every prior tool-adding spec (016, 017, 020, 022) has extended that file.

## Complexity Tracking

*No constitution gates apply (see Constitution Check above) — this section is not needed.*
