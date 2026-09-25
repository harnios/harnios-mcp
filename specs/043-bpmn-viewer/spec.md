# Feature Specification: BPMN Diagram Viewer

**Feature Branch**: `043-bpmn-viewer`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Vorrei aggiungere la possibilità di mostrare file bpmn.io; c'è una libreria?"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View a BPMN diagram (Priority: P1)

As an authenticated owner browsing stored files, I want a `.bpmn` file to open as a graphical process diagram so that I can understand the workflow without reading raw XML.

**Why this priority**: Graphical viewing is the core value of the feature and makes the already-supported BPMN files useful for day-to-day inspection.

**Independent Test**: Open a valid `.bpmn` file from the file browser and confirm that its process elements, connections, labels, and layout are visible in the editor area.

**Acceptance Scenarios**:

1. **Given** a valid BPMN file is stored and the owner is signed in, **When** the owner opens it, **Then** the file is shown as a graphical diagram rather than only as raw XML.
2. **Given** a diagram is displayed, **When** the owner views a diagram larger or smaller than the available area, **Then** the owner can inspect it using fit-to-view, zoom, and pan interactions.
3. **Given** a BPMN file is opened through a deep link, **When** the editor loads, **Then** the same graphical diagram is displayed without requiring the owner to select the file again.

### User Story 2 - Inspect or edit BPMN XML (Priority: P2)

As an authenticated owner, I want to switch from the diagram to the existing XML editor so that I can inspect or make text-level changes when needed.

**Why this priority**: XML editing preserves the existing capability and provides a practical fallback for changes that are not supported by a visual viewer.

**Independent Test**: Open a BPMN file, switch to XML mode, change its text, switch back to diagram mode, and confirm that the updated valid diagram is shown and can be saved.

**Acceptance Scenarios**:

1. **Given** a BPMN diagram is displayed, **When** the owner selects XML mode, **Then** the current BPMN XML is shown in the existing editable text interface.
2. **Given** the owner has changed valid BPMN XML, **When** the owner returns to diagram mode, **Then** the diagram reflects the updated XML and the file is marked as having unsaved changes.
3. **Given** the owner has unsaved XML changes, **When** the owner saves the file, **Then** the updated XML is persisted using the existing file-saving behavior and the unsaved indicator clears.

### User Story 3 - Visually edit a BPMN diagram (Priority: P1)

As an authenticated owner, I want to open a BPMN modeler in a modal window so that I can create and rearrange process elements visually instead of editing XML by hand.

**Why this priority**: Visual modeling is the main productivity benefit of BPMN support and builds directly on the graphical viewer.

**Independent Test**: Open a valid `.bpmn` file, choose visual editing, add or modify a task, apply the changes, save the file, and reload it to confirm the diagram persists.

**Acceptance Scenarios**:

1. **Given** a valid BPMN diagram is displayed, **When** the owner chooses visual editing, **Then** a responsive modal opens with the BPMN modeler loaded from the current in-memory XML.
2. **Given** the modeler is open, **When** the owner creates, moves, connects, or relabels BPMN elements, **Then** the changes are visible in the modal and can be undone or redone using the modeler's standard controls.
3. **Given** the owner has completed visual changes, **When** the owner selects Apply, **Then** the modeler exports updated BPMN XML, the modal closes, the main editor contains that XML, and the file is marked as having unsaved changes.
4. **Given** the main editor contains applied modeler changes, **When** the owner selects Save, **Then** the existing file-saving flow persists the updated XML.
5. **Given** the modeler has unapplied changes, **When** the owner tries to close or cancel the modal, **Then** the owner is asked to confirm discarding those modal-only changes.

### User Story 4 - Create a BPMN diagram (Priority: P1)

As an authenticated owner browsing a process folder at `/processes/<process>`, I want to create a new BPMN diagram there and start editing it without supplying XML.

**Independent Test**: Create a diagram from a `/processes/<process>` folder menu, open it in Diagram mode, add a task in the Modeler, apply and save, then reload the file. Confirm the action is absent elsewhere.

**Acceptance Scenarios**:

1. **Given** a folder exactly one level below `/processes`, **When** the owner selects New BPMN diagram and enters a name, **Then** a `.bpmn` file containing a valid starter process is created in that folder and opens in Diagram mode.
2. **Given** the entered name already ends in `.bpmn`, **When** the diagram is created, **Then** the extension is not duplicated.
3. **Given** a file of the chosen name already exists, **When** the owner tries to create the diagram, **Then** the existing file is preserved and a clear error is shown.
4. **Given** the new diagram is open, **When** the owner uses Modify diagram, **Then** the Modeler imports the starter process and supports adding elements and saving through the existing Apply then Save flow.
5. **Given** the owner browses `/`, `/processes`, a nested folder under `/processes/<process>`, or any other folder, **When** its folder menu opens, **Then** New BPMN diagram is not offered.

### Edge Cases

