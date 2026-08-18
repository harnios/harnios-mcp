# Feature Specification: External MCP Server Proxy

**Feature Branch**: `[031-external-mcp-proxy]`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "Aggiungere supporto per collegare Harnios, in qualità di client, a server MCP esterni remoti (HTTP, autenticati con bearer token statico) e fare da proxy: i tool esposti da quei server esterni vengono registrati dinamicamente sul server MCP di Harnios (accanto ai tool esistenti su file/email/telegram) così che un assistente connesso a Harnios possa chiamarli come se fossero tool nativi, senza dover configurare un secondo connettore MCP separato.

Contesto raccolto in conversazione (da includere come vincoli/decisioni, non da ridiscutere):
- Il server esterno di riferimento è raggiungibile via HTTP remoto (Streamable HTTP/SSE), non stdio locale, e usa un bearer token statico per l'autenticazione (niente OAuth con consenso utente/refresh token).
- La configurazione della connessione esterna (URL del server, nome/etichetta, token) deve poter essere impostata solo dall'owner (via UI o bootstrap), mai tramite i tool di scrittura file (`create_file`/`update_file`) esposti all'assistente, per evitare che un file possa ridirigere il proxy verso un host arbitrario (rischio SSRF-like).
- Il server MCP di Harnios (`frontend/app/mcp/route.ts`) è stateless: ogni richiesta `/mcp` ricrea l'McpServer e rilegge lo stato da S3 (vedi `getDisabledTools()` in `frontend/lib/mcp-tools/store.ts`, che oggi legge sempre fresco, senza cache). Per evitare di dover interrogare ogni server esterno ad ogni singola richiesta `/mcp` solo per sapere quali tool esporre, il catalogo dei tool del server esterno va cacheato in S3 con una scadenza (TTL), non riletto ad ogni richiesta.
- Il budget di `maxDuration: 60` è condiviso da tutta la richiesta `/mcp`; le chiamate proxy verso il server esterno devono avere un proprio timeout più stretto (es. 10-15s) per non far fallire l'intera richiesta se il server esterno è lento o irraggiungibile.
- I tool proxy avranno input/output schema dinamici (costruiti a runtime dal JSON Schema dichiarato dal server esterno), non Zod scritto a mano come i tool nativi attuali in `frontend/lib/mcp-tools/`.
- La pagina di gestione tool esistente (spec 023-mcp-tool-toggle, spec 025-manage-tools-page), che oggi presume un elenco fisso di 15 tool nativi, deve poter mostrare/abilitare/disabilitare anche i tool provenienti da server esterni collegati, che possono variare nel tempo.
- User story guida: l'utente chiede all'assistente, ad esempio, "ultimi ordini creati" — l'assistente chiama un tool esposto tramite il proxy, Harnios inoltra la chiamata al server MCP ordini esterno usando il token configurato, e restituisce il risultato all'assistente."

## Clarifications

### Session 2026-08-18

- Q: Should the owner be able to view the stored bearer token again after saving, or is it write-only (can only be replaced, never displayed)? → A: Write-only — once saved, the token is never displayed again, only replaceable.
- Q: Should Harnios apply its own rate limit on proxied calls to a given external server, independent of whatever limit the external server enforces itself? → A: Yes — Harnios applies its own independent rate limit per connected external server.
- Q: Should the owner be able to temporarily disable an entire external connection (pausing all its tools at once) separately from permanently removing it, or is "remove" the only way to stop it, with per-tool enable/disable being the only finer-grained control? → A: Yes — the owner can disable/re-enable a whole connection without deleting its saved configuration, in addition to per-tool control.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Assistant calls a tool from a connected external system (Priority: P1)

An owner has a separate business system (e.g. an order-management platform) that already exposes its own MCP server. The owner connects it to Harnios once. From then on, when the owner (or anyone using their AI assistant through Harnios) asks a question like "what are the latest orders created", the assistant calls a tool that Harnios forwards to that external system and returns the answer — without the assistant needing a second, separate connection to the external system.

**Why this priority**: This is the entire value proposition of the feature — one connector for the assistant, reaching multiple backend systems. Without this, there is nothing to ship.

**Independent Test**: Connect one external MCP server (URL + bearer token), connect an assistant to Harnios, confirm the external server's tool(s) appear in the assistant's tool list, call one, and confirm the result matches what calling the external server directly would return.

**Acceptance Scenarios**:

