# Contract: File Row "Download" Action

This feature adds no new server route and changes no existing one. It adds one new client-side trigger — a menu item on each file row — that calls the already-specified `GET /api/file/download` route documented in full in [`specs/028-file-storage-upload/contracts/file-retrieval-contract.md`](../../028-file-storage-upload/contracts/file-retrieval-contract.md#get-apifiledownload-new-route). That contract (request shape, response codes, disposition-by-type rules) is unchanged and not repeated here.

## Trigger

**Where**: The per-file `RowMenu` in `FileTree.tsx`'s `DirectoryNode`, alongside the existing `Delete` item.

**Label/icon**: `dict.menuDownload` / `DownloadIcon` (already used for the folder row's `Download zip` item).

**Precondition**: None beyond the row already existing in the directory listing — no prior "open" step (FR-003).

## Client behavior on click

1. Disable the row's menu (existing `busy` state) for the duration of the request.
2. `authedFetch(`/api/file/download?path=${encodeURIComponent(path)}`)`.
3. **Non-OK response** (`404`, `502`, or a 401 already redirected by `authedFetch`): parse the JSON `message` if present and show it via the same `window.alert` pattern the row's `Delete`/the folder's `Download zip` action already use (FR-006). No file is saved.
4. **OK response**: read the body as a `Blob`.
   - If `isNativelyRenderable(path)` (client-side, mirrors the server's own classification): `window.open(URL.createObjectURL(blob), "_blank")` — opens in a new tab, matching the editor pane's existing behavior for the same file types (FR-005).
   - Otherwise: create a detached `<a>` with `href` set to the object URL and `download` set to the file's base name, click it programmatically, then remove it — forces a save to disk (FR-005).
5. Revoke the object URL once handed off (`URL.revokeObjectURL`), whether opened in a tab or downloaded.
6. Re-enable the row's menu.

## Out of scope for this contract

- Any change to `/api/file/download` itself, or to `GET /api/file`, `POST /api/upload`, or `/api/download-zip` — all unchanged.
- Any change to the editor pane's existing "open or download" link for unsupported files — it keeps working exactly as before; this action is an additional, independent entry point to the same underlying route.
