# Phase 0 Research: OS Change Process

## 1. Where the new engine resource lives

**Decision**: A fourth code-bundled engine markdown file, `frontend/lib/os/engine/change-process.md`
(front matter `type: engine`, `tool: get_change_process`), registered in
`frontend/lib/mcp-tools/engineTools.ts`'s `ENGINE_TOOLS`/`ENGINE_CONTENT` exactly like
`engine.md`/`init.md`/`os-upgrade.md` — same `registerGatedTool` call, same empty input schema,
same "return the whole file as text" tool body.

**Rationale**: This is the established pattern for "long-form instructions a connected assistant
should read and follow" (spec 016). Reusing it means zero new architecture — no new tool
registration mechanism, no new resource-delivery mechanism, no new gating/disable logic (tool
disable already applies uniformly via `registerGatedTool`). It also means `get_change_process`
shows up in `tools/list` immediately once the app is redeployed, with no per-instance action
needed — see §4.

**Alternatives considered**: A new kind of "workflow" MCP tool with structured input/output
(e.g. a stateful `propose_change`/`confirm_change` tool pair) was rejected — it would be new
tool-architecture where none is needed (the constraint from this feature's origin: prefer existing
tools/patterns, only add new tool *machinery* when the plain-file approach genuinely can't work).
The entire process — explore, draft files, present in chat, wait for confirmation, write files —
is expressible with the six file tools (`read_file`, `create_file`, `update_file`,
`list_directory`, plus the two already used for skills) that already exist.

## 2. What get_os_init keeps doing vs. what it stops doing

**Decision**: `init.md`'s Phase 1 (interview) is trimmed to only the questions whose answers are
needed as shared context for *any* future skill — company name/what-you-do, who works there,
tone/language — and Phase 3 writes only `os/identity.md` from those answers, plus the
always-universal bookkeeping files that don't encode a guess about business type:
`os/routing.md` (empty table), `data/index.md`, `data/inbox.md`. Phase 2 (the activity-type →
skills/policies decision table) and every domain-skill blueprint (`daily-plan.md`,
`project-status.md`, `weekly-review.md`, `article.md`, `schedule.md`,
`commercial-proposal.md`, `client-onboarding.md`, `lead.md`, `product.md`) and every policy file
(`pricing.md`, `delivery.md`, `communication.md`) are removed from `init.md` entirely — none of
them are created during first-time setup, regardless of business type.

**Rationale**: FR-001 (spec.md). `os/identity.md` is retained because it is *descriptive fact*
(what the clarify session distinguished from a "way of doing things" or "rule") that every future
skill/schedule created through the change process will need to read — re-asking "what's your
company name and tone" as part of the very first real request would be worse UX than asking it
once, and it doesn't encode any guess about which skills the business needs. `os/routing.md`,
`data/index.md`, `data/inbox.md` are kept empty/near-empty because they are the same "always
exists, never guesses content" bookkeeping scaffolding this project already treats as baseline
(confirmed by the Company OS's own `os/AGENTS.md` router pattern, which lists `data/index.md` as
a mandatory first-read regardless of business type).

**Alternatives considered**: Removing `os/identity.md` too (interview asks nothing at all) — this
was floated during the planning conversation but not adopted: the identity questions aren't
"pre-creating a capability," they're facts the change process would otherwise have to elicit
inside the very first spec it writes, coupling an unrelated onboarding question to whatever the
owner's first real request happens to be.

## 3. AGENTS.md / os-engine-version propagation

**Decision**: `engine.md` gets `os-engine-version: 2` and a new `### v2` changelog entry
describing the new capability. The **Build** section's fixed body content gains one line (mirroring
the existing "call `get_os_init` for business setup" line) telling the connected assistant to call
`get_change_process` before making a structural change. Existing instances receive this the same
way they'd receive any other engine change: `get_os_upgrade`'s existing compare-and-confirm
procedure (unchanged) surfaces the new `### v2` entry, summarizes it, and only rewrites `AGENTS.md`
after the owner confirms.

**Rationale**: FR-010/FR-011 and Success Criterion SC-005. This is not a new propagation
mechanism — it's the exact one `engine.md` already defines and `os-upgrade.md` already implements
(confirmed by reading both files in full). The new tool (`get_change_process`) itself becomes
callable on every instance the moment the app is redeployed, with no per-instance action at all
(MCP `tools/list` is a function of the deployed code, not of `AGENTS.md`'s content) — but whether
the *connected assistant knows to call it unprompted* depends on `AGENTS.md` mentioning it by name,
exactly as today's `AGENTS.md` mentions `get_os_init` by name for setup. That's the one piece that
needs the confirm-before-rewrite gate, because `AGENTS.md`'s content is deliberately
version-controlled and never silently rewritten (existing invariant, unchanged by this feature).

**Alternatives considered**: Skipping the `os-engine-version` bump and relying solely on
`get_change_process`'s own tool description to prompt self-triggering (the way `get_os_init`
"self-triggers" by checking `data/` on every task). Rejected: unlike `get_os_init`'s self-trigger
(which is read from *inside* `init.md`, itself only reachable once an assistant already knows to
call it — bootstrapped by `AGENTS.md` mentioning it), a completely new tool with no mention
anywhere in the router file an assistant reads first is much less likely to be noticed and invoked
at the right moment. Reusing the existing versioned-changelog gate costs nothing extra and matches
established behavior.