1. **Given** the owner has connected an external MCP server with a valid URL and token, **When** an assistant connected to Harnios lists available tools, **Then** the external server's tools appear alongside Harnios's own native tools.
2. **Given** an external tool is available through Harnios, **When** the assistant calls it with valid arguments, **Then** Harnios forwards the call to the external server and returns its result to the assistant unchanged.
3. **Given** the external server is unreachable, times out, or rejects the stored token, **When** the assistant calls the proxied tool, **Then** the assistant receives a clear failure result rather than the request hanging or the whole `/mcp` request crashing.

---

### User Story 2 - Owner manages which external tools are exposed (Priority: P2)

An owner wants the same control over externally-sourced tools that they already have over Harnios's native tools: see what's available, and turn individual tools on or off, without removing the whole connection.

**Why this priority**: Mirrors the existing tool-management experience (native tool enable/disable) and is necessary for an owner to trust exposing a third-party system to an assistant — they need to be able to scope down what it can call.

**Independent Test**: With an external server connected exposing multiple tools, open the existing tool management page, disable one external tool, and confirm only that tool disappears from the assistant's next tool list while the rest (native and external) are unaffected.

**Acceptance Scenarios**:

1. **Given** an external server is connected and exposes several tools, **When** the owner opens the tool management page, **Then** each of those tools is listed individually, alongside native tools, with its own enable/disable control.
2. **Given** the owner disables one external tool, **When** the assistant next requests the tool list, **Then** that tool is absent while every other tool (native or external) is still present and callable.
3. **Given** the owner disconnects an external server entirely, **When** the assistant next requests the tool list, **Then** none of that server's tools appear anymore.
4. **Given** an external server is connected and enabled, **When** the owner disables the whole connection (without removing it), **Then** none of its tools are available to the assistant, and its saved configuration (URL, label, token) is preserved so the owner can re-enable it later without re-entering it.

---

### User Story 3 - Owner connects and configures an external server (Priority: P1)

Before any of the above is possible, the owner needs a safe way to register a new external MCP server connection (its URL, a label, and its bearer token) — and only the owner can do this, never the assistant itself.

**Why this priority**: This is the setup step User Story 1 depends on; without it there is nothing to call. It is P1 alongside Story 1 because the two together are the smallest usable slice.

**Independent Test**: As the authenticated owner, submit a new external server's URL, label, and token through the management UI, and confirm the connection is saved and its tools become available to the assistant. Separately, confirm no MCP tool exists that lets the assistant itself create, edit, or delete such a connection.

**Acceptance Scenarios**:

1. **Given** the owner is authenticated, **When** they submit a new external server's URL, label, and token, **Then** the connection is saved and its tools become available to a connected assistant.
2. **Given** an existing external server connection, **When** the owner edits or removes it (including replacing its token), **Then** subsequent assistant calls use the updated configuration, and a removed connection's tools stop being offered.
3. **Given** the assistant only has access to Harnios's MCP tools (not the owner's management UI), **When** it is asked to create, change, or delete an external server connection, **Then** no tool exists for it to do so — this configuration is only reachable through the owner-authenticated management surface.

---

### Edge Cases

