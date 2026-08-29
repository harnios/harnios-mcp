# Tasks: OS Change Process

**Input**: Design documents from `/specs/033-os-change-process/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Not included — this repo has no automated test framework (plan.md, Technical Context: Testing), and tests were not explicitly requested. Verification is manual, via [quickstart.md](./quickstart.md), matching every prior feature in this repo.

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation and testing of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- File paths are exact and relative to the repo root

**No Setup or Foundational phase**: this feature adds no dependency, no config, and no
infrastructure shared by literally every story — the only genuinely shared file (`engine.md`) is
scoped to User Story 1's phase below, since Users Story 3 and 2 don't need it at all, and User
Story 4 only needs it *after* User Story 1 has produced it (see Dependencies).

---

## Phase 1: User Story 1 - Owner gets a new recurring capability built safely through conversation (Priority: P1) 🎯 MVP

**Goal**: An owner describes a new recurring need in chat; the connected assistant recognizes it
requires new structure, drafts a plain-language proposal and a concrete plan, gets explicit
confirmation, then creates exactly what was described.

**Independent Test**: quickstart.md Scenario 2 (propose → decline → confirm → verify, a new
recurring capability), Scenario 4 (interrupted implementation resumes without redoing finished
steps), and Scenario 6 (propose → confirm → verify, a new kind of business content plus its
companion skill).

### Implementation for User Story 1

- [X] T001 [P] [US1] Create `frontend/lib/os/engine/change-process.md` (front matter `type: engine`, `tool: get_change_process`) — the propose → confirm → implement playbook: when to trigger (creating/modifying a skill, creating/modifying a schedule, editing `os/routing.md` or a policy, requesting a new external connection, **or establishing a place and shape for a kind of business content that has never been tracked before**) vs. what stays immediate (using something that exists, or reading/writing content within an already-established kind of business content); the explore-first step against `os/skills/`, `os/schedules/`, `os/routing.md`, **and the business's own content area** (does this kind of thing already have a place?); drafting `os/changes/<slug>/{spec.md,plan.md,tasks.md}` per `contracts/change-proposal-files.md` (automatic slug derivation, collision suffixing, the optional `data/<category>/` plan line and its FR-015 companion-skill consideration); the chat-confirmation gate before writing anything; implementing by checking off `tasks.md` as each file is written (the resumability mechanism — re-reading `tasks.md` on resume and completing only unchecked lines); marking `spec.md`'s `status: implemented` when done, never deleting a proposal; and the last-resort escalation (propose a new external connection first, an external dev task only if that's also insufficient — never fabricate a capability)
- [X] T002 [US1] Add `"change-process"` to `ENGINE_CONTENT` and a `get_change_process` entry (name/title/description per `contracts/get-change-process-tool.md`) to `ENGINE_TOOLS` in `frontend/lib/mcp-tools/engineTools.ts` (depends on T001)
- [X] T003 [P] [US1] Update `frontend/lib/os/engine/engine.md` per `contracts/engine-content-changes.md`: bump `os-engine-version` front matter to `2`, add one line to the **Build** section's fixed body content pointing to `get_change_process` (alongside the existing `get_os_init` line), add a `### v2` entry under **Changelog** describing the addition

**Checkpoint**: User Story 1 is fully functional and independently testable — run quickstart.md Scenarios 2, 4, and 6.

---

## Phase 2: User Story 2 - Everyday work stays instant (Priority: P2)

**Goal**: Using an existing skill/schedule, or reading/writing everyday `data/` content, never
triggers a proposal-and-confirmation step — no regression from User Story 1's gate.

**Independent Test**: quickstart.md Scenario 3.

### Implementation for User Story 2

- [ ] T004 [US2] Verify no regression: with User Story 1 in place, run quickstart.md Scenario 3 — using an existing skill/schedule again, and writing/reading ordinary `data/` content, must both complete immediately with no `os/changes/` entry created and no confirmation requested (depends on T001, T002, T003 existing to verify against; produces no file changes of its own)

**Checkpoint**: User Stories 1 AND 2 both hold — run quickstart.md Scenario 3.

---

## Phase 3: User Story 3 - A brand-new instance starts genuinely empty (Priority: P3)

**Goal**: First-time setup creates only `os/identity.md` plus the already-universal
`os/routing.md`/`data/index.md`/`data/inbox.md` scaffolding — no skill, policy, or template is
pre-created based on a guessed business type.

**Independent Test**: quickstart.md Scenario 1.

### Implementation for User Story 3

- [X] T005 [P] [US3] Trim `frontend/lib/os/engine/init.md` per `contracts/engine-content-changes.md`: remove **Phase 2 — Decide the structure** entirely; remove the `os/policies/*.md` subsections and the whole **Domain skills** subsection from **Phase 3 — Write**; remove the now-unused conditional interview question blocks ("If there's services being sold", "If there's a product", the "what you do NOT do" optional question) from **Phase 1 — Interview**; update **Phase 4 — Report**'s "next step" wording to point at `get_change_process` instead of a business-type-specific suggestion; update the file's own header description and the **Rules** section to drop the "create only what the type calls for" bullet — keep `os/routing.md` (empty table), `os/identity.md` (filled from the retained interview answers), `data/index.md`, `data/inbox.md` creation exactly as they are

**Checkpoint**: User Story 3 holds — run quickstart.md Scenario 1.

---

## Phase 4: User Story 4 - Existing instances gain the capability without manual work (Priority: P4)

**Goal**: An instance set up before this feature existed is offered this capability through the
existing `get_os_upgrade` confirm-before-rewrite flow, with no pre-existing skill/schedule/policy
altered.

**Independent Test**: quickstart.md Scenario 5.

### Implementation for User Story 4