## 4. Change proposal file format and identity

**Decision**: `os/changes/<slug>/` holds three files: `spec.md` (front matter `type:
change-proposal`, `status: draft|confirmed|implemented|discarded`, `created`, `updated` — body:
what is needed and why, in plain language), `plan.md` (which files will be created/changed, and
how), `tasks.md` (a Markdown checklist, `- [ ]`/`- [x]`, one line per concrete step — the same
resumability mechanism confirmed in the clarify session: after confirmation, completed checklist
items are checked off as each file is actually written, so an interrupted implementation can be
resumed by completing only what's still unchecked, per FR-012). `status` lives only in `spec.md`'s
front matter as the single source of truth — `plan.md`/`tasks.md` don't duplicate it.

`<slug>` is derived automatically from the request (short, kebab-case, human-readable — e.g.
`rapporto-polizze-scadenza`), never typed by the owner (FR-014, deliberately different from
Scheduled Tasks' owner-typed name, since a Scheduled Task is a first-class thing the owner
names deliberately in a dedicated UI, while a change proposal is an ephemeral-then-historical
artifact of a conversation). On a slug collision with an existing `os/changes/` entry that is not
itself the same in-progress request, append a numeric suffix (`-2`, `-3`, ...) rather than
overwriting — mirrors how `list_directory`/`find_files_by_name` already require exact paths, no
special collision-handling exists elsewhere to reuse.

**Rationale**: Matches the clarify-session decisions directly (interrupted-implementation resume,
post-completion retention, automatic slug derivation) and reuses the same "plain Markdown file
with YAML front matter" shape every other entity in this system already uses (Scheduled Tasks,
skills, policies) — no new file format concept.

**Alternatives considered**: A single combined `os/changes/<slug>.md` file instead of a
three-file directory. Rejected: the spec/plan/tasks split mirrors this very repo's own
`speckit-specify`/`speckit-plan`/`speckit-tasks` separation (spec = what/why in plain language,
plan = concrete approach, tasks = checklist) deliberately, since that separation is the whole
reason this feature exists — collapsing it back into one file would blur the boundary between "what
was asked for" and "what will be done," which matters for a later resumed session that needs to
re-read only the plan without re-parsing prose.

**Visibility**: Unlike `.scheduler/`, `.messaging/`, `.external-mcp/`, `.mcp-tools/` (dot-prefixed,
excluded from `list_directory`/`list_directory_tree`/`/files` per existing convention), `os/changes/`
is a normal, fully listable directory — FR-009 requires it to be discoverable by a connected
assistant checking for resumable drafts, which a hidden/excluded path would defeat.

## 5. Scope of "structural" extends to first-time data categories

**Decision**: The gate applies not only to skills/schedules/routing/policies/connections, but also
to establishing a place and shape for a kind of business content that has never been tracked
before (e.g. the first time anything is tracked as a "project," not the second or third project
under an already-established shape). `change-process.md`'s explore step therefore also checks
whether the business's own content area already has a place for the kind of thing being asked
about, not only whether a skill/schedule for it exists. When a change proposal establishes a new
kind of content, its `plan.md` MUST also consider whether creating a companion skill for handling
future instances of that same kind of content belongs in the same change (FR-015) — this is how
the old `init.md`'s upfront `client-onboarding`-style skills now come into existence: on demand,
the first time they're actually needed, rather than guessed at setup time.

**Rationale**: Corrects an initial under-scoping caught during planning — the first draft of this
feature treated all of the business's own content area as unconditionally "everyday," which missed
that *deciding where and how a new kind of thing lives* is exactly as structural a decision as
adding a new skill; only *using* an already-decided shape is everyday work. Folding this into the
same single `get_change_process` document (rather than a separate mechanism) keeps one gate and
one mental model for "is this the first time, or the nth time" regardless of what kind of thing is
involved.

**Alternatives considered**: A separate, second gate specifically for new content categories was
considered and rejected — it would require the connected assistant to hold two different mental
models of "when do I need to propose something" depending on whether the request looks like a
skill/schedule or a content category, when the two cases are the same shape of decision (first
time vs. nth time) and belong in the same document for the same reason a single `get_os_engine`
handles build/repair/pre-existing-instance cases together rather than as separate tools.

## 6. Testing approach

This repo has no automated test framework (confirmed unchanged since spec 031/032). Verification
is manual, via `quickstart.md`, following the same approach as every prior feature.
