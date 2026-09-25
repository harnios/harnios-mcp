# BPMN Editor UI Contract

## Scope

This contract describes the behavior exposed by the existing file editor when the selected path ends in `.bpmn`. It is a UI contract, not a new HTTP API.

## Inputs

- `path`: the selected stored file path.
- `currentContent`: the current in-memory BPMN XML string.
- `loadedContent` and existing ETag/save state: supplied by the existing editor session.
- Owner authentication and file access: enforced by the existing editor route and file access behavior.

## Create diagram

- Only folder menus for direct child folders of `/processes` expose New BPMN diagram and prompt for a plain file name using the existing folder action pattern. The root, `/processes` itself, deeper descendants, and unrelated folders do not expose it.
- A missing `.bpmn` suffix is added; an existing suffix is kept. Empty, cancelled, or invalid names send no request.
- Creation submits `{ path, content, createOnly: true }` with valid BPMN 2.0 starter XML through the existing `POST /api/file` endpoint. The optional `createOnly` field makes storage creation exclusive and returns HTTP 409 on an existing file; omitted/false retains the endpoint's existing overwrite behavior.
- On success, the folder listing refreshes and the new file opens in Diagram mode. On failure, the folder and selected file remain unchanged and the owner sees an error.

## Modes

| Mode | Visible content | Editable | Expected action |
|---|---|---:|---|
| Diagram | Graphical BPMN process | No | Import current XML and fit the diagram to the available viewport |
| XML | Current BPMN XML text | Yes | Apply text changes through the existing editor change handler |
| Modeler modal | Editable BPMN process | Yes | Export XML with Apply; do not persist directly |

The mode switch must be visible while the BPMN file is open. Diagram mode is the initial mode for a newly opened BPMN file.

The Diagram mode exposes a **Modify diagram** action. It opens a responsive modal containing the standard BPMN modeler palette and controls. The modal has **Apply** and **Cancel** actions.

- **Apply** calls `saveXML`, passes the exported XML to the parent editor's existing content-change handler, marks the main editor dirty, and closes the modal.
- **Cancel/Close** destroys the modeler without changing the parent editor when no modeler changes exist. With unapplied changes, it requires explicit discard confirmation.
- The modal does not call the file API. Only the main editor's Save action persists applied XML.

## Import outcomes

- Success: diagram is visible, viewport is fitted, and existing dirty/save state remains unchanged.
- Warning: diagram is visible; warnings may be surfaced if they materially affect what the owner can inspect.
- Error: a localized recoverable message is shown; the current XML remains available through XML mode; no save or content mutation occurs.
- Modeler export error: a localized recoverable message is shown inside the modal; the modal remains open and no parent editor content is changed.

## Existing behaviors preserved

- Saving remains disabled when the session is clean and uses the existing save action when dirty.
- Switching files or folders with unsaved XML uses the existing discard confirmation.
- ETag conflicts use the existing external-change banner and reload/keep-mine actions.
- Deep links, owner authentication, sharing, and download actions continue to use their existing paths.

## Accessibility and responsive behavior

- Mode controls are buttons with localized accessible names and a visible selected state.
- Import failures are presented as readable status text, not only color or console output.
- The diagram container remains usable on narrow screens through fit-to-view, zoom, and pan.
- The modeler modal uses the full available viewport on narrow screens and keeps its palette, canvas, Apply, and Cancel controls reachable.
