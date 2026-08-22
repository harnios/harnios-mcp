# Research: Scheduled Tasks

## 1. In-process tool execution (no HTTP loopback)

**Decision**: Extract the existing private `registerNativeTools(server: McpServer)` from
`frontend/app/mcp/route.ts:23-31` into a shared module (`frontend/lib/mcp-tools/register.ts`).
The scheduler instantiates its own `McpServer`, registers the native tools on it, and connects
it to an SDK `Client` via `InMemoryTransport.createLinkedPair()` (`@modelcontextprotocol/sdk`,
already a dependency). `client.listTools()` returns each tool's real JSON Schema (computed
internally by the SDK's `toJsonSchemaCompat`, the same code path that serves `/mcp`'s
`tools/list`); `client.callTool()` executes it in-process.

**Rationale**: `registerNativeTools` already aggregates exactly the tool surface the spec
requires (`registerTools`, `registerEngineTools`, `registerMessagingTools`, `registerInboxTools`,
`registerTreeTools` — deliberately not `registerExternalTools`, satisfying FR-008's exclusion of
proxied external tools) with `getDisabledTools()` gating already applied, so an owner-disabled
tool is automatically invisible to the scheduler too. Using the real SDK client/server pair
means zero network hop, zero hand-written schema-conversion code, and any future new native tool
is picked up automatically.

**Alternatives considered**:
- *Loop back through the real HTTP `/mcp` endpoint*: rejected explicitly by the spec's
  "not through the external proxy" framing and by spec 031's own proxy-hop-cap precedent
  (`EXTERNAL_PROXY_HOP_HEADER`) — unnecessary complexity and a needless network round-trip for
  a call that originates in the same process.
- *Hand-written Zod→JSON-Schema converter*: unnecessary — the SDK already produces JSON Schema
  for `tools/list`; `zod` v4.4.3 (already installed) also ships a native `z.toJSONSchema()` for
  the rare case a converter is needed independent of the SDK, but nothing here requires it.

## 2. LLM provider integration (Mistral)

**Decision**: `@mistralai/mistralai`, called with `chat.complete({ model, messages, tools,
toolChoice: "auto" })`, following the OpenAI-compatible tool-calling shape Mistral's API uses.

**Rationale**: Decided directly with the user. Mistral's chat completion API accepts function
tool definitions in JSON Schema form (`{type: "function", function: {name, description,
parameters}}`), which maps 1:1 from `client.listTools()`'s output (§1).

**Alternatives considered**: A multi-provider abstraction was explicitly rejected by the user in
favor of a single, direct Mistral integration — avoids speculative complexity for providers not
in use.

**Follow-up for implementation**: verify the exact TypeScript method/property names (in
particular `toolCalls` vs `tool_calls` casing) against the SDK version actually installed, since
it is not yet a dependency of this repo.

## 3. Trigger mechanism (in-process cron)

**Decision**: `node-cron`, started from `frontend/instrumentation.ts`'s existing `register()`
hook (inside its current `NEXT_RUNTIME === "nodejs"` guard), running one fixed 1-minute
heartbeat — not one job per task file.

**Rationale**: `instrumentation.ts` (read in full) already runs three independent "log a
warning, never block startup" checks in that exact guard (storage connectivity, OAuth owner
credential, messaging config) — this is the established pattern for anything that needs to
initialize once per server process. A single heartbeat that re-lists `os/schedules/*.md` and
recomputes due-ness every minute means a newly saved task file becomes active on the very next
tick with zero extra registration step, matching the "a task is just a file" framing (spec.md,
FR-001).

Node.js is only a long-running process on a VPS/Coolify deployment, not on Vercel serverless —
`process.env.VERCEL` (automatically set by the platform) is the concrete signal used to disable
the heartbeat there, alongside an explicit `SCHEDULER_ENABLED=false` opt-out for a deployer who
intentionally runs multiple replicas (see data-model.md's concurrency notes / spec.md
Assumptions on single-instance deployment).

The start guard lives on `globalThis`, not a module-level variable, because module-level state
resets on every `next dev` hot reload (Turbopack/webpack re-evaluate the module), which would
otherwise register a second overlapping `node-cron` timer during local development.

**Alternatives considered**:
- *Coolify's own external cron hitting an HTTP endpoint*: rejected by the user in favor of an
  in-process trigger, avoiding a Coolify-specific configuration step outside the repo.
- *One `node-cron` job per task file, re-registered on every file change*: rejected — nothing in
  this app currently watches storage for changes; the 1-minute poll-and-check model gets the
  same "new file becomes active automatically" property for free.

## 4. Task identity, model catalog, and cron validation (from clarification session)

**Decision**:
- A task's identity is an owner-typed, human-readable **name**, captured explicitly in the task
  file's front matter (not solely inferred from the file path), so the dedicated UI and the raw
  file agree on one unambiguous field.
