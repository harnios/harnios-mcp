# Files

The `/files` page is a full read/write editor for everything stored in your OS — the exact same
content a connected assistant reads and writes through its file tools. Nothing here is separate
from what an assistant sees.

- **Browsing**: a folder tree on the side; select a file to open it.
- **Editing**: Markdown files open with a live preview alongside the raw editor; CSV files open as
  a scrollable table; other text files open in a plain editor. Changes save back to storage.
- **Creating and deleting**: new files and folders can be created from the tree; deleting a file
  moves it to a `Trash` folder (a safety net) rather than destroying it immediately — deleting
  something already inside `Trash` removes it for good.
- **Uploading**: files can be uploaded directly from your device instead of being created by hand.
- **Deep links**: a specific file's URL can be shared or bookmarked and reopens straight to that
  file.
- **Staying in sync**: if the same file changes elsewhere (e.g. an assistant edits it while you
  have it open), the editor lets you know instead of silently overwriting your changes.

Unlike the rest of the app, `/files` has its own header instead of the shared top menu, so there's
more room for the file tree and editor.
