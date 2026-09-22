---

description: "Task list for BPMN Diagram Viewer"

---

# Tasks: BPMN Diagram Viewer

**Input**: Design documents from `/specs/043-bpmn-viewer/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/bpmn-editor-ui.md](contracts/bpmn-editor-ui.md), [quickstart.md](quickstart.md)

**Tests**: No automated test tasks are included because the feature specification requests browser walkthrough validation and the project has no automated test runner. Lint/build and the feature quickstart are included in the final phase.

**Organization**: Tasks are grouped by user story so the diagram viewer, XML mode, and visual modeler can be delivered incrementally without changing the storage contract.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel with other tasks in the same phase without sharing incomplete files.
- **[Story]**: Maps the task to a user story from `spec.md`.

## Path Conventions

Single Next.js project under `frontend/`; feature design artifacts live under `specs/043-bpmn-viewer/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the selected BPMN viewer dependency and its lockfile entry.

- [X] T001 Add pinned `bpmn-js` version `18.28.0` to `frontend/package.json` and update `frontend/package-lock.json` using the repository's npm workflow.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the browser-only viewer boundary and required styles before wiring it into the editor.

**⚠️ CRITICAL**: User story work depends on this phase.

- [X] T002 [P] Add the required BPMN diagram and font stylesheet imports to `frontend/app/globals.css`, keeping the existing global styles and CSS names intact.
- [X] T003 Create the browser-only viewer wrapper in `frontend/app/files/BpmnViewer.tsx` with a ref-owned container, mount-only viewer lifecycle, XML import handling, fit-to-viewport on success, cleanup on unmount, and typed success/warning/error callbacks.

**Checkpoint**: The dependency and isolated viewer wrapper exist; no file type behavior has changed yet.

---

## Phase 3: User Story 1 - View a BPMN diagram (Priority: P1) 🎯 MVP

**Goal**: Opening a valid `.bpmn` file displays a graphical BPMN diagram with viewport controls while preserving all existing file access behavior.

**Independent Test**: Open a valid `.bpmn` file from the file browser and confirm nodes, labels, flows, fit-to-view, zoom, and pan are usable.

### Implementation for User Story 1

- [X] T004 [US1] Extend `EditorSession.kind` and `deriveKind()` in `frontend/app/files/FileEditor.tsx` to classify `.bpmn` paths case-insensitively as `bpmn`, while leaving all existing kinds unchanged.
- [X] T005 [US1] Add the BPMN diagram rendering branch in `frontend/app/files/FileEditor.tsx`, passing `session.currentContent` to `BpmnViewer`, defaulting a newly opened BPMN session to Diagram mode, and showing localized import errors without mutating XML content.
- [X] T006 [P] [US1] Add typed BPMN viewer labels and import-error messages to `frontend/lib/i18n/dictionaries/types.ts` and translate the new entries in `frontend/lib/i18n/dictionaries/en.ts`, `frontend/lib/i18n/dictionaries/it.ts`, `frontend/lib/i18n/dictionaries/es.ts`, `frontend/lib/i18n/dictionaries/de.ts`, `frontend/lib/i18n/dictionaries/fr.ts`, and `frontend/lib/i18n/dictionaries/ru.ts`.
- [X] T007 [US1] Add responsive viewer-container styling and accessible status presentation in `frontend/app/files/BpmnViewer.tsx` or the existing editor styling path, ensuring narrow screens retain usable fit, zoom, and pan behavior.

**Checkpoint**: User Story 1 is independently testable with a valid BPMN sample and no XML edit required.

---

## Phase 4: User Story 2 - Inspect or edit BPMN XML (Priority: P2)

**Goal**: Owners can switch between the rendered diagram and the current editable XML while retaining existing dirty, save, and external-change behavior.

**Independent Test**: Open a BPMN file, switch to XML, change a task label, switch back to Diagram, confirm the updated label renders, save, and reload.

### Implementation for User Story 2

- [X] T008 [US2] Extend the mode-switch controls in `frontend/app/files/FileEditor.tsx` so BPMN files expose Diagram/XML buttons with a visible selected state while Markdown, CSV, and HTML retain their existing Preview/Edit behavior.
- [X] T009 [US2] Route BPMN XML mode through `PlainTextEditor` in `frontend/app/files/FileEditor.tsx`, keeping `handleContentChange`, dirty detection, save, reload, before-unload protection, and external-change handling as the single content path.
- [X] T010 [US2] Re-import `session.currentContent` whenever BPMN Diagram mode is entered or XML changes are applied in `frontend/app/files/BpmnViewer.tsx` and `frontend/app/files/FileEditor.tsx`, preserving invalid unsaved XML and allowing recovery through XML mode.
- [X] T011 [US2] Ensure BPMN mode transitions reset only transient import/viewport state and do not reset `loadedContent`, `currentContent`, ETag, save state, or conflict state in `frontend/app/files/FileEditor.tsx`.

**Checkpoint**: User Stories 1 and 2 work together; valid edits render and save, while invalid XML remains recoverable.