- The assignable model set is a small, fixed, code-defined catalog (`frontend/lib/scheduler/
  models.ts`, an array of `{id, label}`) — not free text. A task's `model` front-matter value is
  validated against this catalog both when the dedicated UI saves a task (FR-014a) and,
  defensively, right before execution.
- The dedicated management UI validates a task's fields — cron expression (via `cron-parser`),
  model membership in the catalog, and required-field presence — before saving, and rejects the
  save with an error message on failure (FR-014a). This validation is UI-only; a task file
  edited directly through the general-purpose file storage interface is not blocked from being
  saved in an invalid state, and instead falls back to the existing execution-time skip-and-flag
  handling (FR-018, Edge Cases).

**Rationale**: Directly resolves the four `/speckit-clarify` answers on task identity and UI
validation. Keeping the model catalog in code (not owner-editable) matches spec.md's Assumption
that it is "decided at the infrastructure level."

## 5. Execution timeout and manual-run-while-disabled (from clarification session)

**Decision**: Every task run (scheduled or manual) is wrapped in a hard 5-minute timeout
(`Promise.race`), after which it is terminated and recorded as a failed, timed-out execution
(FR-012a). The in-memory anti-overlap guard (a `Set<string>` of currently-running task ids) is
cleared in a `finally` block regardless of outcome, so a timed-out task is immediately eligible
to run again at its next occurrence — it is not "stuck" beyond the 5-minute window.

The manual "run now" action is available regardless of a task's enabled/disabled state (FR-015):
the enabled flag is consulted only by the periodic due-check, never by the manual-trigger route.

**Rationale**: Directly resolves the clarification session's timeout and run-now answers. The
timeout is the one piece of defensive code justified beyond "let it fail naturally" (see
spec.md's error-handling framing) — without it, a single stalled outbound call would hold the
overlap guard for that task open forever.

## 6. Localization scope for the new `/schedules` UI (from clarification session)

**Decision**: The `Dictionary` type (`frontend/lib/i18n/dictionaries/types.ts`) is a single
TypeScript interface implemented identically by all six language files
(`en/it/ru/es/de/fr.ts`, each wired through `dictionaries/index.ts`'s
`Record<SupportedLanguage, Dictionary>`) — every existing owner-facing page relies on this being
total. Adding a `schedules` section to `Dictionary` therefore still requires an entry in all six
files to keep the codebase compiling, but per the clarification answer ("solo lingua di default
al lancio"), the five non-default language files copy the **same English strings verbatim**
rather than receiving real translations. This ships the feature in the default language only,
as requested, without special-casing the i18n system or leaving it partially untyped.

**Rationale**: Reconciles the clarification answer with the repo's existing all-languages-total
type contract — the alternative (making `schedules` optional in the `Dictionary` type, or
excluding some locales) would be a structural exception nothing else in the codebase has, for a
feature spec explicitly says is fine to launch monolingual and expand later.

**Alternatives considered**: Making the `schedules` dictionary key optional — rejected as an
unjustified special case; real translation into all 6 languages — rejected by the user's
clarification answer as out of scope for this feature's initial release.

## 7. Storage and audit-log idiom

**Decision**: `frontend/lib/scheduler/store.ts` mirrors `frontend/lib/messaging/store.ts`
exactly (`getRecord`/`putRecord`/`listRecords` over a reserved `.scheduler/` S3 key prefix), and
`frontend/lib/storage/directories.ts` gets `.scheduler/` added to its existing reserved-prefix
exclusion list (already applied three times over for `.oauth/`, `.mcp-tools/`,
`.external-mcp/*`), so run records and last-run bookkeeping never leak into `/files` or the
`list_directory`/`list_directory_tree` MCP tools.

**Rationale**: This exact `store.ts` shape is repeated verbatim by every existing feature that
needs S3-backed state (`lib/messaging/store.ts`, `lib/mcp-tools/store.ts`,
`lib/external-mcp/store.ts`) — following it rather than introducing a shared helper matches the
established convention (each module owns its own tiny copy) rather than a premature abstraction.

## 8. Schedule file discovery and due-check

**Decision**: Task files live at `os/schedules/*.md`, read via the existing
`listDirectory`/`readFile` functions in `frontend/lib/storage/`. Front matter is parsed with a
small hand-rolled `---key: value---` splitter (no new dependency such as `gray-matter` — this
repo already prefers hand-rolled parsing for small, flat formats, e.g.
`lib/external-mcp/schemaConvert.ts`). `cron-parser` computes whether a task's cron expression has
fired since its last recorded run (`.scheduler/last-run/{taskId}.json`); a task with no prior run
is due at its first future occurrence, not retroactively at creation time.

**Rationale**: Matches FR-011 (no catch-up) — `lastRunAt` is written after every attempt
(success or failure), so a task that was due multiple times during downtime fires once at
restart, not once per missed occurrence.
