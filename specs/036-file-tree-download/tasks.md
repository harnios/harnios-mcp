---

description: "Task list for Download Single File from File Tree"
---

# Tasks: Download Single File from File Tree

**Input**: Design documents from `/specs/036-file-tree-download/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/file-row-download-action.md](./contracts/file-row-download-action.md), [quickstart.md](./quickstart.md)

**Tests**: Not included — the spec does not request them, and the project has no test runner/test files for this frontend today (see plan.md Technical Context); adding one is out of scope for this feature.

**Organization**: The spec defines a single user story (US1, P1), so nearly all substantive work lives in its phase. Setup/Foundational are kept to what's genuinely a shared prerequisite (i18n keys), per research.md's decision to reuse every other existing piece unchanged.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1)
- Paths are relative to the repo root

## Phase 1: Setup

**Purpose**: Project initialization and basic structure

No setup tasks — this feature adds one action to an existing, already-running component and reuses every dependency, route, and helper already present in `frontend/` (research.md §1–3, plan.md Technical Context). Nothing new to install or scaffold.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The one piece of infrastructure shared by (and only needed for) User Story 1 — the new menu label's translations — done first so US1's implementation task can just reference `dict.menuDownload`.

**⚠️ CRITICAL**: Complete before the User Story 1 implementation task.

- [X] T001 [P] Add `menuDownload: string;` to the `tree` section of the `Dictionary` type in `frontend/lib/i18n/dictionaries/types.ts`, next to the existing `menuDelete`/`menuDownloadZip` entries
- [X] T002 [P] Add `menuDownload: "Download",` to `frontend/lib/i18n/dictionaries/en.ts`, next to `menuDelete`
- [X] T003 [P] Add the Spanish translation for `menuDownload` to `frontend/lib/i18n/dictionaries/es.ts`, next to `menuDelete`
- [X] T004 [P] Add the French translation for `menuDownload` to `frontend/lib/i18n/dictionaries/fr.ts`, next to `menuDelete`
- [X] T005 [P] Add the Italian translation for `menuDownload` to `frontend/lib/i18n/dictionaries/it.ts`, next to `menuDelete`
- [X] T006 [P] Add the German translation for `menuDownload` to `frontend/lib/i18n/dictionaries/de.ts`, next to `menuDelete`
- [X] T007 [P] Add the Russian translation for `menuDownload` to `frontend/lib/i18n/dictionaries/ru.ts`, next to `menuDelete`

**Checkpoint**: `dict.menuDownload` resolves in every supported language; TypeScript compiles with no missing-key error on `Dictionary`.

---

## Phase 3: User Story 1 - Download any file directly from the file tree (Priority: P1) 🎯 MVP

**Goal**: Every file row in the tree offers a working "Download" action, for any file type, without first opening the file (spec FR-001–FR-007).

**Independent Test**: Per spec.md — open the row menu of an editable file and of a binary/unsupported file, in each case trigger "Download" without having opened the file first, and confirm the file arrives on the device (or opens in a new tab for a natively-renderable type).

### Implementation for User Story 1

- [X] T008 [US1] In `frontend/app/files/FileTree.tsx`, add a `handleDownloadFile(path: string)` function on `DirectoryNode` implementing the client behavior from `contracts/file-row-download-action.md`: `authedFetch` the existing `/api/file/download?path=` route; on a non-OK response, parse the JSON `message` (falling back to `dict.downloadFailed`) and show it via `window.alert`, matching the existing `handleDownloadFolder` error path; on success, read the response as a `Blob`
- [X] T009 [US1] In the same function, branch on `isNativelyRenderable(path)` (import from `frontend/lib/storage/fileTypes.ts`, already used elsewhere in this file): if true, `window.open(URL.createObjectURL(blob), "_blank")`; otherwise create a detached `<a>` with `href` set to the object URL and `download` set to the file's base name, click it, then remove it — mirroring `handleDownloadFolder`'s existing zip-download DOM pattern — and revoke the object URL after either path (depends on T008). *Deviation from the original task description*: the renderable-type object URL is revoked via a 30s `setTimeout` rather than immediately, since revoking it synchronously races the new tab's asynchronous load and can leave it blank — the immediate-revoke pattern from `handleDownloadFolder` is only safe for the same-tick `<a download>` click, which was kept as-is.
- [X] T010 [US1] Guard `handleDownloadFile` with the existing `busy` state (set true at the start, false in a `finally`) so the row's menu disables during the request, consistent with `handleDeleteFile`/`handleDownloadFolder` (depends on T008)
- [X] T011 [US1] In the file-row `RowMenu` items array (`entries?.files.map(...)`, around the existing `menuDelete` entry), add `{ label: dict.menuDownload, icon: <DownloadIcon />, onClick: () => handleDownloadFile(f.path) }` before the destructive `Delete` entry, reusing the already-imported `DownloadIcon` (depends on T001–T007 for the label, T008–T010 for the handler)

**Checkpoint**: User Story 1 is fully functional — every file row offers "Download", working the same way regardless of file type, with no prior "open" step.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Manual verification against the spec's success criteria — no automated tests exist for this project (see Tests note above)

- [ ] T012 Manually run through all 5 scenarios in `quickstart.md` against a local dev instance, covering an editable file, a non-renderable binary file, a natively-renderable file (PDF/JPG/PNG), an unsaved-edits case, and a simulated retrieval failure — **not run in this session** (needs a live dev server + browser click-through); left for the user/CI to execute
- [X] T013 [P] Confirm the folder row's existing "Download zip" action and the editor pane's existing "open or download" link for unsupported files still behave exactly as before (spec Assumptions — nothing here should have touched either) — verified by inspection: `git diff --stat` shows no changes to `handleDownloadFolder` or `FileEditor.tsx`, only additive changes (new function + one new RowMenu item) in `FileTree.tsx` and one new i18n key per language file

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: None — no tasks
- **Foundational (Phase 2)**: No dependencies — T001–T007 can all run in parallel (7 different files); BLOCKS T011 (needs `dict.menuDownload` to exist)
- **User Story 1 (Phase 3)**: T008 → T009, T010 (same function, sequential edits to one file) → T011 (needs both the handler and the Foundational label)
- **Polish (Phase 4)**: Depends on Phase 3 being complete

### Parallel Opportunities

- All of T001–T007 (Phase 2) together — seven independent files
- T012 and T013 (Phase 4) together — independent verification checks

---

## Parallel Example: Phase 2 (Foundational)

```bash
Task: "Add menuDownload to the Dictionary type in frontend/lib/i18n/dictionaries/types.ts"
Task: "Add menuDownload (English) to frontend/lib/i18n/dictionaries/en.ts"
Task: "Add menuDownload (Spanish) to frontend/lib/i18n/dictionaries/es.ts"
Task: "Add menuDownload (French) to frontend/lib/i18n/dictionaries/fr.ts"
Task: "Add menuDownload (Italian) to frontend/lib/i18n/dictionaries/it.ts"
Task: "Add menuDownload (German) to frontend/lib/i18n/dictionaries/de.ts"
Task: "Add menuDownload (Russian) to frontend/lib/i18n/dictionaries/ru.ts"
```

---

## Implementation Strategy

### MVP First (and only) Scope

This feature *is* its own MVP — one user story, one small component change:

1. Complete Phase 2 (i18n keys, parallel)
2. Complete Phase 3 (T008 → T009 → T010 → T011, in `FileTree.tsx`)
3. Run Phase 4's manual quickstart pass
4. Ship — there is no smaller independently-valuable slice, and no further phase to layer on afterward

---

## Notes

- [P] tasks touch different files with no dependency between them
- T008–T010 all edit the same function in the same file (`FileTree.tsx`) and are listed sequentially for that reason, not because of a cross-file dependency
- Commit after Phase 2 and again after Phase 3, per project convention (small, reviewable diffs)
- No test tasks: consistent with the rest of this repo's frontend, which has no test runner configured