---

## Phase 5: User Story 3 - Visually edit a BPMN diagram (Priority: P1)

**Goal**: Owners can edit a BPMN diagram in a responsive modal, apply the exported XML to the main editor, and persist it through the existing Save action.

**Independent Test**: Open a valid BPMN file, modify it in the modeler, apply, save, reload, and confirm the change persists; close with unapplied changes and confirm discard protection.

### Implementation for User Story 3

- [X] T012 [US3] Create `frontend/app/files/BpmnModelerDialog.tsx` using `bpmn-js/lib/Modeler`, with import from the supplied XML, standard modeling controls, responsive modal layout, cleanup on close, and localized import/export errors.
- [X] T013 [US3] Add modeler change tracking and `Apply`/`Cancel` callbacks in `frontend/app/files/BpmnModelerDialog.tsx`; Apply must call `saveXML` and return XML without writing to storage, while Cancel/close confirms discard when the modal has unapplied changes.
- [X] T014 [US3] Add the `Modify diagram` action and modal state to `frontend/app/files/FileEditor.tsx`, pass `session.currentContent` into the modeler, route applied XML through `handleContentChange`, and keep the existing main Save action as the only persistence path.
- [X] T015 [P] [US3] Add typed modeler labels, confirmation messages, and import/export errors to `frontend/lib/i18n/dictionaries/types.ts` and all supported dictionaries under `frontend/lib/i18n/dictionaries/`.
- [X] T016 [US3] Add accessible focus, Escape/close handling, fullscreen mobile layout, and modal styling in `frontend/app/files/BpmnModelerDialog.tsx` without changing the existing ShareDialog behavior.

**Checkpoint**: User Stories 1, 2, and 3 work together; visual changes are applied to the editor and saved only through the main Save action.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete feature and protect existing editor behavior.

- [X] T017 [P] Run `npm run lint` from `frontend/` and resolve any TypeScript, import, CSS, or accessibility issues caused by the BPMN integration.
- [ ] T018 [P] Run `npm run build` from `frontend/` and resolve any server-rendering, bundling, or client-only dependency issues.
- [ ] T019 Execute all scenarios in `specs/043-bpmn-viewer/quickstart.md` with valid, malformed, empty, edited, modeler-applied, and externally changed BPMN files, and verify Markdown, CSV, HTML, Python, and plain-text behavior remains unchanged.
- [X] T020 Review the final diff against `specs/043-bpmn-viewer/spec.md`, `plan.md`, `data-model.md`, and `contracts/bpmn-editor-ui.md`; update comments or documentation only if the implementation reveals a behavior mismatch.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 must complete before the viewer can be imported.
- **Foundational (Phase 2)**: T002 and T003 depend on T001 and block user stories.
- **User Story 1 (Phase 3)**: T004-T007 depend on the foundational phase; T005 depends on T003 and T004.
- **User Story 2 (Phase 4)**: T008-T011 depend on User Story 1's editor classification and viewer branch.
- **User Story 3 (Phase 5)**: T012-T016 depend on User Stories 1 and 2 because the modal applies XML through the established editor session.
- **Polish (Phase 6)**: T017-T020 run after the desired user stories are complete.

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Setup and Foundational phases.
- **User Story 2 (P2)**: Depends on User Story 1 because it adds mode switching around the BPMN rendering branch, but it does not change storage or API behavior.
- **User Story 3 (P1)**: Depends on User Stories 1 and 2 for the viewer entry point and XML/editor state integration; it does not change storage or API behavior.

### Parallel Opportunities

- T002 and T003 can be prepared in parallel after T001.
- T006 can be prepared in parallel with T005 because it touches only dictionary files.
- T015 can run in parallel with T012-T014 because it touches only dictionary files.
- T017 and T018 can run in parallel after implementation; T019 follows them for browser validation.

## Implementation Strategy

### MVP First

1. Complete T001-T003 to establish the dependency and isolated viewer.
2. Complete T004-T007 for User Story 1.
3. Validate a valid BPMN file independently.
4. Continue with User Story 2 when the viewer path is confirmed.

### Incremental Delivery

1. Deliver the read-only graphical BPMN view.
2. Add Diagram/XML switching and reuse the existing text-edit/save path.
3. Add the standard Modeler modal with Apply/Cancel and main-editor Save integration.
4. Run lint, build, and the complete quickstart validation.

## Notes

- No commit or remote push is part of these tasks.
- `[P]` marks only tasks that touch independent files and have no dependency on incomplete work.
- The feature includes standard visual BPMN modeling in a modal; properties panels, execution, collaboration, and validation tooling are not included.
- The Node runtime is available under `/root/.nvm/versions/node/v24.21.0/bin`; the shell PATH needed to be extended explicitly for npm commands.
- `npx tsc --noEmit`, `npm run lint`, and `git diff --check` pass. `next build` compiles the application but fails in Next's TypeScript config parser with `Could not parse output from TypeScript's --showConfig`; browser quickstart validation was not completed.