- What happens when the external server is reachable but a single tool call takes too long? The proxied call must fail on its own shorter timeout rather than consuming the whole `/mcp` request's time budget.
- What happens when the external server's tool catalog changes (a tool is added, removed, or its schema changes) between two cache refreshes? The assistant may see a stale catalog until the next refresh; a call to a tool that was removed upstream must fail cleanly, not crash.
- What happens when the external server returns a malformed, oversized, or unexpected response? The call must fail with a clear error rather than corrupting or hanging the `/mcp` request.
- What happens when the stored token is later revoked or expires on the external server's side? Proxied calls must fail with a clear authentication error, not a generic or misleading failure.
- What happens when the external server is temporarily unreachable at the moment Harnios needs to refresh its cached tool catalog? The previously cached catalog (if any and not too stale) or an empty catalog for that server is used, without breaking the rest of the `/mcp` request.
- What happens when the assistant calls the same proxied tool (or several tools on the same external server) fast enough to hit Harnios's own rate limit for that connection? The excess call is refused with a clear result rather than forwarded, and does not affect calls to other tools or other external servers.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let the owner register a connection to a remote MCP server by providing its URL, a display label, and a bearer token.
- **FR-002**: System MUST restrict creating, editing, and removing external server connections to the authenticated owner; no MCP tool available to an assistant can create, modify, or delete such a connection.
- **FR-003**: System MUST retrieve the list of tools exposed by each connected external server and present them to a connected assistant alongside Harnios's own native tools, indistinguishably in how they're called.
- **FR-004**: System MUST forward a call to an externally-sourced tool to its remote MCP server, using the stored token for that connection, and return the result to the calling assistant.
- **FR-005**: System MUST apply an independent, shorter time limit to each proxied call, separate from the overall request's time budget, so a slow or unreachable external server cannot cause the entire request to fail.
- **FR-006**: System MUST cache each connected external server's tool catalog for a bounded period rather than re-fetching it on every request.
- **FR-007**: System MUST return a clear failure result to the assistant when a proxied call fails (external server unreachable, timed out, or rejected the token), distinguishable from a normal tool result.
- **FR-008**: System MUST let the owner view, enable, and disable individual externally-sourced tools using the same tool-management experience already used for native tools.
- **FR-009**: System MUST let the owner disconnect an external server entirely, after which none of its tools are available to the assistant.
- **FR-010**: System MUST NOT expose an external server connection's bearer token through any tool available to the assistant (e.g. file-reading tools must not be able to surface it).
- **FR-015**: System MUST treat a saved bearer token as write-only: once saved, the owner's management UI MUST NOT display the token's value again, only allow it to be replaced with a new one.
- **FR-016**: System MUST apply its own rate limit to proxied calls made to each connected external server, independent of any rate limiting the external server applies itself, and MUST return a clear result to the assistant when that limit is hit rather than forwarding the call.
- **FR-017**: System MUST let the owner disable and re-enable an entire external server connection (pausing or resuming all of its tools at once) without deleting its saved configuration (URL, label, token), as a control distinct from removing the connection (FR-009) and from per-tool enable/disable (FR-008).
- **FR-011**: System MUST continue to behave exactly as it does today for all native tools and requests when no external server is connected.
- **FR-012**: System MUST support more than one external server connection at the same time, with tools from all connected servers presented together to the assistant.
- **FR-013**: System MUST prevent an externally-sourced tool's name from silently overriding or being confused with an existing tool's name (native, or from a different connected external server): on a name collision, System MUST refuse to register the newer, colliding tool and MUST make that refusal visible to the owner on the tool management page.
- **FR-014**: System MUST make a newly connected or edited external server's tools available to the assistant without the owner having to wait for the background cache refresh — an explicit action (e.g. a "connect" or "refresh now" step in the management UI) MUST populate the cache immediately.

### Key Entities

- **External MCP Server Connection**: An owner-managed record representing one remote MCP server — its URL, a display label, its bearer token (write-only once saved — never displayed again, only replaceable), and its state (enabled, disabled/paused, or removed). Created, edited, disabled/re-enabled, and removed only by the owner.
- **Proxied Tool**: A tool discovered from a connected external server's catalog — name, description, and input/output schema as declared by that server — cached locally and presented to the assistant the same way a native tool is, including its own independent enabled/disabled state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An owner can connect a new external MCP server and have an assistant successfully call one of its tools within 5 minutes of starting configuration, with no code changes.
- **SC-002**: When the external server is healthy, a proxied tool call returns a result to the assistant in under 15 seconds in the common case.
- **SC-003**: When the external server is unreachable or a call times out, the assistant receives a clear failure response in under 15 seconds rather than the request hanging until the overall request timeout.
- **SC-004**: Enabling or disabling an individual external tool from the management page takes effect on the assistant's very next request.
- **SC-005**: All existing native-tool behavior is unaffected — zero regressions — whether or not any external server is connected.

## Assumptions

- The reference external server for v1 is reachable over remote HTTP (Streamable HTTP/SSE) and authenticates via a static bearer token; connecting to a locally-run (stdio) external MCP server, or one requiring interactive OAuth consent with token refresh, is out of scope for v1.
- "The owner" is the same authenticated identity that already manages native tools and the file editor (existing owner session/credential) — no new user role is introduced.
- The exact cache duration (TTL) for an external server's tool catalog is an implementation detail left to planning, not a user-facing decision.
- Proxied tool results are passed through to the assistant as returned by the external server; Harnios does not attempt to interpret or transform their business content, only to wrap transport-level failures (unreachable, timeout, auth rejection) in a clear error.
