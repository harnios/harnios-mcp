# Data Model: BPMN Diagram Viewer

This feature adds no persisted entities and changes no storage or API schema. It extends the existing browser-only editor session with a BPMN presentation state.

## Editor Session

Existing session object extended as follows:

| Field | Type | Meaning | Persistence |
|---|---|---|---|
| `kind` | existing union plus `bpmn` | Selects the BPMN editor branch for `.bpmn` paths | Browser session only |
| `currentContent` | UTF-8 string | Current XML, including unsaved edits | Browser session until save |
| `loadedContent` | UTF-8 string | Last content confirmed by storage | Browser session until reload/save |
| `saveState` | existing save-state union | Reused unchanged for BPMN saves | Browser session only |
| `externalChange` | existing conflict object | Reused unchanged when storage changes externally | Browser session only |

## BPMN View State

Transient UI state associated with the current `EditorSession`:

| Field | Type | Meaning |
|---|---|---|
| `mode` | `diagram \| xml` for BPMN | Whether the owner sees the rendered diagram or editable XML |
| `importStatus` | `idle \| importing \| rendered \| error` | Current rendering lifecycle status |
| `importMessage` | `string \| null` | Localized recoverable error for the most recent failed import |
| `viewport` | owned internally by viewer | Zoom/pan/fit state; not persisted and may reset on re-import |

## Modeler Modal State

Transient state for the visual editing modal:

| Field | Type | Meaning |
|---|---|---|
| `isOpen` | boolean | Whether the modeler modal is visible |
| `hasUnappliedChanges` | boolean | Whether the modeler has changed since it imported the current XML |
| `exportStatus` | `idle \| exporting \| error` | State of the XML export requested by Apply |
| `exportMessage` | `string \| null` | Localized recoverable export error |
| `modelerInstance` | browser-owned object | Temporary bpmn-js Modeler instance; never persisted |

## State transitions

1. Opening a `.bpmn` path creates a normal editor session with `kind=bpmn` and `mode=diagram`.
2. Entering diagram mode imports `currentContent`.
3. Successful import sets `importStatus=rendered`; it does not change `currentContent`, `loadedContent`, or dirty state.
4. Failed import sets `importStatus=error`; it preserves `currentContent` and allows switching to XML mode.
5. Entering XML mode exposes `currentContent` through the existing text editor.
6. Editing XML changes only `currentContent`, making the session dirty when it differs from `loadedContent`.
7. Returning to diagram mode imports the current unsaved `currentContent`.
8. Saving follows the existing `PUT /api/file` path; on success, `loadedContent` and the ETag advance and dirty state clears.
9. External changes follow the existing ETag conflict transitions; no BPMN-specific overwrite is permitted.
10. Opening visual editing creates a temporary modeler session from `currentContent`.
11. Modeler commands update only the modal's internal diagram state and set `hasUnappliedChanges`.
12. Apply exports XML; on success it calls the editor's existing content-change path, closes the modal, and makes the main editor dirty.
13. The main Save action persists the applied XML through the existing file API.
14. Cancel/close with `hasUnappliedChanges=true` requires explicit discard confirmation; cancel/close while clean destroys the modeler without changing editor content.

## Validation rules

- Classification is based on the `.bpmn` extension, case-insensitively.
- The diagram mode accepts only the current file content as XML text.
- Empty, malformed, non-BPMN, and unrenderable BPMN content must result in a recoverable error, never silent data replacement.
- No viewer state is persisted to storage.
- No modeler state is persisted; only XML returned by a successful Apply enters `currentContent`.
