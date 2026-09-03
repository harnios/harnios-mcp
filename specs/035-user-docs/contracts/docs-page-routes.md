# Contract: `/docs` page routes

Two new App Router routes under `frontend/app/docs/`, both Server Components, both reading from
the same `frontend/lib/docs/content.ts` the MCP tool uses (research.md §1, data-model.md).

## `GET /docs` (`app/docs/page.tsx`)

- **Access**: No owner-session check (FR-004) — renders for any visitor, signed in or not, unlike
  `/tools`/`/schedules`/`/settings`.
- **Renders**: The `overview` topic's Markdown (via `react-markdown` + `remark-gfm`, read-only —
  same libraries as `app/files/MarkdownEditor.tsx`'s preview mode, used directly here since this
  page needs no edit mode and so doesn't reuse that component) plus a linked list of the other
  five topics (`/docs/dashboard`, `/docs/files`, `/docs/tools`, `/docs/schedules`,
  `/docs/settings`), generated from `DOCS_TOPICS` — not a hand-written link list.
- **Chrome strings**: From `Dictionary["docs"]` (page title, description, topic-list heading) and
  `Dictionary["nav"].docs` (matches the nav entry's own label).

## `GET /docs/[topic]` (`app/docs/[topic]/page.tsx`)

- **Access**: Same as `/docs` — no owner-session check.
- **`topic` route param handling**:
  - One of `DOCS_TOPICS`' six ids (`overview`, `dashboard`, `files`, `tools`, `schedules`,
    `settings`) → renders that topic's Markdown the same way `/docs` renders `overview`
    (`/docs/overview` and `/docs` render identical content — research.md §4), plus the same
    topic-list navigation (with the current topic marked, mirroring `SiteHeader`'s
    `aria-current="page"` pattern on the primary nav).
  - Anything else → calls Next.js's `notFound()`.
- **Unknown topic (FR-007a)**: `notFound()` renders the segment-level `app/docs/not-found.tsx`,
  which shows a clear "topic not found" message and a linked list of the valid topics (from the
  same `DOCS_TOPICS`, not a duplicated list) — never a silent redirect, never a fallback to the
  overview without explanation (research.md §3).

## `app/docs/not-found.tsx`

- Segment-scoped to `/docs/*` (Next.js convention: a `not-found.tsx` alongside a dynamic segment's
  `page.tsx` handles that segment's `notFound()` calls without affecting the rest of the app's
  404 handling).
- Content: a short heading + body from `Dictionary["docs"]` (`notFoundTitle`/`notFoundBody`) and a
  linked list of `DOCS_TOPICS`, plus a link back to `/docs`.

## Not affected by this feature

- `frontend/middleware.ts` — its only concern is redirecting to `/init` when storage is
  unconfigured (spec 014); unrelated to `/docs`'s access rules.
- `app/_ui/SiteHeader.tsx`'s `CHROMELESS` list — `/docs` is not added to it, so it keeps the
  standard header/primary-nav chrome like `/tools` and `/schedules` (not like `/files`/`/editor`,
  which render their own header).
