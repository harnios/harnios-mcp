# Contract: `os/changes/<slug>/` file format

Read/written entirely with the existing native tools (`create_file`, `read_file`, `update_file`,
`list_directory`) — no dedicated code enforces or validates this format server-side (same trust
model as Scheduled Tasks' raw-file-edit path and every other convention-only file shape in this
system: `os/routing.md`, skill anatomy, etc.). `change-process.md` (the tool content) is the
single source of truth an assistant follows to produce files matching this contract.

## `os/changes/<slug>/spec.md`

```markdown
---
type: change-proposal
status: draft
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# <Short title of the request>

## What's needed

<Plain-language description of what the owner asked for.>

## Why

<Why this isn't already covered by an existing skill/schedule/connection.>
```

`status` MUST be one of `draft` | `confirmed` | `implemented` | `discarded` (see
`data-model.md` for the transition rules). `updated` MUST be rewritten to the current date every
time any of the three files in this proposal changes.

## `os/changes/<slug>/plan.md`

```markdown
# Plan: <Short title>

## Files

- `os/skills/<name>.md` — new | modified — <one line: what it will contain>
- `os/schedules/<name>.md` — new | modified — <cron, model, one-line purpose>
- `os/routing.md` — modified — <new row being added>
- `data/<category>/` — new — <one line: what kind of content lives here, its shape>

## Approach

<Short prose: how the above accomplishes the request.>
```

Only list files this specific change actually touches — omit sections that don't apply (e.g. a
change with no schedule involved has no `os/schedules/*` line). A `data/<category>/` line only
appears when the request establishes a place and shape for a kind of business content that has
never existed before (FR-003) — never for adding an instance to a category that already exists
(that's everyday activity, not a Change Proposal at all). When a `data/<category>/` line is
present, the plan MUST also state whether a companion skill for future instances of that category
is being created in the same change, or explicitly note why one isn't needed (FR-015).

## `os/changes/<slug>/tasks.md`

```markdown
# Tasks: <Short title>

- [ ] Create `data/<category>/` and its template shape
- [ ] Create `os/skills/<name>.md`
- [ ] Create `os/schedules/<name>.md`
- [ ] Update `os/routing.md`
```

One checklist line per file listed in `plan.md`, in the order they should be created. Checked off
(`- [x]`) as each is actually written during implementation — this is the resumability mechanism
(spec.md FR-012): if implementation is interrupted, resuming re-reads this file and completes only
the unchecked lines.

## Slug derivation and collision handling

- `<slug>`: short, kebab-case, derived automatically from the request (e.g. a request about a
  daily expiring-policy report → `rapporto-polizze-scadenza`). Never asked of the owner.
- Before creating a new proposal, `list_directory "os/changes/"` to check for an existing entry
  with the same derived slug. If one exists and represents a *different* request, append `-2`,
  `-3`, etc. until the slug is free. If it's the *same* request being revised (still `draft`), reuse
  it in place rather than creating a duplicate.

## Discoverability (FR-009)

`os/changes/` is a normal, listable directory (not dot-prefixed) — a connected assistant can
always `list_directory "os/changes/"` to find proposals in any status, including resuming a
`draft` or `confirmed` one across sessions.