- [ ] T006 [US4] Verify upgrade delivery: on an instance whose `AGENTS.md` still records `os-engine-version: 1`, run quickstart.md Scenario 5 — `get_os_upgrade` must surface the `### v2` changelog entry from T003 in plain language, rewrite nothing until the owner confirms, and after confirming, leave every pre-existing skill/schedule/policy on that instance untouched (depends on T001, T002, T003; produces no file changes of its own — `os-upgrade.md`'s existing generic compare-and-confirm procedure needs no code change)

**Checkpoint**: All four user stories hold — run quickstart.md Scenario 5.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation and internal consistency across the three edited/created engine files

- [X] T007 Read `change-process.md` (T001), the updated `engine.md` (T003), and the updated `init.md` (T005) together end-to-end: confirm no leftover reference to the removed Phase 2 table, removed domain skills, or removed policy files anywhere across the three, and consistent terminology for "structural change" across all three. Found and fixed three stale references in `engine.md` (its header, Rule Zero, and Build step 4 still said "call `get_os_init`" for policies/domain skills, which now belong to `get_change_process`; the Build step's "business setup / repair / extend / start-over" line still mentioned the "extend" flow removed from `init.md`). Also confirmed `os/templates/<lang>/AGENTS.md` references in `frontend/lib/i18n/languages.ts`/`frontend/lib/os/init.ts` are the unrelated `/init`-stub template directory, not the removed business-object templates — no conflict.
- [ ] T008 Run quickstart.md Scenarios 1–6 end-to-end in order against a disposable instance; fix any deviations found

---

## Dependencies & Execution Order

### Phase Dependencies

- **User Story 1 (Phase 1)**: No dependencies — start immediately. This is the MVP.
- **User Story 2 (Phase 2)**: Depends on User Story 1 being complete (there's nothing to verify "no regression" against otherwise)
- **User Story 3 (Phase 3)**: No dependency on User Story 1 — `init.md` (T005) is a fully independent file. Can be built in parallel with Phase 1.
- **User Story 4 (Phase 4)**: Depends on User Story 1 (T001–T003) — its entire verification exercises the `### v2` changelog entry T003 produces
- **Polish (Phase 5)**: Depends on all four user stories being complete

### Within Each Phase

- US1: T001 and T003 are independent files [P]; T002 needs T001 (imports its content into the same registration array)
- US2: T004 needs Phase 1 complete (nothing to verify against otherwise)
- US3: T005 has no dependency on any other task
- US4: T006 needs T001–T003 (Phase 1 complete)

### Parallel Opportunities

- T001 and T003 can be built in parallel (different files)
- T005 (User Story 3) can be built in parallel with all of Phase 1 (User Story 1) — different file, no shared dependency
- T004 and T006 cannot start until Phase 1 is complete, but once it is, they're independent verifications of different things and can run in parallel

---

## Parallel Example: Phase 1 + Phase 3 together

```bash
# These two can be worked on at the same time — different files, no shared dependency:
Task: "Create frontend/lib/os/engine/change-process.md"
Task: "Trim frontend/lib/os/engine/init.md"

# Once change-process.md exists:
Task: "Update frontend/lib/os/engine/engine.md (version bump, Build line, v2 changelog)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: User Story 1 (T001–T003)
2. **STOP and VALIDATE**: quickstart.md Scenarios 2 and 4 — a new recurring capability can be
   proposed, confirmed, implemented, and resumed if interrupted
3. This alone proves the entire value proposition (spec.md, User Story 1's "Why this priority")

### Incremental Delivery

1. User Story 1 → validate independently → the gated change process works end-to-end (MVP)
2. User Story 2 → validate independently → confirms no regression in everyday speed
3. User Story 3 → validate independently → first-time setup is genuinely minimal (can be built any time, even before/in parallel with User Story 1)
4. User Story 4 → validate independently → already-existing instances (e.g. already-onboarded clients) can receive the capability via the existing upgrade flow
5. Polish → confirm every Success Criterion in spec.md holds

---

## Notes

- No test tasks: this repo has no automated test framework — verification is the quickstart.md walkthrough, matching every prior spec here (031, 032, …).
- [P] tasks touch different files with no unmet dependency — safe to parallelize (multiple engineers or multiple agent sessions).
- [Story] labels trace every task back to spec.md's User Story 1/2/3/4.
- User Stories 2 and 4 are verification-only by design — their entire value is guaranteeing that User Story 1's change doesn't regress existing behavior, and that it reaches already-existing instances through a mechanism (`get_os_upgrade`) that already exists unmodified.
- Commit after each task or logical group, per repo convention (see recent commit history: one focused commit per spec-numbered change).

### Post-launch hardening (2026-08-29, T001/T003 revisited)

Real-world testing against a live client instance the same day the feature shipped (T008's
end-to-end validation, done manually with real models instead of a synthetic quickstart run)
found two gaps with a weaker connected model (Mistral via Chatbox) that a stronger one (Claude,
both via product and via raw API) didn't have:

1. The gate never triggered at all — the one-line pointer to `get_change_process` in `engine.md`'s
   Build section depends on the model recognizing, unprompted, that the current request matches
   its description. Fixed by additionally stating the same trigger list as its own explicit
   "never" rule in `AGENTS.md`'s body (`os-engine-version` `2` → `3`) — see
   `contracts/engine-content-changes.md`'s follow-up section for the exact wording.
2. A CSV conversion had every column shifted by one position (a skipped empty cell) and an
   unconverted date serial number. Fixed by adding a "Transcribing data accurately" checklist to
   `change-process.md` (not version-gated — takes effect on the next call, no upgrade needed).

Both fixes are content-only (no code/registration changes) — re-run quickstart.md Scenario 6
(and ideally the same Mistral scenario) to confirm before considering this closed.
