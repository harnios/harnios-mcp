# Implementation Plan: Download Single File from File Tree

**Branch**: `036-file-tree-download` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/036-file-tree-download/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a `Download` action to each file row's existing action menu in the file tree (`FileTree.tsx`), next to `Delete`, so any file — editable or not — can be downloaded directly without first opening it. The action calls the already-existing `GET /api/file/download` route (spec 028) via the same `authedFetch` + blob pattern the folder row's existing `Download zip` action already uses, and branches client-side on `isNativelyRenderable(path)` to either open the result in a new tab (native-render types) or force a save (everything else) — reusing existing helpers, no new server route or data model.

## Technical Context

**Language/Version**: TypeScript, Next.js App Router (existing frontend stack; unchanged)

**Primary Dependencies**: React (client components), existing in-repo helpers — `authedFetch` (`frontend/lib/editorFetch.ts`), `isNativelyRenderable`/`categoryForPath` (`frontend/lib/storage/fileTypes.ts`), `RowMenu`/`DownloadIcon` (`frontend/app/files/Icons.tsx` + in-file `RowMenu` component)

**Storage**: N/A — no storage schema change; reads existing files via the unchanged `readFile`/`/api/file/download` path (spec 028)

**Testing**: Existing frontend test setup for this app (component/route tests alongside `frontend/app/files/*` and `frontend/app/api/*`, per project convention) — no new test framework introduced

**Target Platform**: Web (existing Next.js app, browser client)

**Project Type**: Web application (single Next.js `frontend/` project — no separate backend service in this repo)

**Performance Goals**: No new performance target — single-file retrieval already meets spec 028's SC-006 (<2s); this feature only adds a UI trigger to that existing path

**Constraints**: Must not change `/api/file/download`'s existing request/response contract or its type-based inline/attachment behavior (spec Assumptions); must not change the folder `Download zip` action or the editor pane's existing "open or download" link

**Scale/Scope**: One UI component change (`FileTree.tsx`), one new/adjusted i18n dictionary key (`menuDownload`) per supported language, no new route, no new persisted data

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is the unfilled template — no ratified principles are defined for this repo, so there are no project-specific gates to evaluate against. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/036-file-tree-download/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── file-row-download-action.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
frontend/
├── app/
│   ├── files/
│   │   ├── FileTree.tsx          # Add `Download` item to the per-file RowMenu (DirectoryNode); new handleDownloadFile()
│   │   └── Icons.tsx              # DownloadIcon already exists — reused, no change
│   ├── api/
│   │   └── file/
│   │       └── download/
│   │           └── route.ts       # Unchanged — existing route reused as-is
│   └── ...                        # no other app routes touched
├── lib/
│   ├── editorFetch.ts             # Unchanged — authedFetch reused as-is
│   ├── storage/
│   │   └── fileTypes.ts           # Unchanged — isNativelyRenderable reused as-is
│   └── i18n/
│       └── dictionaries/          # Add `menuDownload` key alongside existing `menuDelete`/`menuDownloadZip`, per language
```

**Structure Decision**: Single Next.js `frontend/` project (existing structure, no new top-level directory). The change is localized to `frontend/app/files/FileTree.tsx` (new menu item + handler) and the i18n dictionaries it already reads `dict.menu*` strings from; every other file listed above is an existing dependency consumed unchanged.

## Complexity Tracking

*No constitution violations — this section is not applicable.*
