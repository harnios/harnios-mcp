---

description: "Task list template for feature implementation"
---

# Tasks: External MCP Server Proxy

**Input**: Design documents from `/specs/031-external-mcp-proxy/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/external-mcp-proxy-protocol.md](./contracts/external-mcp-proxy-protocol.md), [contracts/connection-management-routes.md](./contracts/connection-management-routes.md), [quickstart.md](./quickstart.md)

**Tests**: No automated test framework exists in this repo (research.md §8); verification is the manual `quickstart.md` walkthrough, not automated test tasks.

**Organization**: Tasks are grouped by user story per spec.md. The Foundational phase is unusually large because the actual forwarding mechanism — connection/catalog storage, the outbound MCP client, schema conversion, rate limiting, and dynamic tool registration wired into `/mcp` — has to exist as one working whole before *either* P1 story can be demonstrated: User Story 3 ("tools become available") and User Story 1 ("the assistant calls one and gets a real result") both exercise the same registration+forwarding path, so splitting it in half would mean shipping a tool that's visible but always fails, which satisfies neither story's actual acceptance criteria. What's left for User Story 3 is the owner-facing configuration UI (the thing that produces the connection record the engine consumes); what's left for User Story 1 is pure validation that the already-built engine behaves correctly end to end. User Story 2 (managing exposure) is the one phase with genuinely new code on top of the Foundational engine.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Path Conventions

Single Next.js app — all paths are under `frontend/` (see plan.md's Project Structure).

## Phase 1: Setup

**Purpose**: Confirm the one technical prerequisite research.md relies on, before building on it

- [X] T001 Confirm `@modelcontextprotocol/sdk`'s `client` and `client/streamableHttp` subpath exports resolve under this project's TypeScript config: add a throwaway `import { Client } from "@modelcontextprotocol/sdk/client/index.js"; import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";` to a scratch file under `frontend/` and run `cd frontend && npx tsc --noEmit`, then delete the scratch file — no `package.json` change needed, the dependency is already installed (research.md §1)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The full connect-cache-register-forward engine, wired into `/mcp` — MUST work end to end before either P1 user story can be verified

**⚠️ CRITICAL**: No user story can be verified until this phase is complete

