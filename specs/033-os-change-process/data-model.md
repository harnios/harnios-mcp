# Phase 1 Data Model: OS Change Process

## Change Proposal

A structural change that has been described and planned, stored at `os/changes/<slug>/`.

| File | Purpose | Front matter | Body |
|---|---|---|---|
| `spec.md` | What is needed and why, in plain non-technical language. Single source of truth for `status`. | `type: change-proposal`, `status`, `created`, `updated` | Plain-language description of the request and why it isn't already covered by something that exists |
| `plan.md` | Concrete technical approach | (none required) | Which files will be created or modified (e.g. new skill at `os/skills/<name>.md`, new schedule at `os/schedules/<name>.md`, an edit to `os/routing.md`), and how |
| `tasks.md` | Resumable checklist | (none required) | `- [ ]` / `- [x]` lines, one per concrete step from the plan |

**`status` values** (in `spec.md` front matter only):

- `draft` — described and planned, not yet confirmed by the owner. Can be revised in place (the
  same files get rewritten) or explicitly discarded.
- `confirmed` — the owner has agreed; implementation is in progress. `tasks.md` tracks which
  steps are already done.
- `implemented` — every task in `tasks.md` is checked off. The proposal is never deleted or moved
  at this point — it remains as a historical record (FR-013).
- `discarded` — the owner explicitly abandoned it before implementation. Kept in place (never
  deleted) for the same reason `implemented` proposals are kept — simpler than adding
  deletion logic, and consistent handling for every terminal state.

**State transitions**:

```
draft --(owner confirms)--> confirmed --(all tasks checked)--> implemented
draft --(owner revises)--> draft   (spec.md/plan.md/tasks.md rewritten in place, same slug)
draft --(owner discards)--> discarded
confirmed --(interrupted, resumed)--> confirmed   (tasks.md unchanged except newly-checked items)
```

There is no transition out of `implemented` or `discarded` — both are terminal.

**`<slug>`**: Derived automatically (short, kebab-case, human-readable) from the request that
prompted the proposal — never typed by the owner. On collision with an existing, *different*
`os/changes/` entry, a numeric suffix is appended (`-2`, `-3`, ...) rather than overwriting.

**Relationships**:

- A `confirmed`/`implemented` Change Proposal's `plan.md` names zero or more **Skill** files
  (`os/skills/<name>.md`) and zero or more **Schedule** files (`os/schedules/<name>.md`) it
  creates or modifies, may name a change to `os/routing.md` or a policy file, and — when the
  request concerns a kind of business content that has never been tracked before — the new
  **Data Category**'s place and shape (a new folder plus its template shape under the business's
  own content area), optionally paired with a new companion Skill for future instances of it
  (FR-015).
- A Change Proposal never modifies `AGENTS.md` itself or its `os-engine-version` — that remains
  exclusively `get_os_engine`'s responsibility (unchanged invariant from spec 016).

## Pre-existing entities referenced, not modified by this feature

- **Skill** (`os/skills/<name>.md`): a repeatable capability, plain Markdown, routed to from
  `os/routing.md`. This feature governs *how a new one comes into existence* (via a Change
  Proposal) but does not change what a Skill file is or how it's read/executed.
- **Schedule** (`os/schedules/<slug>.md`, spec 032): a recurring, automatically-triggered task
  with cron/model/timezone front matter. This feature governs *when creating or editing one
  requires a Change Proposal* (any create/modify of its cron, model, or existence — not its
  one-off manual trigger or execution history) but does not change the Schedule file format or
  the scheduler runtime itself.
- **Data Category** (a folder + template shape under the business's own content area, e.g.
  `data/progetti/`): not introduced by any prior feature — it's the pre-existing, purely
  conventional way this system already organizes business content (mirrors `data/clients/`,
  `data/projects/` as previously hand-created by `get_os_init`'s now-removed Phase 2). This
  feature governs *the first time one is established* (a structural change) but does not govern
  reading or writing content within one that already exists, nor define any new file format for
  it beyond what the business's own conventions already use.
