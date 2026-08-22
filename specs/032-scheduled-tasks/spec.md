# Feature Specification: Scheduled Tasks

**Feature Branch**: `032-scheduled-tasks`

**Created**: 2026-08-22

**Status**: Draft

**Input**: User description: "Scheduled Tasks (AI scheduler per la Company OS): un owner può definire più task pianificati, ciascuno salvato come file in os/schedules/*.md nel bucket S3 esistente. Ogni task ha: un'espressione cron, un flag enabled/disabled, un fuso orario opzionale, un modello LLM dedicato scelto tra quelli disponibili (Mistral), e un prompt dedicato. Un processo periodico individua i task scaduti, richiama il modello scelto passandogli il prompt del task e l'accesso agli strumenti nativi già esposti da questo server MCP, lascia che il modello decida quali strumenti invocare per portare a termine il task, e registra un log di esecuzione persistente. Serve anche un'interfaccia web owner-only dedicata (/schedules) per creare, elencare, modificare (modello e prompt), abilitare/disabilitare ed eseguire manualmente i task."

## Clarifications

### Session 2026-08-22

- Q: Quanto a lungo può girare l'esecuzione di un singolo task prima di essere considerata bloccata e interrotta forzatamente? → A: 5 minuti
- Q: Il pulsante "Esegui ora" deve essere disponibile anche per un task attualmente disabilitato? → A: Sì, sempre disponibile — enabled/disabled regola solo l'esecuzione automatica, non quella manuale
- Q: Quando l'owner crea un nuovo task dall'interfaccia, come si determina il suo identificativo/nome? → A: L'owner digita un nome leggibile, usato come identificativo del task
- Q: Se l'owner inserisce nell'interfaccia un'espressione cron non valida (o altri campi malformati), cosa deve succedere? → A: Il salvataggio viene bloccato con un errore chiaro; la validazione avviene solo lato interfaccia dedicata, non per i file modificati a mano (che restano soggetti allo skip-e-segnalazione già previsto)
- Q: La nuova interfaccia /schedules deve essere tradotta in tutte le lingue già supportate (6) fin dal primo rilascio? → A: No, al lancio è sufficiente la sola lingua di default; la traduzione completa nelle altre lingue è rimandata

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A scheduled task runs unattended and takes action (Priority: P1)

An owner has defined a task with a schedule, an assigned model, and a prompt describing what the task should accomplish (e.g. "every Monday morning, summarize what changed in the client records and email it to the owner"). Without any manual action, the system notices the task is due, gives the assigned model the task's prompt and access to the same internal capabilities (sending email, sending a Telegram message, reading/writing files) that a connected assistant already has, lets the model carry out the task, and records what happened.

**Why this priority**: This is the entire value proposition of the feature — unattended execution. Everything else (the management interface) only exists to configure this behavior. Without it, there is nothing to manage.

**Independent Test**: Can be fully tested by defining one task with a near-future schedule and a simple, verifiable prompt (e.g. "send a test message"), waiting for it to become due, and confirming the action actually happened and a record of the execution exists — independent of whether any management interface exists yet.

**Acceptance Scenarios**:

1. **Given** a task is enabled and its scheduled time has arrived, **When** the system checks for due tasks, **Then** the task's assigned model receives its prompt, is allowed to take action using the available internal capabilities, and an execution record is created reflecting what was done.
2. **Given** a task is disabled, **When** its scheduled time arrives, **Then** the system does not execute it.
3. **Given** two independent tasks with different schedules, prompts, and models, **When** both become due, **Then** each executes using its own assigned model and prompt, and each produces its own separate execution record.
4. **Given** a task whose scheduled time already passed once while it executed successfully, **When** its next scheduled occurrence arrives, **Then** it executes again at that next occurrence (recurring, not one-shot).

---

### User Story 2 - Owner manages tasks through a dedicated interface (Priority: P2)

An owner opens a dedicated management page and sees every scheduled task at a glance — its schedule, whether it's enabled, which model it's assigned, and the outcome/time of its last run. From this page the owner creates a new task, changes which model a task uses, edits a task's prompt through a dedicated text editor, and turns a task on or off — all without needing to know anything about how or where the task is stored.

**Why this priority**: This is how the feature is actually configured day to day. It's not required for the underlying execution engine to function (a task's definition could, in principle, be prepared some other way), but it's the intended primary way an owner interacts with the feature, and without it the feature is not usable by a non-technical owner.

**Independent Test**: Can be fully tested by opening the management page, creating a new task with a chosen model and prompt through the interface, confirming it appears in the list, then changing its model and prompt and confirming the change is reflected the next time the task runs.

**Acceptance Scenarios**:

1. **Given** the owner is on the management page, **When** they create a new task by choosing a model, writing a prompt, and setting a schedule, **Then** the task appears in the task list as a new, independent task that does not affect any existing task.
2. **Given** an existing task, **When** the owner changes its assigned model through the interface, **Then** its next execution uses the newly assigned model.
3. **Given** an existing task, **When** the owner edits its prompt through the dedicated editor and saves, **Then** its next execution uses the updated prompt.
4. **Given** an existing task, **When** the owner toggles it from enabled to disabled (or back), **Then** the task list immediately reflects the new state and future scheduled executions honor it.
5. **Given** a non-owner (unauthenticated visitor), **When** they attempt to reach the management page, **Then** they are denied access.

---

### User Story 3 - Owner triggers a task on demand and reviews its history (Priority: P3)

An owner wants to verify a task works, or needs it to run right now instead of waiting for its next scheduled time. From the management page, they trigger an immediate run and can see, for any past execution of any task, whether it succeeded or failed and a summary of what was done.

**Why this priority**: Valuable for confidence and troubleshooting, but the feature already delivers its core value through unattended scheduled execution (P1) and structured configuration (P2) without this — it's a convenience and observability layer on top.

**Independent Test**: Can be fully tested by clicking "run now" on an existing task and confirming it executes immediately (without waiting for its schedule) and that the resulting outcome appears in that task's execution history.

**Acceptance Scenarios**:

1. **Given** an existing task, **When** the owner triggers it manually, **Then** it executes immediately regardless of its schedule or of whether it is currently due.
2. **Given** a task has run one or more times (scheduled or manual), **When** the owner views that task, **Then** they can see the outcome and a summary of actions taken for its past executions.

---

### Edge Cases