- [X] T002 [P] Create `frontend/lib/external-mcp/types.ts`: `ExternalServerConnection`, `CachedToolCatalog`, `ProxiedTool`, `ExternalRateLimitState` per data-model.md
- [X] T003 [P] Extend `frontend/lib/storage/directories.ts` to exclude two new reserved prefixes, `.mcp-tools/external-servers/` and `.mcp-tools/external-catalog/`, from `listDirectory` results, alongside the existing `OAUTH_PREFIX`/`TOOLS_PREFIX` exclusions (data-model.md)
- [X] T004 [P] Create `frontend/lib/external-mcp/schemaConvert.ts`: a best-effort JSON Schema → Zod object-shape converter (object/string/number/boolean/array/enum, required/optional; unrecognized fields fall back to `z.unknown()`) per research.md §4 — no dependency on any other new file
- [X] T005 Create `frontend/lib/external-mcp/store.ts`: reserved-prefix CRUD over `.mcp-tools/external-servers/{id}.json` (connections, including `createExternalServerConnection`, `getExternalServerConnection`, `listExternalServerConnections`, `updateExternalServerConnection` — token optional on update per FR-015, `setConnectionEnabled`, `deleteExternalServerConnection` which also deletes its catalog and rate-limit records) and `.mcp-tools/external-catalog/{id}.json` (`getCachedCatalog`, `putCachedCatalog`), mirroring `lib/oauth/store.ts`'s `getRecord`/`putRecord`/`listRecords` pattern (depends on T002)
- [X] T006 [P] Create `frontend/lib/external-mcp/rateLimit.ts`: per-connection fixed-window counter over `.mcp-tools/external-servers/{id}-rate-limit.json`, mirroring `lib/messaging/rateLimit.ts`'s `checkAndRecordSend` shape (research.md §6, FR-016) (depends on T002, T005)
- [X] T007 Create `frontend/lib/external-mcp/client.ts`: `listExternalTools(connection)` and `callExternalTool(connection, toolName, args)`, each opening a short-lived `Client` + `StreamableHTTPClientTransport` (T001) with `Authorization: Bearer {token}` and its own `AbortController` timeout (~8s for list, ~15s for call, research.md §2), translating transport failures into the `external_unreachable`/`external_timeout`/`external_unauthorized`/`external_invalid_response` codes (contracts/external-mcp-proxy-protocol.md) (depends on T001, T002)
- [X] T008 Create `frontend/lib/external-mcp/catalog.ts`: `getOrRefreshCatalog(connection)` — serves the cached catalog (T005) as-is if `now - fetchedAt < TTL`; otherwise attempts one bounded-timeout refresh via `listExternalTools` (T007), persists the result (success: new `tools`/`fetchedAt`, `lastError: null`; failure: existing `tools`/`fetchedAt` kept, `lastError` set — or `tools: []` if there's no prior catalog) per research.md §3 (depends on T005, T007)
- [X] T009 Create `frontend/lib/mcp-tools/externalTools.ts`: `registerExternalTools(server, disabledTools)` — lists enabled connections (T005), calls `getOrRefreshCatalog` (T008) for each, converts each `ProxiedTool`'s `inputSchema`/`outputSchema` via `schemaConvert` (T004), skips (and records, for owner visibility) any tool whose `name` collides with `TOOL_CATALOG` (`lib/mcp-tools/catalog.ts`) or an already-registered external tool this pass (FR-013), and registers the rest through the existing `registerGatedTool` (`lib/mcp-tools/toolGate.ts`) with a callback that checks the rate limit (T006), calls `callExternalTool` (T007), and returns the external result unchanged on success or a `{ code, message }` `isError` result on failure (research.md §5, contracts/external-mcp-proxy-protocol.md) (depends on T004, T006, T007, T008)
- [X] T010 In `frontend/app/mcp/route.ts`, add `await registerExternalTools(server, disabledTools);` alongside the 5 existing `register*Tools` calls (depends on T009)
- [X] T011 Run `cd frontend && npx tsc --noEmit` to confirm T002-T010 compile cleanly (depends on T010)
- [X] T012 [P] Extend the `Dictionary` interface in `frontend/lib/i18n/dictionaries/types.ts` with a new `connections` section covering: connections list page, new/edit connection forms (including the write-only-token explainer, FR-015), the enable/disable/remove confirm screen copy (mirrors spec 025's `tools` confirm/warning copy), and the proxy error messages (`external_unreachable`/`external_timeout`/`external_unauthorized`/`external_invalid_response`/`rate_limited`, contracts/external-mcp-proxy-protocol.md) shown on the connections list when a catalog's `lastError` is set
- [X] T013 [P] Add the new `connections` strings to `frontend/lib/i18n/dictionaries/en.ts` (depends on T012)
- [X] T014 [P] Add the new `connections` strings to `frontend/lib/i18n/dictionaries/it.ts` (depends on T012)
- [X] T015 [P] Add the new `connections` strings to `frontend/lib/i18n/dictionaries/de.ts` (depends on T012)
- [X] T016 [P] Add the new `connections` strings to `frontend/lib/i18n/dictionaries/es.ts` (depends on T012)
- [X] T017 [P] Add the new `connections` strings to `frontend/lib/i18n/dictionaries/fr.ts` (depends on T012)
- [X] T018 [P] Add the new `connections` strings to `frontend/lib/i18n/dictionaries/ru.ts` (depends on T012)

**Checkpoint**: A connection record placed directly in storage would already be picked up, cached, registered, and callable through `/mcp` — the engine works. Only the owner-facing way to create/manage that record is still missing.

---

## Phase 3: User Story 3 - Owner connects and configures an external server (Priority: P1)

**Goal**: The owner has a safe, dedicated place to register a new external MCP server (URL, label, token) and see its tools become available — with no MCP tool able to do any of this on the assistant's behalf.

**Independent Test**: [quickstart.md](./quickstart.md) Scenario 1 — create a connection, see it and its (non-colliding) tools appear without waiting for a background refresh.

### Implementation for User Story 3

- [X] T019 [P] [US3] Create `frontend/app/tools/connections/page.tsx`: owner-gated (same `hasActiveOwnerSession()` + redirect pattern as `/tools`), lists every connection (`label`, `url`, `enabled`, cached catalog's `fetchedAt`/tool count/`lastError`, and any collision-skipped tool names per T009), each row linking to edit/confirm actions from US2 (depends on T005, T008, T012-T018)
- [X] T020 [P] [US3] Create `frontend/app/tools/connections/new/page.tsx`: create form (`label`, `url`, `token`, all required; client- and server-side validation that `url` is an absolute `http(s)://` URL) (depends on T012-T018)
- [X] T021 [US3] Create `frontend/app/tools/connections/create/route.ts`: owner-gated `POST` — validates input, creates the connection via T005, immediately attempts a catalog refresh via T008 (FR-014 — not blocked by that refresh failing), redirects to `/tools/connections` (contracts/connection-management-routes.md; `create` is its own path segment since Next.js doesn't allow a route handler and a page at the same path, discovered while running the dev server) (depends on T005, T008)
- [X] T022 [P] [US3] Create `frontend/app/tools/connections/[id]/edit/page.tsx`: edit form pre-filled with `label`/`url`; `token` field always rendered empty with write-only explainer copy (FR-015, T012-T018) (depends on T005, T012-T018)
- [X] T023 [US3] Create `frontend/app/tools/connections/[id]/route.ts`: owner-gated `POST` — `id` must match an existing connection; blank `token` leaves the stored value untouched, a provided one replaces it; updates via T005, immediately attempts a catalog refresh via T008, redirects to `/tools/connections` (depends on T005, T008)
- [X] T024 [US3] Run `cd frontend && npx tsc --noEmit` to confirm T019-T023 compile cleanly (depends on T019, T020, T021, T022, T023)
- [X] T025 [US3] Follow [quickstart.md](./quickstart.md) Scenario 1 against the local dev server: create a connection, confirm its tools appear on the very next `tools/list` without waiting (depends on T024)

**Checkpoint**: An owner can fully configure a connection through the UI; its tools are live. User Story 3 delivers independent value on top of the Foundational engine.

---

## Phase 4: User Story 1 - Assistant calls a tool from a connected external system (Priority: P1) 🎯 MVP

**Goal**: An assistant connected to Harnios calls a tool sourced from a connected external MCP server and gets back the same result it would get calling that server directly — the entire value proposition.

**Independent Test**: [quickstart.md](./quickstart.md) Scenario 2 (successful forwarded call) and Scenario 3 (clean, fast failure when the external server is unreachable/times out).

**Note**: No new code — the call path (T007, T009) and its error shaping were necessarily built in the Foundational phase, since User Story 3's "tools become available" already requires a fully working `tools/call` path for the tool to be genuinely "available," not just listed (FR-003's "indistinguishably in how they're called"). This phase validates the property end to end.

- [ ] T026 [US1] Follow [quickstart.md](./quickstart.md) Scenario 2: with a connection to a distinct external server exposing at least one non-colliding tool, call it through `/mcp` and confirm the result matches calling that server directly, returned well under 15s (SC-002) (depends on T025) — **not run**: no second, independent MCP server was available in this environment to connect to (the self-connection trick used for T025/T028 deliberately can't exercise this — its tools all collide with native ones by design, per research.md §9's one-hop cap); the forwarding path itself (`lib/external-mcp/client.ts`'s `callExternalTool`) is exercised indirectly by every `tools/call` a real assistant would make, and is the same code path validated for the failure case in T027
- [X] T027 [US1] Follow [quickstart.md](./quickstart.md) Scenario 3: point a connection at an unreachable address, call one of its tools, confirm a clear `external_unreachable`/`external_timeout` result comes back well under the request's overall 60s budget rather than the request hanging (SC-003) (depends on T025)
- [X] T028 [US1] Follow [quickstart.md](./quickstart.md) Scenario 4: with a connection whose tools collide with native tool names (e.g. a self-connection, per the quickstart's suggested trick), confirm the colliding tools are reported as skipped (not silently overriding) on `/tools/connections` (T019), and that calling the native tool by that name still behaves exactly as it always has (FR-013) (depends on T025)

**Checkpoint**: Both P1 stories verified — this is the MVP (Foundational + US3 + US1)

---

## Phase 5: User Story 2 - Owner manages which external tools are exposed (Priority: P2)

**Goal**: The owner has the same control over externally-sourced tools that they already have over native ones — per-tool enable/disable, whole-connection pause/resume without losing configuration, and permanent removal.

**Independent Test**: [quickstart.md](./quickstart.md) Scenario 5 (per-tool and whole-connection enable/disable), Scenario 7 (rate limiting), Scenario 8 (removal).

### Implementation for User Story 2

- [X] T029 [US2] Extend `frontend/app/tools/[name]/status/route.ts` (spec 025) to also accept a `name` found in any connected connection's cached catalog (T008), not only `TOOL_CATALOG` — same `disabledTools` mechanism, no new storage shape (FR-008, contracts/connection-management-routes.md) (depends on T008)
- [X] T030 [US2] Extend `frontend/app/tools/page.tsx` (spec 024/025) to list proxied tools alongside native ones, each tagged with its source connection's `label` (depends on T008, T029)
- [X] T031 [P] [US2] Create `frontend/app/tools/connections/[id]/confirm/page.tsx`: shared confirm screen for `?to=enabled|disabled|removed`, naming the connection and the pending change, with the same "already-connected sessions may not see this immediately" warning spec 025 uses for native tools, no side effect on `GET` (mirrors `frontend/app/tools/[name]/confirm/page.tsx`) (depends on T005, T012-T018)
- [X] T032 [P] [US2] Create `frontend/app/tools/connections/[id]/enabled/route.ts`: owner-gated `POST` toggling a connection's `enabled` field via T005 (FR-017 — config untouched), redirects to `/tools/connections?changed=<id>&to=<to>` (depends on T005)
- [X] T033 [P] [US2] Create `frontend/app/tools/connections/[id]/refresh/route.ts`: owner-gated `POST` bypassing the TTL to force an immediate `getOrRefreshCatalog` (T008) attempt, regardless of the connection's `enabled` state, redirecting back to `/tools/connections` (depends on T008)
- [X] T034 [P] [US2] Create `frontend/app/tools/connections/[id]/remove/route.ts`: owner-gated `POST` permanently deleting the connection, its cached catalog, and its rate-limit record via T005 (FR-009), redirects to `/tools/connections?changed=<id>&to=removed` (depends on T005)
- [X] T035 [US2] Run `cd frontend && npx tsc --noEmit` to confirm T029-T034 compile cleanly (depends on T029, T030, T031, T032, T033, T034)
- [X] T036 [US2] Follow [quickstart.md](./quickstart.md) Scenario 5: disable one external tool (per-tool), confirm only it disappears; disable the whole connection, confirm all its tools disappear regardless of their individual state and its config survives; re-enable and confirm they reappear (depends on T035)
- [X] T037 [US2] Follow [quickstart.md](./quickstart.md) Scenario 6: confirm the edit form's token field is always empty and that submitting it blank leaves the working token unchanged (FR-015) (depends on T035)
- [ ] T038 [US2] Follow [quickstart.md](./quickstart.md) Scenario 7: call the same proxied tool fast enough to hit the per-connection rate limit, confirm the excess call is refused locally (`rate_limited`) without reaching the external server, and that a different connection's tools are unaffected (FR-016) (depends on T035) — **not run**: same reason as T026 — no second, independent MCP server exposing a genuinely callable (non-colliding) tool was available in this environment to call repeatedly; `lib/external-mcp/rateLimit.ts`'s counter logic directly mirrors `lib/messaging/rateLimit.ts`'s already-shipped, working fixed-window pattern (same read-check-then-write shape), which is the strongest available substitute for an end-to-end run here
- [X] T039 [US2] Follow [quickstart.md](./quickstart.md) Scenario 8: remove a connection, confirm its tools disappear entirely (not merely disabled) and it's gone from `/tools/connections` (FR-009) (depends on T035)

**Checkpoint**: All three user stories independently verified — feature complete

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Confirm the feature is additive-only

- [X] T040 Follow [quickstart.md](./quickstart.md) Scenario 9: with no External Server Connections configured, re-run `specs/002-s3-mcp-server/quickstart.md`, `specs/017-mcp-email-telegram-tools/quickstart.md`, and `specs/022-mcp-tree-search/quickstart.md` to confirm zero behavior change (FR-011, SC-005) — verified `tools/list` returns exactly the 17 native tools and `create_file`/`delete_file` behave identically to pre-feature baseline against the local dev server with zero connections configured
- [X] T041 [P] Update `README.md` with a short "Connecting external MCP servers" section describing `/tools/connections` and linking to [quickstart.md](./quickstart.md), following the style of the existing "S3 Storage MCP Server" section

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001) — BLOCKS all user stories
- **User Story 3 (Phase 3)**: Depends on Foundational completing in full (T002-T018)
- **User Story 1 (Phase 4)**: Depends on User Story 3 (T025) — needs a real, created connection to call through; no new code of its own
- **User Story 2 (Phase 5)**: Depends on User Story 3 (T019, T025) for the connections list/store to extend — independently testable from User Story 1 (doesn't need US1's validation to have run, only the same underlying engine)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### Within Phase 2 (Foundational)

- T002, T003, T004 have no dependencies on each other — [P]
- T005 depends on T002
- T006 depends on T002, T005
- T007 depends on T001, T002
- T008 depends on T005, T007
- T009 depends on T004, T006, T007, T008
- T010 depends on T009
- T011 (typecheck) depends on T010
- T012 has no code dependency on T002-T011 — can run in parallel with the engine work
- T013-T018 (six languages) depend on T012 but are independent of each other — [P]

### Within Phase 3 (User Story 3)

- T019, T020 depend on Foundational only — [P]
- T021 depends on T005, T008
- T022 depends on Foundational only — [P] with T019, T020, T021
- T023 depends on T005, T008
- T024 (typecheck) depends on T019-T023
- T025 (manual verification) depends on T024

### Within Phase 5 (User Story 2)

- T029 depends on T008
- T030 depends on T008, T029
- T031, T032, T033, T034 depend on Foundational/T005/T008 only, not on each other or on T029/T030 — [P]
- T035 (typecheck) depends on T029-T034
- T036-T039 (manual verification) depend on T035, independent of each other

### Parallel Opportunities

- T002, T003, T004 (Foundational) in parallel
- T013-T018 (Foundational, six languages) in parallel with each other and with T002-T011
- T019, T020, T022 (User Story 3) in parallel
- T031, T032, T033, T034 (User Story 2) in parallel
- T026, T027, T028 (User Story 1 validation) in parallel with each other
- T036, T037, T038, T039 (User Story 2 validation) in parallel with each other

---

## Parallel Example: Foundational Phase

```bash
# Independent building blocks, once T001 (Setup) is done:
Task: "Create frontend/lib/external-mcp/types.ts"
Task: "Extend frontend/lib/storage/directories.ts's prefix exclusions"
Task: "Create frontend/lib/external-mcp/schemaConvert.ts"

# After T012 (Dictionary type), translate into all six languages together:
Task: "Add new connections strings to frontend/lib/i18n/dictionaries/en.ts"
Task: "Add new connections strings to frontend/lib/i18n/dictionaries/it.ts"
Task: "Add new connections strings to frontend/lib/i18n/dictionaries/de.ts"
Task: "Add new connections strings to frontend/lib/i18n/dictionaries/es.ts"
Task: "Add new connections strings to frontend/lib/i18n/dictionaries/fr.ts"
Task: "Add new connections strings to frontend/lib/i18n/dictionaries/ru.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Create frontend/app/tools/connections/[id]/confirm/page.tsx"
Task: "Create frontend/app/tools/connections/[id]/enabled/route.ts"
Task: "Create frontend/app/tools/connections/[id]/refresh/route.ts"
Task: "Create frontend/app/tools/connections/[id]/remove/route.ts"
```

---

## Implementation Strategy

### MVP First (Foundational + User Story 3 + User Story 1)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002-T018) — the whole connect-cache-register-forward engine
3. Complete Phase 3: User Story 3 (T019-T025) — the owner can create a connection
4. Complete Phase 4: User Story 1 (T026-T028) — validate the assistant can actually call through it
5. **STOP and VALIDATE**: an owner can connect an external MCP server and an assistant can successfully call one of its tools
6. This already delivers FR-001, FR-003, FR-004, FR-005, FR-006, FR-007, FR-011, FR-012, FR-013, FR-014 in full

### Incremental Delivery

1. Setup + Foundational → engine ready, nothing owner-facing yet
2. User Story 3 → owner can configure connections (still P1)
3. User Story 1 → validated end-to-end MVP
4. User Story 2 → exposure management (per-tool, whole-connection, removal, rate limiting) on top of the same engine
5. Polish → confirm zero regression, document the feature

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (the engine is one coherent unit — hard to split further without artificial seams)
2. Once Foundational is done:
   - Developer A: User Story 3 (connection CRUD UI) → then User Story 1 (validation)
   - Developer B: User Story 2 (exposure management UI) — only needs Foundational + T019/T025 (the connections list to extend), not User Story 1's validation
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- As with spec 025, User Story 1's low task count reflects its actual shape: a property that already holds once Foundational and User Story 3 are done, validated rather than separately built
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
