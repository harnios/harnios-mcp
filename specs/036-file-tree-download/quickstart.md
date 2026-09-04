# Quickstart: Validate "Download" from the File Tree

## Prerequisites

- App running locally with the file storage backend reachable (see repo root setup — `docker compose up` for the storage dependency, per project convention).
- An owner session (the `Files` page and `/api/file/download` both already require one — spec 021/028).
- At least one text/Markdown file and one non-renderable binary file (e.g. a `.zip` or `.docx`) already present in the tree, plus optionally one PDF/JPG/PNG to check the open-in-tab path.

## Scenario 1 — Download an editable file without opening it (US1, AS1)

1. Open `/files`, sign in as owner if prompted.
2. In the tree, find a `.md` or `.txt` file you have **not** clicked to open.
3. Open its row menu (kebab icon) — confirm a `Download` item appears next to `Delete`.
4. Click `Download`.
5. **Expected**: the file downloads to your device; its content matches what `GET /api/file` / the editor would show as that file's last-saved content.

## Scenario 2 — Download a binary/unsupported file the same way (US1, AS2)

1. In the tree, find a file type the editor can't open (e.g. a `.docx` or `.zip`).
2. Open its row menu, click `Download`.
3. **Expected**: same menu item, same click, file downloads — no detour through opening the file first or seeing an "unsupported" message.

## Scenario 3 — Native-render type opens in a new tab, not a forced download (FR-005)

1. Find a `.pdf`, `.jpg`, or `.png` file in the tree.
2. Open its row menu, click `Download`.
3. **Expected**: a new browser tab opens showing the file via the browser's native viewer, matching the existing behavior of the editor pane's "open or download" link for the same file today (spec 028) — it does not silently save to disk.

## Scenario 4 — Downloaded content matches last save, not unsaved edits (AS3)

1. Open a text file in the editor, change its content, but do **not** save.
2. Without saving, go back to the tree and click `Download` on that same file's row.
3. **Expected**: the downloaded file contains the previous saved content, not your unsaved in-editor edit.

## Scenario 5 — Clear failure on a missing/inaccessible file (Edge Cases, FR-006)

1. Trigger `Download` on a file, and (in another tab or via the API directly) delete that same file before the download completes — or simulate a `404`/`502` from `/api/file/download` in a test double.
2. **Expected**: an error message is shown (e.g. an alert), no file is saved, and the row menu re-enables afterward.

## Out of scope to verify here

- Folder `Download zip` — unchanged, already covered by its own existing tests.
- The editor pane's own "open or download" link for unsupported files — unchanged, already covered by spec 028's tests.
