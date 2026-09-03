# Tasks: In-App User Documentation

**Input**: Design documents from `/specs/035-user-docs/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Not included — this repo has no automated test framework (plan.md, Technical Context: Testing), and tests were not explicitly requested. Verification is manual, via [quickstart.md](./quickstart.md), matching every prior feature in this repo.

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation and testing of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact and relative to the repo root

**No Setup or Foundational phase**: this feature adds no new dependency and no infrastructure
shared by every story from the start — the one genuinely shared module
(`frontend/lib/docs/content.ts` and its six Markdown files) is scoped to User Story 1's phase
below, since User Story 2 only needs it *after* User Story 1 has produced it (mirrors spec
033-os-change-process's precedent for the same situation).

---

## Phase 1: User Story 1 - Owner reads how to use the app from the menu (Priority: P1) 🎯 MVP

**Goal**: A new "Docs" entry in the main navigation opens a read-only `/docs` page, reachable
without an owner session, organized into a general overview plus one topic per existing nav
section — with a clear "not found" message for an unrecognized topic.

**Independent Test**: quickstart.md Scenario 1 (browse every topic from the menu) and Scenario 2
(unknown topic on the page fails clearly).

### Implementation for User Story 1

- [X] T001 [P] [US1] Write `frontend/lib/docs/overview.md` — a short general introduction to the Harnios app: what it is, and a one-line pointer to each of the five topics below (Dashboard, Files, Tools, Schedules, Settings), each phrased as a short "what you can do here" summary
- [X] T002 [P] [US1] Write `frontend/lib/docs/dashboard.md` — what the root `/` dashboard shows and is for, including that it requires an owner session (per the app's current behavior)
- [X] T003 [P] [US1] Write `frontend/lib/docs/files.md` — how the `/files` file manager works: browsing/creating/editing/deleting files and folders in the OS's storage, uploading, and that it has its own header (no primary nav) while editing
- [X] T004 [P] [US1] Write `frontend/lib/docs/tools.md` — what `/tools` shows (the native + external MCP tool catalog), how enabling/disabling a tool works and what it affects, and how external MCP server connections (`/tools/connections`) are added/edited/removed
- [X] T005 [P] [US1] Write `frontend/lib/docs/schedules.md` — what a Scheduled Task is (cron expression, timezone, assigned model, prompt, enabled/disabled), how the 1-minute heartbeat and manual "run now" both work, and where to see past execution outcomes
- [X] T006 [P] [US1] Write `frontend/lib/docs/settings.md` — what `/settings/connected-apps` covers (owner-facing connection/account settings)
- [X] T007 [US1] Create `frontend/lib/docs/content.ts` per data-model.md: the `DOCS_TOPICS` list (`overview`, `dashboard`, `files`, `tools`, `schedules`, `settings` — id + `Dictionary["docs"]` title key), a `DOCS_CONTENT` map reading each file in T001-T006 via `readFileSync` with a literal path (mirrors `ENGINE_CONTENT`, research.md §1), and `getDocsContent(topicId?)` returning the overview when omitted, the matching content for a valid id, and `undefined` otherwise (depends on T001-T006)
- [X] T008 [US1] Add a `docs` key to the `nav` object and a new `docs: {...}` block (page title, description, topic-list heading, per-topic short labels matching T001-T006's topics, `notFoundTitle`, `notFoundBody`) to `Dictionary` in `frontend/lib/i18n/dictionaries/types.ts`, then implement both in all six dictionary files — `en.ts` with real copy; `it.ts`/`ru.ts`/`fr.ts`/`de.ts`/`es.ts` duplicating the same English strings verbatim for v1 (research.md §5, FR-011 — the `Dictionary` type must stay total across all locales even though only the default language ships real translations)
- [X] T009 [US1] Add `{ href: "/docs", prefix: "/docs", key: "docs" }` to `NAV_ITEMS` in `frontend/app/_ui/nav.ts`, appended after the `settings` entry (research.md §5) (depends on T008 for the `docs` nav key to exist on `Dictionary`)
- [X] T010 [US1] Create `frontend/app/docs/page.tsx` (Server Component, no owner-session check — FR-004): renders the `overview` topic's Markdown via `react-markdown` + `remark-gfm` (read-only, mirrors `app/files/MarkdownEditor.tsx`'s preview branch) plus a linked list of the other five topics generated from `DOCS_TOPICS`, using `Dictionary["docs"]`/`Dictionary["nav"].docs` for chrome strings (contracts/docs-page-routes.md) (depends on T007, T008)
- [X] T011 [US1] Create `frontend/app/docs/[topic]/page.tsx` (Server Component, no owner-session check): resolves the `topic` route param via `getDocsContent`; a valid id renders that topic's Markdown the same way `page.tsx` renders `overview` (including `topic: "overview"` itself, so `/docs/overview` and `/docs` render identically — research.md §4), with the current topic marked in the topic-list navigation; an unrecognized id calls Next.js's `notFound()` (contracts/docs-page-routes.md) (depends on T007, T008)
- [X] T012 [US1] Create `frontend/app/docs/not-found.tsx` — segment-level 404 for `/docs/*`: a "topic not found" heading/body from `Dictionary["docs"]` (`notFoundTitle`/`notFoundBody`), a linked list of `DOCS_TOPICS`, and a link back to `/docs` (FR-007a, contracts/docs-page-routes.md) (depends on T007, T008)

**Checkpoint**: User Story 1 is fully functional and independently testable — run quickstart.md Scenarios 1 and 2.

---

## Phase 2: User Story 2 - A connected assistant answers "how does X work" using the docs (Priority: P2)

**Goal**: The same six topics are retrievable through one new MCP tool, `get_docs`, with an
optional `topic` parameter — omitted returns the overview, an unrecognized value fails clearly
naming the valid topics.

**Independent Test**: quickstart.md Scenario 3 (MCP retrieval, valid/omitted/invalid topic) and
Scenario 4 (page and tool return identical content for the same topic).

### Implementation for User Story 2

- [X] T013 [US2] Create `frontend/lib/mcp-tools/docsTools.ts`: a `registerDocsTools(server, disabledTools)` function registering the `get_docs` tool via `registerGatedTool`, `inputSchema: { topic: z.enum([...DOCS_TOPICS ids]).optional() }`, handler returning `ok`-style plain text content from `getDocsContent(topic)` (imported from `frontend/lib/docs/content.ts`), tool metadata (name/title/description) per contracts/get-docs-tool.md — explicitly stating in the description that this covers the app itself, not the connected business's own OS content (depends on T007)
- [X] T014 [P] [US2] Add `{ name: "get_docs", group: "Docs" }` to `TOOL_CATALOG` in `frontend/lib/mcp-tools/catalog.ts` (depends on T013 for the tool name to match)
- [X] T015 [US2] Call `await registerDocsTools(server, disabledTools);` from `registerNativeTools` in `frontend/lib/mcp-tools/register.ts`, alongside the existing `register*Tools` calls (depends on T013)

**Checkpoint**: User Stories 1 AND 2 both hold — run quickstart.md Scenarios 3, 4, and 5.

---

## Phase 3: User Story 3 - Documentation topics track the app's own navigation (Priority: P3)

**Goal**: The set of documentation topics stays visibly, deliberately tied to `NAV_ITEMS`, so a
future navigation change is a prompt to update the docs, not a silent drift.

**Independent Test**: quickstart.md's implicit check in Scenario 1 (every current nav entry has a
matching topic) plus a direct side-by-side read of the two lists.

### Implementation for User Story 3

- [X] T016 [US3] Add a short code comment to `DOCS_TOPICS` in `frontend/lib/docs/content.ts` noting it's expected to mirror `NAV_ITEMS` in `frontend/app/_ui/nav.ts` (plus the `overview` topic), and a matching comment on `NAV_ITEMS` pointing back at `DOCS_TOPICS` — then verify by inspection that the five non-overview `DOCS_TOPICS` ids (`dashboard`, `files`, `tools`, `schedules`, `settings`) exactly match `NAV_ITEMS`'s five `key` values (depends on T007, T009 already existing)

**Checkpoint**: All three user stories are independently functional — run quickstart.md Scenarios 1-5 in full.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T017 [P] Run quickstart.md Scenarios 1-5 end to end against a running instance and confirm every "Expected" outcome
- [X] T018 [P] Proofread all six `frontend/lib/docs/*.md` files and the `docs`/`nav.docs` dictionary strings (`frontend/lib/i18n/dictionaries/en.ts`) together for consistent terminology (e.g., "topic" vs "section", naming that matches each area's own on-page labels)

---

## Dependencies & Execution Order

### Phase Dependencies

- **User Story 1 (Phase 1)**: No dependencies — can start immediately. Delivers the MVP (a readable `/docs` page).
- **User Story 2 (Phase 2)**: Depends on User Story 1's T007 (`lib/docs/content.ts`) existing — the MCP tool reads from the same module the page uses (FR-008). Otherwise independent of US1's page/route/dictionary tasks.
- **User Story 3 (Phase 3)**: Depends on User Story 1's T007 and T009 already existing (there must be two lists to cross-reference).
- **Polish (Phase 4)**: Depends on all three user stories being complete.

### Within User Story 1

- T001-T006 (the six content files) have no dependencies on each other — fully parallel.
- T007 (`content.ts`) depends on T001-T006.
- T008 (dictionary) has no dependency on T001-T007 — can run in parallel with them.
- T009 (`nav.ts`) depends on T008.
- T010, T011, T012 (the three routes) each depend on T007 and T008, but not on each other.

### Within User Story 2

- T013 (`docsTools.ts`) depends on T007.
- T014 (`catalog.ts`) depends on T013.
- T015 (`register.ts` wiring) depends on T013.

### Parallel Opportunities

- T001-T006 (six content files) — fully parallel, different files.
- T008 (dictionary) can run in parallel with T001-T007 — different files, no shared dependency.
- T010, T011, T012 (the three `/docs` routes) — parallel with each other once T007 and T008 are done.
- T014 can run in parallel with T015 (both depend only on T013, not on each other).
- T017 and T018 (Polish) — parallel with each other.

---

## Parallel Example: User Story 1

```bash
# Launch all six content files together:
Task: "Write frontend/lib/docs/overview.md"
Task: "Write frontend/lib/docs/dashboard.md"
Task: "Write frontend/lib/docs/files.md"
Task: "Write frontend/lib/docs/tools.md"
Task: "Write frontend/lib/docs/schedules.md"
Task: "Write frontend/lib/docs/settings.md"

# Once T007 and T008 are done, launch all three routes together:
Task: "Create frontend/app/docs/page.tsx"
Task: "Create frontend/app/docs/[topic]/page.tsx"
Task: "Create frontend/app/docs/not-found.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (User Story 1) — T001 through T012.
2. **STOP and VALIDATE**: run quickstart.md Scenarios 1 and 2 against a running instance.
3. Deploy/demo if ready — the page alone already delivers the feature's core value.

### Incremental Delivery

1. User Story 1 → validate (Scenarios 1-2) → deploy/demo (MVP).
2. Add User Story 2 (T013-T015) → validate (Scenarios 3-5) → deploy/demo.
3. Add User Story 3 (T016) → validate (re-check Scenario 1's topic coverage) → deploy/demo.
4. Phase 4 polish → final quickstart.md pass.

---

## Notes

- [P] tasks = different files, no dependency on an incomplete task.
- [Story] label maps each task to its user story for traceability.
- No automated tests exist in this repo (plan.md, Technical Context: Testing) — every checkpoint
  above is verified manually via quickstart.md, not via a test task.
- Commit after each task or logical group, per this repo's own convention.