- What happens when a task's assigned model or the task's outbound call fails (e.g. the model provider is unreachable)? The task's execution is recorded as failed with an explanation; other tasks are unaffected, and no automatic retry happens before the task's own next scheduled occurrence.
- What happens when a task attempts to use an internal capability that itself fails (e.g. sending an email fails because messaging isn't configured)? The failure is visible to the model carrying out the task and to whoever reviews the execution record afterward; it does not crash the scheduler.
- What happens when a task definition is invalid or cannot be understood (e.g. malformed schedule)? That task is skipped and flagged, without preventing other valid tasks from running or the system from starting.
- What happens if the system was unavailable when a task was due (e.g. server restart, downtime)? The missed occurrence is not executed retroactively; the task simply runs at its next due occurrence going forward.
- What happens if an owner triggers a manual run for a task that is already executing (from its own schedule or another manual trigger)? The system does not start a second, overlapping execution of the same task.
- What happens if a task's execution runs for an unreasonably long time (e.g. a stalled outbound call)? The run is forcibly terminated after a fixed maximum duration and recorded as a failed/timed-out execution, so the task is not left permanently blocked from running again.
- What happens when an owner selects a model or the model catalog changes? Only models from the currently supported/available set can be assigned to a task through the interface.
- What happens with a very large number of tasks or very frequent schedules? The system is expected to handle a reasonably large number of independently scheduled tasks (see Success Criteria) running on a single persistent instance; scaling to multiple concurrent instances of the system is explicitly out of scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow an owner to define any number of independent scheduled tasks, each with its own owner-provided readable name (serving as its identifier), schedule, model assignment, and prompt.
- **FR-002**: Each task MUST have a schedule (recurrence expression) determining when it becomes due, optionally scoped to a specific time zone (defaulting to a system-wide default when not specified).
- **FR-003**: Each task MUST have an enabled/disabled state; a disabled task MUST NOT execute automatically, even when its schedule would otherwise make it due.
- **FR-004**: Each task MUST have a model assignment, chosen from a curated set of currently supported models — arbitrary/unsupported model identifiers MUST be rejected.
- **FR-005**: Each task MUST have a dedicated prompt (free-form instructions) that is passed to its assigned model when the task executes.
- **FR-006**: System MUST periodically check for due, enabled tasks and execute each independently, without requiring any manual action.
- **FR-007**: When a task executes, its assigned model MUST be given the task's own prompt and access to the same internal capabilities (e.g. sending email, sending a messaging notification, reading/writing files) already available to a connected assistant, and MUST be allowed to decide which of those capabilities to use to carry out the task.
- **FR-008**: A task executing MUST NOT have access to capabilities/tools sourced from externally connected systems beyond this server's own native capabilities.
- **FR-009**: Every task execution (scheduled or manually triggered) MUST produce a durable, retrievable record capturing its outcome (success/failure), a summary of what was done or attempted, and the time it ran.
- **FR-010**: A failed task execution MUST NOT prevent other tasks from executing on their own schedule, and MUST NOT prevent the system from starting or continuing to operate.
- **FR-011**: System MUST NOT retroactively execute occurrences that were missed while the system was unavailable; at most one execution per task per due check.
- **FR-012**: System MUST NOT start a new execution of a task that is already executing (whether that in-progress execution was scheduled or manually triggered).
- **FR-012a**: System MUST enforce a maximum duration of 5 minutes per task execution; a run exceeding this limit MUST be terminated and recorded as a failed (timed-out) execution rather than left running indefinitely.
- **FR-013**: Owner MUST be able to view a list of all defined tasks, showing at minimum: schedule, enabled/disabled state, assigned model, and the outcome/time of its most recent execution.
- **FR-014**: Owner MUST be able to create a new task, and to change an existing task's assigned model, prompt, and enabled/disabled state, through a dedicated management interface — without needing to directly edit the task's underlying storage.
- **FR-014a**: The dedicated management interface MUST validate a task's fields (in particular, that the schedule expression is well-formed) before saving, and MUST reject the save with a clear error message if validation fails — a task cannot be created or updated into an invalid state through this interface. This validation applies only to the dedicated interface; a task definition edited directly through the general-purpose file storage interface (FR-018) remains subject to the existing skip-and-flag handling for malformed definitions (see Edge Cases).
- **FR-015**: Owner MUST be able to manually trigger an immediate execution of any task, independent of its schedule, due state, or enabled/disabled state — the enabled/disabled flag governs only automatic execution.
- **FR-016**: Owner MUST be able to review the history of past executions for a given task, including outcome and summary for each.
- **FR-017**: Access to the task management interface and to manual-trigger/history capabilities MUST be restricted to authenticated owners; unauthenticated access MUST be denied.
- **FR-018**: A task's definition MUST remain directly inspectable/editable through the system's existing general-purpose file storage interface, and changes made through either the dedicated management interface or the general-purpose interface MUST both be reflected consistently (there must not be two diverging copies of a task's definition).

### Key Entities

- **Scheduled Task**: A single recurring unit of automated work. Attributes: owner-provided readable name (serves as its identifier), schedule/recurrence expression, optional time zone, enabled/disabled state, assigned model, prompt (instructions for the model), last-known execution outcome/time.
- **Task Execution Record**: The durable result of one run of a Scheduled Task (scheduled or manually triggered). Attributes: which task it belongs to, when it ran, outcome (success/failure and why), summary of actions taken/attempted during the run.
- **Supported Model**: An entry in the curated, currently-available set of models an owner may assign to a task. Attributes: identifier, human-readable label.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An owner can define a new, fully working scheduled task (schedule, model, prompt) through the management interface in under 2 minutes.
- **SC-002**: A due, enabled task begins executing within 1 minute of becoming due, with no manual action required.
- **SC-003**: An owner can determine the outcome of any task's most recent execution within a few seconds of opening the management interface, without needing to inspect raw storage.
- **SC-004**: When one task's execution fails, 100% of other independently scheduled tasks continue to execute on their own schedules unaffected.
- **SC-005**: A change to a task's assigned model or prompt made through the management interface takes effect on that task's very next execution (scheduled or manual), with no restart of the system required.
- **SC-006**: The system correctly manages at least 20 independently scheduled tasks running on their own schedules concurrently without executions being dropped, duplicated, or misattributed to the wrong task.
- **SC-007**: An owner can manually trigger a task and observe its outcome without waiting for its next scheduled occurrence.

## Assumptions

- The system runs as a single, persistent, always-on instance; coordinating scheduled execution correctly across multiple concurrently running instances of the system is out of scope for this feature.
- The set of models an owner can assign to a task is a curated, fixed catalog decided at the infrastructure level, not an arbitrary free-text model name.
- "Internal capabilities" a task's model may use are exactly the native capabilities this server already exposes to connected assistants today (e.g. sending email, sending a messaging notification, file operations) — no new capability is introduced by this feature itself.
- No automatic retry is performed for a failed execution; a task's own next scheduled occurrence is the natural retry mechanism. This is an intentional design choice, not a gap.
- A task definition is a single, addressable unit of storage editable through the system's existing general-purpose storage/file interface, in addition to the dedicated management interface — both are views onto the same underlying definition.
- Default time zone for a task that doesn't specify one is a single system-wide default.
- Owners are the only actors who interact with the management interface, manual triggers, and execution history; this feature does not introduce any new class of user.
- The dedicated management interface launches in the system's default language only; translating it into the other languages already supported elsewhere in the product is explicitly deferred beyond this feature's initial scope.
