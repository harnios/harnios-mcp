# Feature Specification: OS Change Process

**Feature Branch**: `033-os-change-process`

**Created**: 2026-08-28

**Status**: Draft

**Input**: User description: "Processo di cambiamento strutturale per un'istanza Harnios (spec-driven, in stile speckit di questo stesso repo, ma pensato per essere eseguito in conversazione da qualsiasi assistente AI collegato via MCP, senza slash command). Contesto: oggi /init crea uno scheletro minimo (os/, data/, AGENTS.md a una riga). Il tool get_os_init fa poi un'intervista che PRE-CREA subito un pacchetto di skill in base al tipo di business. Vogliamo eliminare questo pre-caricamento: nessuna skill viene creata finché non serve davvero per una richiesta concreta del cliente. Le skill sono file .md sotto os/skills/, instradate da os/routing.md — pura convenzione, nessun parser. Lo scheduler (spec 032, già esistente) usa file os/schedules/<slug>.md con cron/model/timezone — non va toccato, va solo riusato dal nuovo processo quando serve una nuova schedulazione. Requisiti: (1) get_os_init non pre-crea più skill/policy in base al tipo di business; (2) nuovo MCP tool get_change_process, stesso pattern di get_os_engine/get_os_init/get_os_upgrade; (3) il gate si applica solo a modifiche strutturali (nuova skill, nuovo/modificato schedule, routing.md, policy, nuova connessione MCP esterna) — tutto il resto resta immediato; (4) quando scatta: esplorare l'esistente, scrivere in os/changes/<slug>/ uno spec.md leggero + plan.md + tasks.md, presentare un riassunto in chat e ottenere conferma esplicita prima di scrivere qualunque file, poi implementare; (5) se non realizzabile con i tool MCP nativi né con una nuova connessione esterna configurabile dal proprietario, proporre come ultima risorsa un task di sviluppo esterno, mai come prima opzione; (6) distribuzione alle istanze esistenti tramite bump della os-engine-version e il meccanismo di changelog/upgrade già esistente. Fuori scope: separazione dei ruoli utente/amministratore (oggi un solo account owner fa tutto)."

## Clarifications

### Session 2026-08-28

- Q: L'intervista iniziale di get_os_init oggi crea subito un pacchetto di skill in base al tipo di business. Con il nuovo processo a gate, la teniamo com'è (starter kit alla prima connessione, gate solo dopo) o rendiamo minimale anche l'intervista iniziale? → A: Minimale anche l'intervista iniziale — nessuna skill pre-creata nemmeno al primo collegamento; la prima skill nasce dalla prima richiesta reale, tramite il processo a gate.
- Q: Dove salvare la specifica/piano/checklist di una modifica strutturale non ancora completata? → A: `os/changes/<slug>/` — è attività amministrativa che riguarda la struttura stessa (stesso spazio di dove poi atterra il risultato: `os/skills/`, `os/schedules/`), non contenuto dell'utente finale in `data/`.
- Q: Separare i ruoli utente (lavora in `data/`) e amministratore (lavora in `os/`, approva le modifiche strutturali)? → A: Fuori scope per questa funzionalità — richiede un controllo di accesso per percorso che non esiste oggi nel sistema; rimandato a una funzionalità futura separata. Questa funzionalità assume un solo account che sia insieme utente e amministratore, che quindi approva a se stesso le proprie proposte di modifica in una conversazione.
- Q: Se una modifica confermata viene interrotta a metà implementazione (es. crash di sessione dopo aver creato solo alcuni dei file previsti), cosa succede alla ripresa? → A: Si riprende da dove ci si era interrotti, usando il checklist per tracciare cosa è già stato completato — non si ricomincia da capo né si duplica lavoro già fatto.
- Q: Cosa succede alla specifica/piano/checklist di una modifica dopo che è stata implementata con successo? → A: Resta dov'è come registro storico — non viene mai cancellata o spostata automaticamente.
- Q: Come si identifica una proposta di modifica in corso, in modo da poterla ritrovare/riprendere/scartare in una sessione successiva? → A: Un identificativo leggibile derivato automaticamente dalla richiesta stessa (coerente con come gli Scheduled Tasks esistenti derivano già il proprio identificativo dal nome) — nessuna scelta esplicita richiesta al proprietario.
- Q: La definizione di "modifica strutturale" copre solo skill/schedule/routing/policy/connessioni MCP, oppure anche la prima volta che serve una nuova categoria di contenuto in `data/` (es. `data/progetti/` quando nessun progetto è mai stato gestito)? → A: Anche quello — stabilire per la prima volta dove e come vive un nuovo tipo di contenuto è strutturale quanto creare una skill; usare o aggiungere contenuto a una categoria già esistente resta invece lavoro quotidiano, non importa quanto sia significativo per il business. Un cambiamento che stabilisce una nuova categoria dovrebbe anche valutare se creare, nella stessa modifica, una skill per gestire le occorrenze future di quella categoria.
- Q: Il processo spec→piano→implementazione deve essere un solo documento (`get_change_process`) o tre skill separate (una per fase)? → A: Un solo documento con tutte le fasi in sequenza — coerente con come sono già fatti `engine.md`/`init.md`, meno pezzi da mantenere.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Owner gets a new recurring capability built safely through conversation (Priority: P1)