- If the BPMN XML is malformed or cannot be rendered, the editor MUST show a clear, non-technical error and keep the XML available for inspection or correction.
- If a BPMN file is empty, the editor MUST treat it as unrenderable and provide a clear explanation rather than showing a blank or misleading diagram.
- If a BPMN file contains valid XML but unsupported BPMN elements, the editor MUST render all supported content and communicate any import warnings when they affect the displayed result.
- If the owner changes files while the BPMN editor has unsaved XML changes, the existing dirty-file confirmation MUST remain in effect.
- If the file changes externally while open, the existing external-change conflict behavior MUST continue to protect unsaved XML edits.
- If the owner is not authorized, the existing authentication and access-denied behavior MUST apply; rendering a BPMN file MUST not bypass file permissions.
- If exporting the modeler content fails, the modal MUST remain open and preserve the editable diagram state.
- If the modeler is opened on a narrow viewport, the modal MUST use the available screen and keep the core modeling controls usable.
- If diagram creation is cancelled, the name is empty, or the folder cannot be written, the system MUST not leave a partially created diagram.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST recognize `.bpmn` files as BPMN diagrams in the file editor.
- **FR-002**: The system MUST render valid BPMN 2.0 XML as a graphical process diagram in the editor.
- **FR-003**: The diagram view MUST provide fit-to-view, zoom, and pan interactions sufficient to inspect the complete diagram and its details.
- **FR-004**: The system MUST provide a clear control for switching between graphical diagram view and editable XML view.
- **FR-005**: The XML view MUST use the current file content and MUST preserve the existing edit, save, dirty-state, and external-change behavior.
- **FR-006**: Returning to diagram view after XML changes MUST attempt to render the current unsaved XML, not an older saved version.
- **FR-007**: When rendering fails, the system MUST show a clear error and MUST NOT discard or overwrite the XML content that caused the failure.
- **FR-008**: The system MUST keep BPMN rendering protected by the same authenticated owner access rules as the existing file editor.
- **FR-009**: The first version MUST provide a standard visual BPMN modeler inside a modal, including palette-based creation, selection, moving, connecting, relabeling, zoom, and undo/redo; advanced properties panels, collaboration, validation, and process execution remain out of scope.
- **FR-010**: Applying modeler changes MUST update the existing in-memory editor content but MUST NOT persist to storage until the owner uses the main Save action.
- **FR-011**: Closing the modeler with unapplied changes MUST require explicit discard confirmation.
- **FR-012**: Existing behavior for non-BPMN file types MUST remain unchanged.
- **FR-013**: Only folder menus for paths exactly matching `/processes/<process>` MUST offer a dedicated New BPMN diagram action that creates a valid BPMN 2.0 starter process rather than an empty file; all other folder menus MUST omit the action.
- **FR-014**: Diagram creation MUST normalize the `.bpmn` suffix without duplication and MUST not overwrite an existing file.

### Key Entities *(include if feature involves data)*

- **BPMN File**: A stored file containing BPMN 2.0 XML, identified by its `.bpmn` extension and editable through the existing file workflow.
- **Diagram View State**: The temporary browser state describing whether the file is shown as a diagram or XML and the current viewport used to inspect the diagram.
- **Import Result**: The outcome of attempting to render BPMN XML, including successful rendering, warnings, or an error that must be shown to the owner.
- **Modeler Modal State**: Temporary state for the visual BPMN editing session, including whether it is open, whether it has unapplied changes, and whether exporting XML is in progress or failed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a valid BPMN file of up to 5 MB, the graphical diagram becomes visible within 3 seconds after the file content has loaded in at least 95% of test opens on a normal development connection.
- **SC-002**: 100% of valid BPMN sample files used in the acceptance test set display their nodes, labels, and connecting flows without requiring raw XML inspection.
- **SC-003**: An owner can switch between diagram and XML views in no more than two deliberate actions per direction.
- **SC-004**: 100% of malformed BPMN samples produce a clear recoverable error while preserving the original XML for correction.
- **SC-005**: Existing file-editor acceptance checks for text, Markdown, CSV, HTML, and Python files continue to pass without behavior changes.
- **SC-006**: An owner can open visual editing, make a basic BPMN change, apply it, and reach the existing Save action in under 30 seconds for a valid diagram.
- **SC-007**: 100% of close attempts with unapplied modeler changes require an explicit discard decision.
- **SC-008**: In the acceptance walkthrough, a newly created BPMN file opens as a diagram and can be modified visually without editing XML first.
- **SC-009**: In the acceptance walkthrough, the New BPMN diagram action appears in 100% of `/processes/<process>` folder menus and in none of the other folder menus tested.

## Assumptions

- The feature is for the existing authenticated owner and uses the current file browser and file APIs.
- BPMN files already supported by storage and text editing remain editable as XML.
- The initial graphical Diagram view is read-only; visual editing is entered explicitly through the Modeler modal.
- The first modeler version uses the standard BPMN palette and editing controls; a dedicated properties panel is not included.
- Applying modeler changes is intentionally separate from persisting them, so the existing editor Save, dirty-state, and conflict behavior remains authoritative.
- Diagram rendering occurs in the browser and does not change the stored file format or storage contract.
- Standard BPMN 2.0 XML is the expected input; vendor-specific extensions may render partially or produce warnings.
- The existing responsive editor layout is reused, including mobile browser support where the diagram remains usable through zoom and pan.
- `<process>` is one non-empty direct child folder name under `/processes`; deeper descendants are not eligible for the dedicated creation action.
