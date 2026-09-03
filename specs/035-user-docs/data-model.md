# Phase 1 Data Model: In-App User Documentation

## Documentation Topic

A single named unit of documentation content, retrievable identically from the `/docs` page and
from the `get_docs` MCP tool. Defined entirely in application code — never stored in, or read
from, the OS's own S3 bucket (FR-010).

| Field | Type | Notes |
|---|---|---|
| `id` | string, one of a fixed set | Stable identifier and MCP enum value / page route segment. See fixed set below. |
| `titleKey` | `Dictionary["docs"]` key | Points at the short, translatable display title (chrome, not content). |
| `content` | Markdown string | The full body, read once from `lib/docs/<id>.md`. English/default-language only at launch (FR-011). |

**Fixed set of topics at launch** (`DOCS_TOPICS`, `lib/docs/content.ts`), one-to-one with the
app's current primary navigation entries plus a general overview:

| `id` | Mirrors nav entry | Source file |
|---|---|---|
| `overview` | *(none — general introduction)* | `lib/docs/overview.md` |
| `dashboard` | Dashboard (`/`) | `lib/docs/dashboard.md` |
| `files` | Files (`/files`) | `lib/docs/files.md` |
| `tools` | Tools (`/tools`) | `lib/docs/tools.md` |
| `schedules` | Schedules (`/schedules`) | `lib/docs/schedules.md` |
| `settings` | Settings (`/settings`) | `lib/docs/settings.md` |

**Identity / uniqueness**: `id` values are fixed string literals known at build time (a TypeScript
union, not free-form data) — there is no create/rename/delete operation on a Documentation Topic
through any interface; adding one is a code change (a new `.md` file + one new `DOCS_TOPICS`
entry + one new dictionary title key), consistent with spec.md's Assumptions ("no
content-authoring UI is in scope").

**Lifecycle**: Static for the lifetime of a deployed version — no state transitions. A topic
either exists (in the current deployed code) or doesn't; there is no draft/published distinction
(unlike Change Proposals, spec 033).

**Retrieval behavior** (`getDocsContent`, `lib/docs/content.ts`):

- `getDocsContent()` (no argument) → `overview` topic's content.
- `getDocsContent("overview" | "dashboard" | "files" | "tools" | "schedules" | "settings")` → that
  topic's content.
- Any other string → `undefined`. Both call sites (the MCP tool handler and, for the page route,
  the `[topic]` segment) treat `undefined` as "not found" and each surfaces FR-007/FR-007a's
  clear-failure behavior in the way appropriate to that surface (MCP: `zod` enum validation error
  before the handler runs, per research.md §2; page: `notFound()` → `not-found.tsx`, per
  research.md §3) — `content.ts` itself has no opinion on *how* "not found" is presented, only
  reports it.

## Relationships

- A Documentation Topic has no relationship to any other entity in this system (Scheduled Task,
  Change Proposal, external MCP connection, etc.) — it is purely descriptive content *about* those
  other areas of the app, never a live view onto their data. Updating, say, the `schedules` topic's
  Markdown never reads from or writes to `.scheduler/` or `os/schedules/*.md`.
- `DOCS_TOPICS`' id set is expected to track `app/_ui/nav.ts`'s `NAV_ITEMS` (spec.md User Story 3)
  — a process expectation for whoever adds a future nav entry, not an automated constraint checked
  by any code in this feature.

## Pre-existing entities referenced, not modified by this feature

- **Tool Catalog Entry** (`frontend/lib/mcp-tools/catalog.ts`): gains one new row, `{ name:
  "get_docs", group: "Docs" }` — this feature adds an entry but does not change the `TOOL_CATALOG`
  entity's own shape.
- **Dictionary** (`frontend/lib/i18n/dictionaries/types.ts`): gains a `nav.docs` string key and a
  new `docs: {...}` block for page chrome — this feature adds keys but does not change how
  `Dictionary`/`getDictionary`/`resolveLanguage` work.