An owner tells their connected assistant, in plain language, that they need something that doesn't exist yet — either a new recurring capability (for example, a daily report of expiring items sent every weekday morning) or a new kind of business content that has never been tracked before (for example, "I have a project to manage" when nothing has ever been tracked as a project). The assistant recognizes this requires new structure — a way of doing the task and, if it recurs, a schedule for it; or a place and shape for the new kind of content, plus, when it makes sense, a way of doing things for handling future instances of that same kind of content — works out a lightweight plan for what it will create, shows the owner a plain-language summary of what's about to change, and only creates the actual files after the owner explicitly agrees.

**Why this priority**: This is the entire value of the feature. Everything else exists to protect or complement this core interaction — an owner going from "I need X" to "X exists and runs on its own" without needing a developer, while never having something structural silently created behind their back.

**Independent Test**: Can be fully tested by asking a connected assistant, on a fresh instance, for a capability that doesn't exist yet and that has a natural recurring schedule attached to it. Success is verified by: a plain-language proposal appearing before anything is created, nothing being created until the owner agrees, and the described capability existing and running on its own schedule afterward.

**Acceptance Scenarios**:

1. **Given** an owner describes a new need that requires a repeatable way of doing something plus a schedule, **When** the assistant determines this isn't covered by anything that already exists, **Then** it produces a plain-language description of what it intends to create and a concrete plan of the files involved, and presents both to the owner before creating anything.
2. **Given** the owner has been shown a proposal, **When** the owner explicitly confirms, **Then** the assistant creates exactly what was described — the new way of doing the task and the schedule for it — and nothing else.
3. **Given** the owner has been shown a proposal, **When** the owner does not confirm (declines, ignores it, or asks for changes), **Then** no new structural file is created, and the draft proposal remains available to revisit later.
4. **Given** a proposal was left unconfirmed in an earlier conversation, **When** the owner returns in a new session, **Then** the assistant can find and resume that same draft rather than starting over or losing it.
5. **Given** the owner mentions a kind of business content that has never been tracked before, **When** the assistant determines no place or shape for it exists yet, **Then** it follows the same describe-plan-confirm sequence as for a new recurring capability, and its plan may include both where the new content will live and a way of doing things for handling future instances of it.

---

### User Story 2 - Everyday work stays instant (Priority: P2)

An owner or their staff uses the system for its normal daily purpose — asking for something an existing way-of-doing-things already covers, or writing/reading day-to-day business content. None of this ever triggers a proposal-and-confirmation step; it happens immediately, exactly as it does today.

**Why this priority**: The gate introduced by this feature must never become friction for routine use, or the whole system becomes slower for the vast majority of interactions. This story exists specifically to guarantee no regression.

**Independent Test**: Can be tested by performing a range of everyday actions (using an existing capability, writing a note, updating a business record) on an instance that also has the new change process available, and confirming none of them ever produce a proposal or ask for confirmation.

**Acceptance Scenarios**:

