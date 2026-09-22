# Implementation Plan: BPMN Diagram Viewer

**Branch**: `043-bpmn-viewer` | **Date**: 2026-09-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/043-bpmn-viewer/spec.md`

## Summary

Add graphical rendering and visual editing for stored `.bpmn` files while preserving the existing XML editing and saving workflow. The implementation uses the bpmn.io `bpmn-js` viewer and Modeler as browser-only components, classifies BPMN files as a dedicated editor kind, and exposes Diagram/XML modes plus a responsive Modeler modal. The modal applies exported XML to the existing in-memory editor session; only the main Save action persists it. Failed imports/exports preserve the XML or open modeler state and show recoverable errors.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19, Next.js 16 App Router

**Primary Dependencies**: Existing SWR/editor components; `bpmn-js` 18.28.0 for BPMN 2.0 viewing; existing CodeMirror/plain-text editor path for XML editing

**Storage**: Existing S3-backed storage and `/api/file` contract remain unchanged. BPMN content continues to be fetched and saved as UTF-8 text.

**Testing**: Existing project has no automated test runner. Validate with `npm run lint`, `npm run build`, and the feature-specific browser walkthrough in [quickstart.md](quickstart.md), including valid, malformed, empty, edited, and externally changed BPMN files.

**Target Platform**: Authenticated web editor in modern desktop and mobile browsers; rendering must remain client-only because the viewer requires browser DOM/SVG APIs.

**Project Type**: Single Next.js web application under `frontend/`.

**Performance Goals**: For BPMN XML up to 5 MB, diagram rendering should become visible within 3 seconds after file content is available in at least 95% of acceptance walkthrough opens on a normal development connection.

**Constraints**: Do not introduce BPMN execution, a properties panel, collaboration service, or a new backend endpoint. Do not execute uploaded BPMN/XML as HTML or script. Preserve existing dirty-state, save, ETag conflict, deep-link, authorization, and non-BPMN editor behavior.

**Scale/Scope**: One currently open BPMN file per editor session; diagrams up to 5 MB for the v1 acceptance target; two display modes (Diagram and XML); no collaborative modeling.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The repository constitution is still the unfilled Spec Kit template and defines no ratified project principles or mandatory gates. No constitution violation is introduced by this plan.

## Project Structure

### Documentation (this feature)

```text
specs/043-bpmn-viewer/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── bpmn-editor-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md                 # created later by $speckit-tasks
```

### Source Code (repository root)

```text
frontend/
├── app/files/
│   ├── FileEditor.tsx       # add bpmn kind, Diagram/XML wiring, and modeler modal state
│   ├── BpmnViewer.tsx       # browser-only viewer wrapper
│   └── BpmnModelerDialog.tsx# browser-only visual modeler modal
├── lib/i18n/dictionaries/
│   ├── types.ts             # new BPMN labels/errors in the file editor slice
│   └── *.ts                 # translations for all supported languages
├── package.json             # add pinned bpmn-js dependency
└── package-lock.json        # lock dependency graph
```

**Structure Decision**: Keep the feature inside the existing file editor. `FileEditor` owns session content, dirty state, save, and conflict handling; `BpmnViewer` owns read-only rendering; `BpmnModelerDialog` owns only the temporary visual editing lifecycle and XML export. No API, storage, route, or new page is required.

## Implementation Design

### Editor state and rendering

- Extend `EditorSession.kind` and `deriveKind()` with `bpmn` for paths ending in `.bpmn`, case-insensitively.
- Keep the existing `mode` state for all preview-capable editors and interpret it as `diagram`/`xml` for BPMN, while retaining current labels and behavior for Markdown, CSV, and HTML.
- Add a dedicated `BpmnViewer` client component. It receives the current XML and an `onImportError`/status callback, creates one viewer instance in an effect, imports XML whenever the XML or component path changes, fits the viewport after successful import, and destroys the instance on cleanup.
- Render the viewer only when BPMN mode is active. Render `PlainTextEditor` in XML mode so existing `handleContentChange`, dirty detection, save, external reload, and before-unload protection remain the single source of truth.
- Clear a previous viewer error before each import. On import failure, keep the current XML untouched, display a localized error, and leave the user able to switch to XML mode.
- Add a `BpmnModelerDialog` modal opened from Diagram mode. It imports `session.currentContent` into `bpmn-js/lib/Modeler`, exposes the standard palette/modeling controls, tracks whether the modeler has changed, and calls `onApply(xml)` only after successful `saveXML`.
- On Apply, call the existing `handleContentChange(xml)` and close the modal; do not call the storage API from the modal. The main Save button remains the only persistence action.
- On Cancel, close immediately when clean; when dirty, require explicit discard confirmation. On import/export failure, keep the modal open and preserve the current modeler state where the library permits.

### Styling and dependency integration

- Add the bpmn-js viewer package at version `18.28.0`, which is the latest version verified during planning.
- Include the viewer’s required diagram and BPMN font styles in the frontend’s global styling path, scoped so the existing editor styles are unaffected.
- Give the viewer a bounded responsive container with a minimum usable height, horizontal/vertical overflow behavior supplied by the viewer, and a visible error state that does not collapse the editor layout.
- Keep the dependency out of server components and server bundles; the wrapper must only instantiate it after mount in the browser.

### Localization and compatibility

- Add typed dictionary entries for Diagram, XML, BPMN import failure, and any accessible viewer status text to the existing `editor.file` dictionary slice.
- Mirror the entries in all supported dictionaries (`en`, `it`, `es`, `de`, `fr`, `ru`), preserving the repository’s current translation shape.
- Do not change `/api/file`, storage file types, file download behavior, file sharing, or the rendering path for other extensions. The modeler uses the existing in-memory content and save path.

### Validation and failure handling

- Validate a representative BPMN 2.0 process containing start/end events, tasks, gateways, sequence flows, labels, and lanes/pools if supported by the sample.
- Validate malformed XML, empty content, unsupported extension elements, and a syntactically valid XML document that is not a BPMN diagram.
- Verify switching modes with valid and invalid unsaved XML does not lose text or falsely clear dirty state.
- Verify existing external-change behavior while the BPMN file is in either mode.

## Complexity Tracking

Not applicable. The change adds one isolated client viewer and does not introduce a new service, data store, API, or architectural layer.
