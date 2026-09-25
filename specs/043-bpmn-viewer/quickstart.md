# Quickstart: Validate BPMN Diagram Viewer

## Prerequisites

- Node.js and npm available.
- Project storage configured and running as described in the repository README.
- An authenticated owner session.
- A valid BPMN 2.0 sample containing events, tasks, a gateway, flows, and labels.
- A malformed BPMN sample and an empty `.bpmn` file.

## Prepare and run

From the repository root:

```bash
cd frontend
npm install
npm run lint
npm run build
npm run dev
```

Open `/files` in a browser and sign in as the owner.

## Scenario 1: Render a valid BPMN file

1. Upload or select the valid `.bpmn` file.
2. Confirm the editor opens in Diagram mode.
3. Confirm nodes, labels, sequence flows, and the overall layout are visible.
4. Use fit-to-view, zoom, and pan; confirm the diagram remains inspectable.
5. Reload the deep link for the same file; confirm Diagram mode opens again.

Expected result: the diagram is visible without reading raw XML and the file remains protected by the existing owner session.

## Scenario 2: Switch to XML and save

1. Open the valid BPMN file in Diagram mode.
2. Switch to XML mode and change a visible task label without breaking the XML.
3. Switch back to Diagram mode; confirm the updated label appears.
4. Confirm the editor shows unsaved changes, save, reload, and confirm the change persists.

Expected result: the viewer uses current unsaved XML and saving uses the existing file workflow.

## Scenario 3: Recover from invalid XML

1. Open the malformed or empty `.bpmn` file.
2. Confirm a clear error is shown and no misleading blank diagram is presented.
3. Switch to XML mode and confirm the original content is still available.
4. Correct the XML, return to Diagram mode, and confirm rendering succeeds.

Expected result: rendering failure never discards or overwrites the XML.

## Scenario 4: Preserve conflict and non-BPMN behavior

1. Open a BPMN file in XML mode, make an unsaved edit, and change the same file through another authorized session or existing storage path.
2. Confirm the external-change banner appears and local XML edits remain untouched.
3. Open Markdown, CSV, HTML, Python, and plain-text files and verify their existing preview/edit behavior is unchanged.

Expected result: BPMN rendering is a presentation mode only and does not alter shared editor guarantees.

## Scenario 5: Visually edit and apply a BPMN diagram

1. Open a valid BPMN file in Diagram mode.
2. Select **Modify diagram** and confirm the responsive modeler modal opens.
3. Add a task, connect it to an existing flow, and change its label; verify undo/redo works.
4. Select **Apply** and confirm the modal closes, the main editor shows unsaved changes, and the updated diagram is visible.
5. Select **Save**, reload the file, and confirm the visual changes persist.
6. Reopen the modeler, make a change, then close it without applying; confirm a discard confirmation appears and choosing discard leaves the main editor content unchanged.

Expected result: visual changes flow through Apply into the existing editor session and are persisted only by the main Save action.

## Scenario 6: Recover from modeler errors

1. Open malformed or non-BPMN XML in a `.bpmn` file and select **Modify diagram**.
2. Confirm the modal shows a recoverable import error and does not replace the XML.
3. If export fails after a modeling action, confirm the modal remains open and the parent editor content is unchanged.

Expected result: modeler failures do not lose or silently persist content.

## Scenario 7: Create a BPMN diagram

1. In the menu of `/processes/example`, choose **New BPMN diagram** and enter `new-process`.
2. Confirm `new-process.bpmn` appears and opens in Diagram mode without an import error.
3. Open Modify diagram, add a task, Apply and Save; reload to confirm it persists.
4. Attempt to create `new-process.bpmn` again and confirm the original file is unchanged.
5. Cancel the name prompt and confirm no file is created.
6. Confirm the action is absent from `/`, `/processes`, `/processes/example/subfolder`, and an unrelated folder.

## Validation record

Record the browser, sample file size, rendering time after content availability, and pass/fail result for each scenario. The v1 target is rendering within 3 seconds for valid files up to 5 MB in at least 95% of repeated acceptance opens.
