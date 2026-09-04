# Feature Specification: Download Single File from File Tree

**Feature Branch**: `036-file-tree-download`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Aggiungere un'azione \"Scarica\" nel menu contestuale di ogni singolo file nel file tree (accanto a Elimina), analoga alla \"Download zip\" già presente per le cartelle. Oggi il link di download del singolo file (/api/file/download) esiste ma è raggiungibile solo aprendo il file nell'editor, e solo quando il file è di un tipo non modificabile (stato \"unsupported\" in FileEditor.tsx) — per i file di testo/markdown/CSV aperti in editing non esiste alcun modo di scaricarli come file grezzo. La nuova azione nel menu del file deve permettere di scaricare qualsiasi singolo file (di qualunque tipo, editabile o no) direttamente dal file tree, senza doverlo prima aprire, riusando l'endpoint di download già esistente."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Download any file directly from the file tree (Priority: P1)

A user browsing the file tree wants a copy of a specific file on their device. Today they can only get one if the file happens to be a type the built-in editor can't open — for anything editable (text, Markdown, CSV, ...) there is no way to obtain the raw file at all. The user needs a "Download" action next to each file in the tree, working the same way regardless of the file's type, without first having to open it.

**Why this priority**: This is the entire gap being closed — without it, downloading an editable file is impossible, and downloading even an unsupported one requires an indirect, undiscoverable detour through the editor pane.

**Independent Test**: Can be fully tested by right-clicking (or opening the row menu of) any file in the tree — an editable text file and a binary/unsupported file — and confirming a "Download" action is present and produces the file on the user's device, without opening the file first.

**Acceptance Scenarios**:

1. **Given** the file tree, **When** the user opens the row menu for an editable file (e.g. a Markdown or CSV file) they have not opened, **Then** they see a "Download" action that downloads that file's current saved content to their device.
2. **Given** the file tree, **When** the user opens the row menu for a file of a type the editor can't open (e.g. a PDF or image), **Then** they see the same "Download" action, working the same way as for editable files.
3. **Given** a file the user has open in the editor with unsaved changes, **When** they download that same file from the file tree's row menu, **Then** the downloaded content is the file's last-saved content, not the unsaved in-editor edits.
4. **Given** the file tree, **When** the user compares the "Download" action on a file row to the existing "Download zip" action on a folder row, **Then** both are reached the same way (the row's menu) and behave analogously — one file, one download.

---

### Edge Cases

- What happens when the user downloads a file that natively renders in the browser (e.g. a PDF or image)? It follows the existing single-file retrieval behavior already in place (opens in a new browser tab rather than forcing a download) — this feature only adds the entry point in the file tree, it does not change what retrieval does for a given file type.
- What happens when the file is deleted or moved by someone else between opening the row menu and clicking "Download"? The action fails with a clear error rather than downloading stale or empty content, consistent with how other file-tree actions (e.g. delete) already handle a target that's no longer there.
- What happens when the user has no permission to read the target file (e.g. an expired session where one is required)? The action fails with the same access error the existing single-file retrieval already returns, rather than silently downloading nothing.
- What happens for an empty file? A zero-byte file downloads successfully, matching how the existing retrieval endpoint already treats empty content.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The file tree MUST offer a "Download" action in each individual file row's action menu, alongside the existing "Delete" action.
- **FR-002**: The "Download" action MUST be available for every file in the tree regardless of file type — both types the built-in editor can open (text, Markdown, CSV, ...) and types it cannot.
- **FR-003**: Triggering "Download" MUST NOT require the file to first be opened in the editor pane.
- **FR-004**: Triggering "Download" MUST retrieve the file's current saved content, using the same single-file retrieval capability the editor pane already uses for unsupported file types — no separate or duplicate retrieval path.
- **FR-005**: For a file whose type the browser can natively render, triggering "Download" from the file tree MUST behave the same as the existing single-file retrieval (open in a new browser tab); for other types, it MUST download to the user's device — this feature does not change that existing type-based behavior, only where it can be triggered from.
- **FR-006**: If the file is unreadable at download time (deleted, moved, or access denied), the action MUST fail with a clear error rather than downloading empty or incorrect content.
- **FR-007**: The "Download" action's placement and interaction pattern in the file row menu MUST be consistent with the existing "Download zip" action already offered in the folder row menu.

### Key Entities

- **File row action menu**: The per-file contextual menu in the file tree, which today offers only "Delete"; this feature adds "Download" to it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can download any single file (editable or not) directly from the file tree in one action, without opening it first.
- **SC-002**: 100% of files shown in the tree — regardless of type — offer a working "Download" action from their row menu.
- **SC-003**: A downloaded editable file's content is byte-for-byte identical to that file's last-saved content in storage.

## Assumptions

- "Download" reuses the existing single-file retrieval endpoint and its established type-based behavior (native-render types open in a new tab; other types download) rather than introducing new retrieval logic or a new behavior distinction.
- No change is made to the folder-level "Download zip" action or to how the editor pane's existing download link behaves for unsupported files; this feature only adds a second, more direct entry point at the file-row level.
- No change is made to file-level permissions — "Download" is subject to whatever read access already governs the existing single-file retrieval endpoint.
