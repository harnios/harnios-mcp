# Feature Specification: In-App User Documentation

**Feature Branch**: `035-user-docs`

**Created**: 2026-09-03

**Status**: Draft

**Input**: User description: "Documentazione utente per l'app Harnios (Company OS), disponibile in due punti coerenti tra loro con un'unica fonte di contenuto: 1. Una nuova voce nel menu di navigazione principale (accanto a Files, Tools, Schedules, Settings), che apre una pagina di sola lettura (nessun editing) con la documentazione su come si usa l'app: dashboard, file manager, tool MCP, scheduled tasks, impostazioni/connessioni. Contenuto organizzato per argomento (uno per voce di nav più una panoramica generale). 2. Lo stesso contenuto esposto anche via MCP, così un assistente connesso può recuperarlo per rispondere a domande dell'owner su come funziona l'app — seguendo lo stesso pattern già usato per i tool 'engine' (get_os_engine/get_os_upgrade/get_os_init/get_change_process): contenuto markdown bundlato nel codice (non nel bucket S3 dell'OS), letto una volta a build time, esposto come MCP tool (non resource). Ambito: documentazione sull'app stessa (come si usa Harnios), rivolta all'owner umano — NON documentazione sul business/OS del cliente. Decisioni: un solo tool MCP get_docs con parametro topic (enum), pagina /docs raggiungibile dal menu, resa in sola lettura con react-markdown + remark-gfm, stessi file markdown come fonte unica per pagina e tool, temi = panoramica + una per sezione di nav (Dashboard, Files, Tools, Schedules, Settings), solo lingua di default al lancio, pagina accessibile senza gate owner-only."

## Clarifications

### Session 2026-09-03

- Q: When the documentation page is asked for a topic that doesn't exist (stale link, hand-typed URL, removed topic), what should it show? → A: A "topic not found" message listing the valid topics to choose from — the same clear-failure behavior FR-007 already requires on the MCP side, kept consistent across both surfaces.
- Q: Should other app sections (Files, Tools, Schedules, Settings) each expose their own direct entry point into their documentation topic, or is the main-menu entry the only way in? → A: Main-menu entry only — no additional entry points added to other pages in this feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Owner reads how to use the app from the menu (Priority: P1)

An owner (or anyone using the app) opens the main navigation menu, finds a new "Docs" entry alongside Dashboard, Files, Tools, Schedules and Settings, and lands on a documentation page. From there they can read a general overview of the app and dedicated documentation for each of its main areas, without needing to ask anyone or go digging through source code or specs.

**Why this priority**: This is the entire value proposition — a self-serve place to learn how the app works. Without it, the feature delivers nothing.

**Independent Test**: Can be fully tested by opening the menu, navigating to the new documentation entry, and confirming a written explanation of at least one app area (e.g. Scheduled Tasks) is readable there — independent of whether the MCP-side exposure exists yet.

**Acceptance Scenarios**:

1. **Given** the app's main navigation, **When** a visitor selects the new documentation entry, **Then** a read-only page opens showing app documentation organized by topic.
2. **Given** the documentation page, **When** the visitor picks a specific topic (e.g. "Schedules"), **Then** they see documentation describing that area of the app specifically, not a generic or unrelated topic.
3. **Given** the documentation page, **When** an unauthenticated visitor opens it, **Then** they can read it without being asked to sign in.

---

### User Story 2 - A connected assistant answers "how does X work" using the docs (Priority: P2)

An owner asks their connected assistant a question about how a part of the app works (e.g. "how does the scheduler work?"). The assistant retrieves the same documentation content through the app's MCP interface and answers using it, instead of guessing or being unable to answer.

**Why this priority**: Extends the same value to the assistant-driven surface, which is how many owners actually interact with the system day to day — but the documentation already delivers value through the web page alone (P1), so this is additive.

**Independent Test**: Can be fully tested by calling the documentation-retrieval capability from an MCP client for a specific topic and confirming the returned content matches what the documentation page shows for that same topic.

**Acceptance Scenarios**:

1. **Given** a connected assistant with access to this server's tools, **When** it requests documentation for a known topic, **Then** it receives that topic's content.
2. **Given** a connected assistant, **When** it requests documentation without specifying a topic, **Then** it receives the general overview.
3. **Given** a change to a topic's content, **When** that topic is later read from the web page and from the MCP interface, **Then** both show the same, updated content — there is never a stale copy on one side.

---

### User Story 3 - Documentation topics track the app's own navigation (Priority: P3)

As the owner of the product (not an end-user owner, but whoever maintains the app), when a new primary section is added to the app's main navigation, it is expected to get its own documentation topic, so the documentation page and the app's own structure never drift far apart.

**Why this priority**: A consistency/maintainability concern rather than a day-one user-facing capability — the initial topic set (P1/P2) already covers every section that exists today.

