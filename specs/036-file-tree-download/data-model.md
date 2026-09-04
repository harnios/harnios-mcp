# Phase 1 Data Model: Download Single File from File Tree

This feature adds a client-side action to an existing UI; it introduces no new persisted entity, storage schema, or server-side model. The only "entity" is the existing UI element the spec names:

## File row action menu (existing, extended)

Already defined per file in `DirectoryNode`'s render of `entries.files` (`FileTree.tsx`). Each row already carries:

| Field | Source | Used by this feature |
|---|---|---|
| `path` | `entries.files[].path` (from the directory listing) | Passed as the `path` query param to `/api/file/download`, exactly as the editor pane's existing unsupported-file link already does. |
| menu items | Array literal passed to `RowMenu` | Gains one new item, `{ label: dict.menuDownload, icon: <DownloadIcon />, onClick: () => handleDownloadFile(f.path) }`, alongside the existing `Delete` item. |

No new field is added to the directory-listing response or to any stored record — `size` and `lastModified` (already returned) are not needed by this action.

## Transient client state (not persisted)

- `busy` (existing per-`DirectoryNode` state) is reused to disable the row menu's actions, including the new `Download`, while a request is in flight — the same guard already used for delete/upload/zip-download.
- No new client-side state is introduced beyond a local `try/catch` around the fetch, matching `handleDownloadFolder`'s existing shape.

## Relationship to spec 028's `readFile` model

This feature calls the already-existing `/api/file/download` route, which itself calls `readFile(path)` (`frontend/lib/storage/files.ts`) and classifies the result via `isNativelyRenderable(path)` (`frontend/lib/storage/fileTypes.ts`). Both are consumed as-is; neither is modified by this feature (spec Assumptions).