1. **Given** a way of doing something already exists for the request being made, **When** the owner asks for it, **Then** it happens immediately with no proposal or confirmation step.
2. **Given** the request only involves writing or reading everyday business content (not the system's own structure), **When** the owner asks for it, **Then** it happens immediately regardless of how significant the content itself is to the business.

---

### User Story 3 - A brand-new instance starts genuinely empty (Priority: P3)

When a new client's instance is set up for the first time, nothing beyond the bare minimum exists — no repeatable ways-of-doing-things are pre-created based on guesses about what kind of business the owner runs. The first one gets created only when a real request calls for it, following the same process as User Story 1.

**Why this priority**: This removes the current one-time upfront setup interview's guesswork and front-loaded file creation, aligning first-time setup with the same on-demand principle the rest of the feature establishes. It depends on User Story 1 existing (otherwise there would be no path to ever get a first capability).

**Independent Test**: Can be tested by completing first-time setup on a fresh instance and confirming no way-of-doing-things files exist afterward, only the pre-existing minimal baseline.

**Acceptance Scenarios**:

1. **Given** a brand-new instance completing first-time setup, **When** setup finishes, **Then** no capability files have been created beyond the existing minimal baseline (the basic marker files already produced today).
2. **Given** a brand-new instance with nothing yet created, **When** the owner makes their first concrete request, **Then** the process described in User Story 1 applies exactly as it would on an older, already-populated instance.

---

### User Story 4 - Existing instances gain the capability without manual work (Priority: P4)

Client instances that were already set up before this feature existed automatically become eligible to receive it, using the same confirmation-based upgrade approach already used for other base-setup improvements — not by someone manually reconfiguring each instance one at a time.

**Why this priority**: Without this, the feature would only ever reach newly-created instances, leaving already-onboarded clients permanently behind and requiring manual, error-prone, one-off work per client to catch up.

**Independent Test**: Can be tested on an already-existing instance by triggering the existing upgrade-check behavior and confirming the owner is shown this capability as part of what the upgrade adds, with nothing applied until they confirm.

**Acceptance Scenarios**:

1. **Given** an instance set up before this feature existed, **When** the owner checks for or is offered an upgrade, **Then** this capability is included among what the upgrade would add, described in plain language.
2. **Given** an instance upgrades, **When** the upgrade completes, **Then** the instance behaves as described in User Stories 1-3, without any way-of-doing-things that existed before the upgrade being altered or removed.

### Edge Cases

- What happens if the request can be fully satisfied by something that already exists (an existing way-of-doing-things, or a schedule that just needs its content adjusted, not its structure)? → Treated as everyday work (User Story 2), not a structural change — no proposal step.
- What happens if the owner asks for something that isn't achievable with anything currently available, and no reasonably configurable new connection would close the gap either? → The assistant proposes, as a last resort, that a developer build something new — it never invents or pretends to have a capability it doesn't have.
- What happens if two structural change requests are proposed one after another before the first is confirmed or discarded? → Each draft proposal must be distinguishable and not overwrite or merge with another in-progress one.
- What happens to capabilities that were already created for a client under the old upfront-interview approach? → They are left exactly as they are; this feature changes what happens for new instances and new changes going forward, not existing content.
- What happens if the owner asks to abandon a draft proposal entirely? → It must be possible to discard it explicitly, distinct from simply leaving it unconfirmed.
- What happens if a confirmed change's implementation is interrupted before every planned file has been created or modified? → Resuming completes only what the checklist indicates is still outstanding; it does not restart the proposal or redo work already done correctly.
- What happens if the owner's request concerns a kind of business content that has never existed before (e.g. the first project when nothing has ever been tracked as a project)? → Treated as a structural change: establishing where and how this kind of content lives is subject to the same describe-plan-confirm process as a new way-of-doing-things, not treated as everyday content simply because it will eventually live under `data/`.
- What happens once a new kind of business content already has a place and shape? → Adding another instance of it (a second project, a third client) is everyday activity, never structural, regardless of how significant that content is to the business.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: First-time setup MUST NOT create any way-of-doing-things (skill) or rule (policy) file based on guesses about business type; it MUST result only in the same minimal baseline already produced today.
- **FR-002**: The system MUST make available, to any connected assistant, a description of when and how to apply the change process introduced by this feature, following the same delivery approach already used for the existing setup and upgrade guidance.
- **FR-003**: The system MUST distinguish between structural changes and everyday activity. A structural change is: creating or modifying a way-of-doing-things; creating or modifying a schedule; changing the routing/index of ways-of-doing-things; changing a rule; requesting a new external connection; or establishing, for the first time, a place and shape for a kind of business content that has never been tracked before. Everyday activity is: using something that already exists, or reading/writing content within a kind of business content that already has an established place and shape — no matter how significant that content is to the business. Only structural changes are subject to the process in FR-004; everyday activity MUST remain immediate.
- **FR-004**: For a structural change, the process MUST, in order: (a) check whether the request is already achievable with what exists; (b) if not, produce a plain-language description of what is needed and why; (c) produce a concrete plan naming which files will be created or changed; (d) produce a short checklist of the steps; (e) present a summary of (b) and (c) to the owner and obtain explicit confirmation before any file described in the plan is created or modified.
- **FR-005**: A structural change's in-progress description, plan, and checklist MUST be stored somewhere clearly separate from day-to-day business content, so an unconfirmed or abandoned change is never confused with either the system's settled structure or the business's own data.
- **FR-006**: After explicit confirmation, the system MUST create or modify only the files named in the plan for that change — nothing beyond what was proposed and confirmed.
- **FR-007**: If a requested capability cannot be achieved with what is currently available, the process MUST first consider whether a new externally-configured connection would close the gap, and only if that is also insufficient, propose that a developer build something new — never fabricate a capability that does not exist.
- **FR-008**: Declining, ignoring, or not yet acting on a proposed change MUST leave the live structure completely unmodified.
- **FR-009**: An in-progress change's description/plan/checklist MUST remain discoverable in a later session so the owner or assistant can resume, revise, or explicitly discard it rather than losing track of it.
- **FR-010**: This capability MUST be deliverable to already-existing instances through the same confirmation-based upgrade approach already used for other improvements to the base setup, rather than requiring separate manual work per instance.
- **FR-011**: Upgrading an instance to gain this capability MUST NOT alter or remove any way-of-doing-things, schedule, or rule that already existed on that instance beforehand.
- **FR-012**: If implementation of a confirmed change is interrupted before every file named in its plan has been created or modified, resuming it MUST complete only the outstanding steps (per its checklist) — it MUST NOT discard already-completed steps, redo them, or require the proposal to start over.
- **FR-013**: Once a change has been fully implemented, its specification, plan, and checklist MUST remain in place as a historical record — they MUST NOT be automatically deleted or moved once the change is complete.
- **FR-014**: Each change proposal MUST be identifiable by a short, readable label automatically derived from the request itself, without requiring the owner to invent or type a technical name.
- **FR-015**: When a structural change establishes a new kind of business content, its plan MUST consider whether a companion way-of-doing-things for handling future instances of that same kind of content is worth creating as part of the same change, so its place and shape don't need to be re-decided each time.

### Key Entities

- **Change Proposal**: A structural change that has been described and planned — includes what is needed and why, the concrete plan of files involved, and a checklist of steps. Before confirmation it can be revised or explicitly discarded; once confirmed, its checklist tracks progress toward completion; after completion, it remains in place as a historical record rather than being removed.
- **Way-of-doing-things (Skill)**: An existing kind of entity (introduced before this feature) representing a repeatable capability; this feature governs how new ones come into existence but does not change what one is.
- **Schedule**: An existing kind of entity (introduced by a prior feature) representing a recurring, automatically-triggered task; this feature governs when a new one requires the change process, but does not change its own behavior.
- **Data Category**: A kind of business content that lives under the business's own content area (e.g. projects, clients, suppliers) — its place and shape, not any individual instance of it. This feature governs the first time a new one is established (a structural change, per FR-003) but does not govern using or adding instances to one that already exists.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a brand-new instance, first-time setup completes with zero way-of-doing-things files created, beyond today's existing minimal baseline.
- **SC-002**: An owner can go from describing a new recurring need in conversation to having it actually running unattended, entirely through conversation with their connected assistant, with no developer involvement required for capabilities achievable with existing tools.
- **SC-003**: 100% of everyday requests (using something that already exists, or working with day-to-day business content) complete with no proposal-and-confirmation step, matching today's behavior.
- **SC-004**: 100% of structural changes (new or modified way-of-doing-things, schedule, routing, rule, or newly-established kind of business content) are preceded by an explicit, visible confirmation step — none occur without one.
- **SC-005**: An already-existing client instance gains this capability through the same single upgrade-confirmation interaction already used for other base-setup improvements, with no additional per-instance manual work.

## Assumptions

- A single account continues to act as both the everyday user and the approver of structural changes for a given instance; this feature does not introduce or require separating those roles (deferred to a future feature).
- Any MCP-connected assistant capable of a multi-turn conversation and of following markdown instructions can carry out the process described here — no assumption is made about a specific assistant product.
- The boundary of "structural" is: ways-of-doing-things (skills), schedules, the routing/index of ways-of-doing-things, rules (policies), requests for new external connections, and establishing a place and shape for a kind of business content for the first time. Using or adding to a kind of business content that already has an established place and shape is never structural, regardless of how important that content is to the business.
- Instances that already had ways-of-doing-things pre-created under the previous upfront-interview approach are not retroactively changed by this feature.
