# Research: BPMN Diagram Viewer

## Decision: Use the bpmn.io `bpmn-js` viewer

**Rationale**: `bpmn-js` is the bpmn.io toolkit for viewing and editing BPMN 2.0 diagrams in the browser. Its viewer API accepts BPMN XML directly through `importXML`, reports import warnings/errors, exposes viewport controls, and does not require a backend conversion step. The viewer-only API matches the v1 scope and avoids introducing visual modeling behavior.

**Alternatives considered**:

- `bpmn-js` Modeler: rejected for v1 because drag-and-drop modeling, command history, export, and visual-editing UX are explicitly out of scope.
- Server-side SVG/PDF conversion: rejected because it adds a rendering service or server dependency, prevents direct browser interaction, and complicates error reporting.
- A generic XML/SVG viewer: rejected because it would not understand BPMN semantics or provide BPMN-specific layout, zoom, and navigation behavior.

## Decision: Pin `bpmn-js` to 18.28.0

**Rationale**: The npm package page identified 18.28.0 as the current latest release during planning. Pinning the version keeps the lockfile and browser behavior reproducible; future upgrades can be reviewed separately.

**Alternatives considered**:

- Unbounded `latest`/caret dependency: rejected because dependency resolution could change rendering or bundling without a feature change.
- An older major version: rejected because there is no repository compatibility requirement for an older release and the current release provides built-in TypeScript declarations.

## Decision: Browser-only viewer lifecycle

**Rationale**: The existing editor is a client component, but Next.js can still evaluate imported modules during build/server bundling. The viewer wrapper will instantiate the library only after mount, use a ref-owned container, re-import on current XML changes, and destroy the instance on cleanup. This avoids DOM/SVG access during server rendering and prevents stale viewer instances when navigating between files.

**Alternatives considered**:

- Render BPMN through a server route: rejected because the feature needs local mode switching and direct inspection of unsaved XML.
- Use a generic dynamic page-level import: rejected as the primary boundary because the component still needs explicit lifecycle management and import-error handling.

## Decision: Reuse the existing editor session and XML path

**Rationale**: The current `FileEditor` already owns loaded/current content, dirty state, save, ETag conflict detection, reload, and deep-link behavior. BPMN rendering should be a presentation mode over `currentContent`, not a second document state. This guarantees that switching back to XML, saving, or handling an external change has one consistent source of truth.

**Alternatives considered**:

- Keep a separate XML copy inside the viewer: rejected because it could diverge from unsaved edits and conflict handling.
- Replace XML editing with a modeler: rejected by the v1 scope and would change existing save semantics.

## Decision: Apply modeler output in memory, then persist through the main Save action

**Rationale**: The existing editor already owns dirty-state, ETag conflicts, save errors, and external reload behavior. The modal therefore exports XML to `FileEditor` through an Apply action and never writes directly to storage. This gives the owner one consistent persistence action and keeps modal cancellation reversible.

**Alternatives considered**:

- Save directly from the modal: rejected because it would duplicate save/error/conflict logic and make the main editor state harder to reason about.
- Keep the modal open after Apply: rejected for v1 because the requested workflow treats Apply as returning to the main editor, where the owner can review the resulting dirty state before saving.

## Sources consulted

- bpmn-js repository and README: https://github.com/bpmn-io/bpmn-js
- bpmn-js npm package and release information: https://www.npmjs.com/package/bpmn-js
- bpmn-js examples, including viewer/modeler integration: https://github.com/bpmn-io/bpmn-js-examples