**Independent Test**: Can be verified by comparing the list of primary navigation entries against the list of documentation topics and confirming a 1:1 correspondence (plus the general overview).

**Acceptance Scenarios**:

1. **Given** the app's current primary navigation entries, **When** the documentation topic list is reviewed, **Then** every entry has a matching topic.

---

### Edge Cases

- What happens when the MCP interface is asked for a topic that doesn't exist? The request MUST fail with a clear indication of the valid topics, rather than silently returning empty or unrelated content.
- What happens when the documentation page itself is opened for a topic that doesn't exist (stale link, hand-typed URL, a removed topic)? The page MUST show a clear "topic not found" message listing the valid topics, matching the MCP interface's behavior for the same situation — never a silent redirect or a generic fallback that hides the mismatch.
- What happens when the documentation page is opened while the app's own data storage (the OS bucket) is unreachable or unconfigured? The documentation MUST still render normally, since its content lives in the app itself, not in that storage.
- What happens when an owner-disabled-tools setting (spec 023) disables the documentation MCP tool? It behaves like any other disabled native tool — it stops being offered to a connected assistant; the web page is unaffected.
- What happens when a future navigation entry is added without a corresponding documentation topic yet being written? The documentation page/tool MUST NOT break — it simply doesn't yet cover that area, which is a content gap to close, not a system failure.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a documentation page reachable from the app's main navigation menu, alongside the app's other primary sections.
- **FR-002**: The documentation page MUST organize content by topic, covering at minimum a general overview plus one topic per current primary navigation section (Dashboard, Files, Tools, Schedules, Settings).
- **FR-003**: The documentation page MUST be read-only — visitors can read but not edit its content through the app.
- **FR-004**: The documentation page MUST be reachable without an owner session — unlike Schedules and Settings, it requires no sign-in.
- **FR-005**: System MUST expose the same documentation content through its MCP interface, so a connected assistant can retrieve it to answer an owner's questions about how the app works.
- **FR-006**: The MCP-exposed documentation MUST allow the caller to request a specific topic, and MUST return the general overview when no topic is specified.
- **FR-007**: A request for an unrecognized topic (via the MCP interface) MUST fail clearly, indicating the set of valid topics, rather than returning silently empty or unrelated content.
- **FR-007a**: The documentation page, when opened for an unrecognized topic, MUST show a clear "topic not found" message listing the valid topics — the same clear-failure behavior as FR-007, not a silent redirect or an unannounced fallback to a different topic.
- **FR-008**: The documentation page and the MCP-exposed documentation MUST be produced from one shared underlying content source per topic — updating a topic's content MUST be reflected identically in both places, with no separate copy to keep in sync by hand.
- **FR-009**: Documentation content MUST describe how to use the app itself (navigation, file management, tool management, scheduled tasks, settings/connections) — it MUST NOT be, or be confused with, documentation about a specific deployment's own business/OS content.
- **FR-010**: Documentation content MUST be maintained as part of the application itself, not stored inside the OS's own file storage alongside a deployment's business/customer data.
- **FR-011**: At initial launch, documentation content MUST be available in the system's default language only; translating it into the app's other supported languages is out of scope for this feature.
- **FR-012**: The documentation MCP capability MUST be subject to the same owner-managed enable/disable mechanism already governing this server's other native tools.

### Key Entities

- **Documentation Topic**: A single named unit of documentation content (e.g. "overview", "dashboard", "files", "tools", "schedules", "settings") with a title and body, retrievable identically from the documentation page and from the MCP interface.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can find and open documentation for any given app area from the main menu in under 10 seconds.
- **SC-002**: A connected assistant asked how a documented app area works answers using that area's documentation content, without needing separate access to the app's source code.
- **SC-003**: 100% of the app's current primary navigation sections have a corresponding, readable documentation topic at launch.
- **SC-004**: A content update made to a topic is reflected on both the documentation page and the MCP interface without any additional manual step or redeployment beyond the normal app update process.
- **SC-005**: The documentation page is reachable and fully readable by a visitor who has not signed in.

## Assumptions

- The initial topic set mirrors the app's current primary navigation (Dashboard, Files, Tools, Schedules, Settings) plus one general overview topic; a future navigation change is expected to bring its own documentation update, but keeping them in sync going forward is a process expectation, not an automated constraint enforced by this feature.
- Documentation content is authored and maintained by whoever develops/operates the app, not created or edited by an owner through the app's interface — no content-authoring UI is in scope.
- No cross-topic search is required for this feature; the topic list is small enough to browse directly.
- Documentation content is text (with standard rich-text formatting such as headings, lists and links) — screenshots or other embedded media are out of scope for this feature.
- This feature does not change how any other app area behaves; it only adds a new, independent way to read about them.
- The main navigation menu entry is the only in-app entry point into the documentation page for this feature — other pages (Files, Tools, Schedules, Settings) are not modified to add their own direct link into their corresponding topic; that remains a possible future enhancement, not part of this feature's scope.
