# Implementation Plan: In-App User Documentation

**Branch**: `035-user-docs` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/035-user-docs/spec.md`

## Summary

A new `/docs` page joins the app's main navigation alongside Dashboard/Files/Tools/Schedules/
Settings — read-only, reachable without an owner session, organized into a general overview plus
one topic per existing nav section (Dashboard, Files, Tools, Schedules, Settings). The exact same
content is exposed to a connected assistant through one new MCP tool, `get_docs`, with an optional
`topic` parameter — no topic returns the overview. Both surfaces read from the same six
code-bundled Markdown files (mirroring `get_os_engine`/`get_os_init`/`get_os_upgrade`/
`get_change_process` in `frontend/lib/mcp-tools/engineTools.ts`, spec 016/033), so there is one
place to edit a topic's content, never two copies to keep in sync. An unrecognized topic fails
clearly on both surfaces, listing the valid topics, rather than silently falling back or 404-ing
without explanation. See [research.md](./research.md) for the decisions behind each choice, and
[data-model.md](./data-model.md) / [contracts/](./contracts/) for the concrete file/tool/route
shapes.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router), Node.js runtime — no new runtime
requirement; this feature adds no server-side execution logic of its own (unlike the scheduler,
spec 032), only Markdown content, one new page route, and one new tool registration following an
existing pattern.

**Primary Dependencies**: None new. Reuses `@modelcontextprotocol/sdk` (`registerGatedTool`,
`zod` enum input schemas — both already used elsewhere in `lib/mcp-tools/`), `react-markdown` +
`remark-gfm` (already a dependency, already used read-only in `app/files/MarkdownEditor.tsx`'s
preview mode), and `node:fs` (`readFileSync`, already used to bundle the engine `.md` files).

**Storage**: The app's single existing S3-compatible bucket is untouched by this feature —
documentation content is code-bundled Markdown under `frontend/lib/docs/`, never written into the
bucket (FR-010), exactly like the engine content.

**Testing**: This repo has no automated test framework (confirmed unchanged since spec 031/032/033).
Verification is manual, via [quickstart.md](./quickstart.md).

**Target Platform**: No change — works identically on Vercel serverless and on a persistent
VPS/Coolify deployment; the feature has no background process or persistent-runtime requirement
(unlike spec 032's scheduler).

**Project Type**: Web application (existing single Next.js app in `frontend/`) — no new top-level
project.

**Performance Goals**: N/A — static, code-bundled content read once at module load; no background
process, no per-request external call.

**Constraints**: FR-004 — the `/docs` page must render with no owner-session check, unlike
`/tools`/`/schedules`/`/settings`. FR-007/FR-007a — an unrecognized topic must fail clearly with
the list of valid topics, identically in spirit on both the MCP tool and the page. FR-008 — the
page and the MCP tool must read from the same underlying content, never a duplicated copy.
FR-011 — documentation *content* ships in the default language only. The `nav.docs` label is
translated normally in all six locale files, like every other nav entry; only the page's own
*chrome* strings ("topic not found" messaging, etc.) are filled with English placeholder text in
the five non-default locale files for now — the same split spec 032 already established between
`nav.schedules` (translated) and `/schedules`'s own interface strings (English placeholder).

**Scale/Scope**: Six fixed topics (overview + five nav-mirrored) at launch — no scale concerns, no
pagination, no search (per spec.md Assumptions).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no ratified principles) — no
project-specific gates apply. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/035-user-docs/
├── plan.md                       # This file
├── research.md                   # Phase 0 output
├── data-model.md                 # Phase 1 output
├── quickstart.md                 # Phase 1 output
├── contracts/
│   ├── get-docs-tool.md          # New MCP tool contract
│   └── docs-page-routes.md       # /docs and /docs/[topic] page-route contract
└── tasks.md                      # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

Single existing Next.js app (`frontend/`) — no new top-level project, no new module directory.

```text
frontend/
├── lib/
│   ├── docs/                       # NEW
│   │   ├── content.ts              # DOCS_TOPICS list + DOCS_CONTENT map (readFileSync) + getDocsContent()
│   │   ├── overview.md
│   │   ├── dashboard.md
│   │   ├── files.md
│   │   ├── tools.md
│   │   ├── schedules.md
│   │   └── settings.md
│   ├── mcp-tools/
│   │   ├── docsTools.ts            # NEW — registers the get_docs tool from lib/docs/content.ts
│   │   ├── catalog.ts              # MODIFIED — + { name: "get_docs", group: "Docs" }
│   │   └── register.ts             # MODIFIED — + registerDocsTools(server, disabledTools)
│   └── i18n/dictionaries/
│       ├── types.ts                # MODIFIED — nav.docs + a docs {...} chrome block
│       └── en.ts / it.ts / ru.ts / fr.ts / de.ts / es.ts   # MODIFIED — same keys added to all six
└── app/
    ├── _ui/
    │   └── nav.ts                  # MODIFIED — + { href: "/docs", prefix: "/docs", key: "docs" }
    └── docs/                       # NEW
        ├── page.tsx                 # Overview + topic index, no owner-session check
        ├── [topic]/
        │   └── page.tsx             # One topic's content; unknown topic → notFound()
        └── not-found.tsx            # Segment-level 404 listing the valid topics (FR-007a)
```

No changes to `middleware.ts` (its only job is redirecting to `/init` when storage is
unconfigured — unrelated to this feature), to `app/_ui/SiteHeader.tsx`'s `CHROMELESS` list
(`/docs` keeps the standard header/nav, like `/tools` and `/schedules`), to the scheduler
(spec 032), or to any existing tool's registration mechanism beyond the one new call in
`register.ts`.

**Structure Decision**: Extends the existing single Next.js app in `frontend/` — no new project,
no new deployable unit, no new dependency. New content is six new Markdown files plus one new
`lib/docs/content.ts` module (the single shared source for both surfaces), one new MCP tool
registration file, one new page route (`/docs`, `/docs/[topic]`), and small additive edits to the
existing tool catalog, tool registration list, navigation list, and the six locale dictionaries.

## Complexity Tracking

*No constitution violations — this section is intentionally empty.*
