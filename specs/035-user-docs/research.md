# Phase 0 Research: In-App User Documentation

## 1. Content source and module layout

**Decision**: Six Markdown files under a new `frontend/lib/docs/` directory — `overview.md`,
`dashboard.md`, `files.md`, `tools.md`, `schedules.md`, `settings.md` — read once at module load
via `readFileSync`, each path spelled out literally, exactly like `ENGINE_CONTENT` in
`frontend/lib/mcp-tools/engineTools.ts`. A new module, `frontend/lib/docs/content.ts`, owns the
`DOCS_TOPICS` list (id + display metadata) and a `getDocsContent(topicId?)` helper; both the MCP
tool module and the two page routes import from this one file — neither reads a `.md` file
directly.

**Rationale**: FR-008 requires one shared source for the page and the MCP tool. Splitting the
*content* (`lib/docs/content.ts`) from the *MCP registration* (`lib/mcp-tools/docsTools.ts`) is a
small departure from `engineTools.ts` (which combines both) — justified here because, unlike the
engine content, this content also has a second consumer (the page routes) that has no reason to
import an MCP-tools module. Literal `readFileSync` paths are required for Vercel's `@vercel/nft`
build-time file tracing to bundle the `.md` files (confirmed already documented in
`engineTools.ts`'s own comment).

**Alternatives considered**: Reusing `ENGINE_CONTENT`/`engineTools.ts` directly for this content
too. Rejected — that content is explicitly scoped to *building/repairing a connected assistant's
own operating instructions for a specific business* (spec 016), a different audience and a
different lifecycle than *documentation for the human owner about how the app itself works*
(spec.md's explicit scope boundary, FR-009). Mixing the two would blur that boundary for future
maintainers of either.

## 2. MCP tool shape: one tool with a `topic` enum, not one tool per topic

**Decision**: A single `get_docs` tool, `inputSchema: { topic: z.enum([...]).optional() }`, where
the enum values are exactly `DOCS_TOPICS`' ids (including `"overview"`, for symmetry — a caller
can pass `topic: "overview"` explicitly or omit `topic` entirely; both return the same content).
Registered via `registerGatedTool`, added to `TOOL_CATALOG` as one new entry under a new `"Docs"`
group.

**Rationale**: Already decided by the user before this plan (see spec.md's discussion trail) to
avoid crowding `TOOL_CATALOG`/`/tools` with near-duplicate entries the way four separate engine
tools would if applied here. Unlike the engine tools — four genuinely different *actions* (build,
check-upgrade, init, propose-change) — these are six instances of the same action ("get me
documentation about X"), which is exactly the shape a single enum parameter fits. A zod enum also
gives FR-007 (unrecognized topic must fail clearly, listing valid topics) for free: the MCP SDK
validates tool call arguments against the input schema before the handler runs, and a
`z.enum([...])` validation failure's message already names the accepted values — no bespoke
error-formatting code needed in the tool handler itself.

**Alternatives considered**: One tool per topic (`get_docs_dashboard`, `get_docs_files`, ...),
mirroring the engine tools exactly. Rejected per the user's explicit design decision — six
tools for one conceptual action clutters `tools/list` and `/tools` without adding capability a
`topic` parameter doesn't already provide.

## 3. Unknown-topic behavior on the page: Next.js `notFound()` + a segment `not-found.tsx`

**Decision**: `app/docs/[topic]/page.tsx` calls Next.js's `notFound()` when the `topic` route
param isn't one of `DOCS_TOPICS`' ids. A new `app/docs/not-found.tsx` renders the "topic not
found" message together with a linked list of the valid topics (reads `DOCS_TOPICS` from the same
`lib/docs/content.ts` used everywhere else), so this too has one source rather than a hand-written
duplicate list.

**Rationale**: FR-007a (from `/speckit-clarify`'s Q1) requires a clear "not found" message listing
valid topics — not a silent redirect, not a generic fallback. Next.js's segment-level
`not-found.tsx` is the idiomatic way to render a tailored 404 for one route subtree without
inventing a parallel "is this a real topic" branch inside every page component.

**Alternatives considered**: Silently rendering the overview instead (Q1's rejected Option A) —
would hide a stale/mistyped link instead of surfacing it, harder to notice and fix. A client-side
redirect to `/docs` (rejected Option C) — same problem, plus an extra round-trip for no benefit.

## 4. Route shape: `/docs` is the canonical overview URL, not `/docs/overview`

**Decision**: `app/docs/page.tsx` renders the overview topic's content directly (no redirect) plus
a linked list of the other five topics. `app/docs/[topic]/page.tsx` accepts all six
`DOCS_TOPICS` ids, including `"overview"` — visiting `/docs/overview` renders the same content as
`/docs` rather than erroring, so there's no trap where a plausible URL 404s.

**Rationale**: Keeps `/docs` itself meaningful (an owner landing on the bare nav entry sees content
immediately, not an empty index), while still giving every topic — overview included — a stable,
linkable URL for the "not found" page's link list and for any future direct link (out of scope
this feature, per the `/speckit-clarify` Q2 answer, but no reason to make it awkward later).

**Alternatives considered**: Making `/docs` redirect to `/docs/overview`. Rejected as an
unnecessary extra hop with no benefit — nothing before this feature depends on `/docs` being empty
or index-only.

## 5. Navigation entry and dictionary keys

**Decision**: `app/_ui/nav.ts`'s `NAV_ITEMS` gains one entry, `{ href: "/docs", prefix: "/docs",
key: "docs" }`, placed after `settings` (end of the list) — position is cosmetic and not
specified by spec.md, so the least-disruptive choice (append) is used rather than reordering
existing entries. `Dictionary`'s `nav` object gains a `docs` key — translated normally, like every
other `nav` entry (`nav.schedules` is real Italian/Russian/French/German/Spanish in each locale
file, not English) — and a separate, new top-level `docs: {...}` block holds the page's own chrome
strings (page title/description, topic labels, not-found heading/body), added to all six locale
files (`en.ts`, `it.ts`, `ru.ts`, `fr.ts`, `de.ts`, `es.ts`) with English text in every file for
now. This mirrors `it.ts`'s existing pair exactly: `nav.schedules` is genuinely translated
("Pianificazioni") while the deeper `schedules: {...}` chrome block is English in every locale
file — i.e. the short *nav label* always gets a real translation, only the *page's own body/chrome
text* defers translation, matching spec 032's clarification that `/schedules`'s interface ships in
the default language only while translation of that interface's own text is deferred.

**Rationale**: FR-001 (menu entry) and this project's existing i18n architecture, which requires
every locale file to satisfy the same `Dictionary` type — omitting `docs` from five files would be
a type error, not a valid way to express "translation deferred."

**Alternatives considered**: None — this is a direct application of an already-established,
observed pattern, not a new design decision.

## 6. Documentation *content* itself stays out of the `Dictionary` system

**Decision**: The six topics' Markdown bodies (`lib/docs/*.md`) are plain files, not
`Dictionary` entries — only the page's surrounding chrome (labels, headings, not-found message)
goes through `Dictionary`. FR-011 scopes "default language only" to this content.

**Rationale**: Matches how `engineTools.ts`'s `ENGINE_CONTENT` is handled (plain bundled Markdown,
no dictionary involvement) and avoids forcing long-form prose through the parameterized-string
`Dictionary` shape, which is designed for short UI strings, not documentation bodies.

**Alternatives considered**: None — long-form content has never gone through `Dictionary`
anywhere in this codebase; there's no precedent to deviate from.

## 7. Testing approach

This repo has no automated test framework (confirmed unchanged since spec 031/032/033).
Verification is manual, via `quickstart.md`, following the same approach as every prior feature.
