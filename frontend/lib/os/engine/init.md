---
type: engine
tool: get_os_init
---

# Init — business identity setup

Self-contained instructions for standing up (or continuing) the minimal business-identity side of
a Company OS: `os/identity.md`, `os/routing.md`, `data/index.md`, and `data/inbox.md`. Never
touches `AGENTS.md` itself, its `os-engine-version`, or the engine's write-rules — call the
`get_os_engine`/`get_os_upgrade` tools for that. Everything else — skills, schedules, policies,
and any new kind of business content — comes from the `get_change_process` tool, the first time
it's actually needed, never guessed at upfront here.

## When to use it

Trigger words: "init", "initialize", "setup os", "create the structure" — the human-facing phrases
an owner actually says. It also **self-triggers**: see **Self-trigger** below.

**Before anything else, on every call**: `read_file "AGENTS.md"`. If it has no
`os-engine-version` in its front matter (the `/init`-written stub, or an older file predating this
field), call the `get_os_engine` tool first and follow its Build or Repair instructions —
`AGENTS.md` must end up with a valid `os-engine-version` at the same time as, or before, anything
in this file gets written. Never leave the owner with a fully set-up identity but a still-stub
`AGENTS.md`.

---

## Self-trigger

As the first step of every task (not just ones about setup), `list_directory "data/"`. If it's
missing or has no entries, business identity setup hasn't happened yet — offer to run it before
doing anything else, rather than requiring the owner to know a special phrase for it. Do this
check every single task; never cache the result for the rest of a session, since business data can
appear or disappear mid-session.

If `data/` already has content, skip straight to whatever the owner actually asked for — never
re-offer this setup once it's been completed.

---

## Rule zero — never destroy

Before writing anything:

1. `list_directory "os/"` and `list_directory "data/"`.
2. If `data/` already has content: setup already happened. **Do not re-run it.** Report what
   already exists and ask which of these the owner wants:
   - **repair** — create only the missing pieces, without touching existing ones
   - **start over** — overwrites `os/identity.md`, `data/index.md`, and `data/inbox.md`. Proceed
     **only** with explicit confirmation that the owner understands they will lose the current
     content.
3. Never touch `AGENTS.md` here — if it needs building or repairing, that's a separate step
   handled by the `get_os_engine` tool, before or after this one (see "Before anything else, on
   every call" above).

---

## Phase 1 — Interview

Ask these questions in a single block, in `os/language` (read that file; English if it doesn't
exist), then **stop and wait**. Create nothing before the answers.

1. Company name and one sentence: what you do, for whom, what problem you solve.
2. Predominant activity — one of: `project work` · `consulting` · `product` · `mixed`.
3. Who works there: names and roles (needed for the `owner` fields). If it's just you, your own
   name.
4. Tone of voice in one line, or "default" (direct, plain, no fluff). If you have two texts of
   your own — one you like, one you'd never use — paste them: they're worth more than any
   description.

---

## Phase 2 — Write

For every blueprint below, **use the interview's answers** — `identity` is born **filled in**, not
with placeholders. Whatever the owner didn't provide stays as `<!-- to ask -->`, never invented.
Everything here is written in `os/language`.

### os/routing.md

Create (or extend, for **repair**) an empty Markdown table with just a header row: task/skill
description → skill file path. Nothing to list yet — the `get_change_process` tool adds a row here
the first time a skill actually gets created.

### os/identity.md ← fill in with answers 1, 2, 3

What we do (answer 1) · Predominant activity (answer 2) · Who we are (answer 3, with the names
you'll use in the `owner` fields).

### data/index.md

Empty, ready-to-fill tables: whatever categories of business content exist so far (none, on a
truly fresh setup). At the top: "first read of every task; whatever isn't here doesn't exist for
an agent." A new table section is added here the first time `get_change_process` establishes a new
kind of business content — never guessed upfront.

### data/inbox.md

Header + instruction: quick one-line-with-date capture. Processing it is itself a way-of-doing-
things that comes from `get_change_process` the first time the owner actually wants one, not
created here.

---

## Phase 3 — Report

Close out in chat, in `os/language`, not with more writes:

- **Created** — `os/identity.md`, `os/routing.md` (empty), `data/index.md`, `data/inbox.md`.
- **Still to fill in** — only the identity fields the owner left as `<!-- to ask -->`.
- **Next step** — always: "tell me what you need and I'll set it up" — whatever the owner asks
  for next (a report, a way of tracking something, anything else) goes through
  `get_change_process`, since nothing beyond identity is pre-built.

---

## Rules

- Interview first, writing after. Never get ahead of yourself.
- The answers get **used**: an OS born with identity already filled in is worth ten born full of
  `<!-- ... -->`.
- Never invent numbers, names, or facts that weren't given. `<!-- to ask -->`.
- This tool is the source of truth for the minimal identity skeleton. To change what counts as
  "minimal," this file changes (a code change, reviewed like any other) — an assistant never
  hand-patches file by file to "fix" the shape it produces.
- **Fixed names**: every folder/file created always uses the fixed English name given in this tool
  (e.g. `identity.md`, never a translated name) — regardless of the language confirmed for the
  Company OS. Only the content of the files is in the chosen language.
