# Phase 0 Research: Download Single File from File Tree

No `NEEDS CLARIFICATION` markers remain in the Technical Context — this feature reuses existing, already-shipped infrastructure end to end. The items below record the decisions made while confirming that reuse rather than resolving open unknowns.

## 1. Which retrieval endpoint to call

**Decision**: Reuse the existing `GET /api/file/download?path=` route unchanged (spec 028).

**Rationale**: It already implements exactly the behavior FR-004/FR-005 require — reads the current saved bytes, returns `inline` disposition with the real content type for the natively-renderable set (PDF, JPG/JPEG, PNG per `isNativelyRenderable`), and `attachment` + forced `application/octet-stream` for everything else (deliberate stored-XSS mitigation, per its own doc comment). It is already the same endpoint the editor pane's existing "open or download" link uses for unsupported files, so calling it from the file tree row introduces no new server-side code path — only a new client-side entry point.

**Alternatives considered**: A new endpoint scoped to the file tree — rejected, it would duplicate the type/disposition logic FR-005 requires to stay identical to the existing behavior, and FR-004 explicitly rules out a separate retrieval path.

## 2. Client-side download mechanics

**Decision**: Follow the folder row's existing `handleDownloadFolder` pattern — `authedFetch` the endpoint, branch on `res.ok`, then hand the response to the browser — rather than a bare `<a href>` link (which is what the editor pane's unsupported-file link currently uses).

**Rationale**: `authedFetch` (`frontend/lib/editorFetch.ts`) is what already gives the file tree's other actions (delete, folder zip download) their FR-006 behavior: a session-expiry 401 redirects to sign-in instead of dumping a bare error page, and a non-OK response's JSON `message` can be surfaced via the same `window.alert` pattern already used for delete/zip failures. A plain anchor tag can't intercept the response to do either. This keeps the new action consistent with its sibling actions in the same menu (delete, download zip), rather than with the editor pane's simpler link — which the spec's Assumptions section explicitly leaves unchanged.

**Handling FR-005 (open vs. save)**: Once the response is in hand as a blob, the client checks the same `isNativelyRenderable(path)` predicate (`frontend/lib/storage/fileTypes.ts`) already used elsewhere in this file's imports:
  - Renderable → `window.open(objectUrl, "_blank")`, so it opens in a new tab like the editor pane's existing link does today.
  - Otherwise → a temporary `<a>` with a `download` attribute (the same trick `handleDownloadFolder` uses for the zip), which forces a save even though the server already sends `attachment` — needed because once content is fetched as a blob, only the `download` attribute (not the server header) controls the browser's save-vs-navigate behavior.

Either way, the object URL is revoked after use, matching the existing zip-download cleanup.

**Alternatives considered**: Reusing the editor pane's plain `<a target="_blank">` link as-is — rejected because it does not give FR-006's clear-error requirement (a 404/403 would just render as raw JSON in a new tab) and does not go through the app's existing 401→sign-in redirect.

## 3. Menu placement

**Decision**: Add a `Download` entry to the same `RowMenu` items array already rendered per file row in `FileTree.tsx` (`DirectoryNode`'s file-row `RowMenu`, alongside the existing `Delete` entry) — no new UI component.

**Rationale**: FR-001/FR-007 ask for it in the existing per-file action menu, positioned the same way the folder row already offers `Download zip` next to its other actions. `RowMenu`/`MenuItem` already support non-destructive entries with an icon (used for every folder-row action), so `DownloadIcon` (already imported in this file for the folder's zip action) can be reused as-is.

**Alternatives considered**: A toolbar button shown only when a file is selected — rejected, it would be a second, inconsistent interaction pattern next to the tree's existing per-row menus, and would not satisfy FR-003 (no need to first select/open the file) as directly as a menu item on the row itself.
