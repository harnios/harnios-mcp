---
type: engine
tool: get_change_process
---

# Change process — proposing, confirming, and implementing structural change

Self-contained instructions for the only thing the `get_change_process` tool is responsible for:
deciding whether something the owner asked for is a **structural change**, and if so, walking it
through description → plan → confirmation → implementation before anything is written. It never
touches `AGENTS.md` itself (that's `get_os_engine`/`get_os_upgrade`) and never runs the first-time
business-setup interview (that's `get_os_init`).

---

## When this applies

A request is a **structural change** — and goes through the whole procedure below — when it would:

- Create or modify a way-of-doing-things (a skill, under `os/skills/`).
- Create or modify a schedule (under `os/schedules/`).
- Change `os/routing.md` or a rule (a policy, under `os/policies/`).
- Require a new externally-configured connection (a new MCP connection the owner would set up).
- Establish, **for the first time**, a place and shape for a kind of business content that has
  never been tracked before (e.g. the first time anything is tracked as a "project," not the
  second or third project once that shape already exists).

Everything else is **everyday activity** and stays immediate, exactly as it always has:

- Using a way-of-doing-things that already exists.
- Running or reusing a schedule that already exists.
- Reading or writing content within a kind of business content that already has an established
  place and shape — no matter how important that content is to the business.

If you're not sure which one a request is, the test is always: *does this decide where or how
something will be done from now on, or is it just doing the thing?* Deciding is structural. Doing
is everyday.

---

## Rule zero — explore before proposing

Before drafting anything:

1. `list_directory "os/skills/"`, `list_directory "os/schedules/"`, and `read_file
   "os/routing.md"` (if it exists) to see what already covers similar ground.
2. If the request concerns a kind of business content, check whether it already has an
   established place — look for an existing folder/template shape for that kind of thing in the
   business's own content area (not `os/`).
3. If everything the request needs already exists, this **isn't** a structural change — just do
   it, immediately, no proposal.
4. If it isn't already achievable, continue to **Draft a proposal** below.

---

## Draft a proposal

1. Derive `<slug>`: short, kebab-case, human-readable, from the request itself (e.g. a request
   about a daily expiring-policy report → `rapporto-polizze-scadenza`). Never ask the owner to
   name it.
2. `list_directory "os/changes/"`. If an entry with this slug already exists:
   - Same request, still `draft` → reuse it in place (this is a revision, not a new proposal).
   - A different request → append `-2`, `-3`, ... until the slug is free.
3. Write three files at `os/changes/<slug>/`, in `os/language` (read that file; English if it
   doesn't exist):

   **`spec.md`** — front matter `type: change-proposal`, `status: draft`, `created`/`updated` in
   `YYYY-MM-DD`. Body: what's needed, and why it isn't already covered by something that exists.
   Plain language — this is what gets shown to the owner, not a technical document.

   **`plan.md`** — the concrete files this change will create or modify: a skill
   (`os/skills/<name>.md`), a schedule (`os/schedules/<name>.md`), an `os/routing.md` update, a
   policy, and/or — when the request establishes a new kind of business content — its place and
   shape (a new folder plus template under the business's own content area). When a new kind of
   content is being established, **also state** whether a companion way-of-doing-things for
   handling future instances of it belongs in this same change, or say why one isn't needed. Only
   include the parts that actually apply to this request.

   **`tasks.md`** — one checklist line (`- [ ]`) per file named in `plan.md`, in the order they'll
   be created.

4. **Nothing outside `os/changes/<slug>/` gets touched at this stage — not one file, not even a
   single empty folder.** This means no `create_directory` and no `create_file` anywhere else yet,
   including the business's own content area (e.g. don't create `data/polizze/` "to get started" —
   its creation is itself one of the confirmed steps in **Implement** below, not something to do
   ahead of time). If you find yourself about to write anything with a path that isn't under
   `os/changes/<slug>/`, stop — that write belongs in **Implement**, after confirmation, not here.
5. Fixed names: any new path this change will eventually create — a skill file, a schedule file, a
   folder for a new kind of business content — uses the same fixed English convention already
   established in this Company OS (e.g. `data/`, never a translated word like `dati/`), regardless
   of `os/language`. Only the *content* of files is written in `os/language`; paths are not
   translated. State the exact path in `plan.md` exactly as it will be created.

---

## Transcribing data accurately

When the request involves converting or importing data from an attached file (a spreadsheet, an
exported table, anything with rows and columns) into a CSV, follow this checklist — silent,
small transcription mistakes here are the most damaging failure this whole process can produce,
because they look like success (a file gets created, nothing errors) while actually recording
wrong data:

1. **Never skip an empty cell.** If a column has no value for a row, write that field as empty in
   the CSV — still in its own position. Skipping it instead of leaving it empty shifts every
   column after it by one, silently corrupting the whole row.
2. **Verify column counts before saving.** After building each row, count its fields and compare
   to the number of columns in the header. They must match exactly, for every row. If they don't,
   find and fix the misalignment before writing the file — don't save first and hope.
3. **Convert date serial numbers.** A date that appears as a plain number (typically in the
   40000–50000 range in spreadsheet exports) is a serial date, not a value to copy literally —
   convert it to a real calendar date (day 0 is 1899-12-30) before writing it.
4. **Quote fields that contain a comma, a quote character, or a line break** — standard CSV
   quoting. An unquoted comma inside a field (e.g. an address like "Via Roma, 4") splits that
   field into two, corrupting every column after it, the same way a skipped empty cell does.
5. **When this change also creates a companion skill** for handling future updates of this same
   data (see below), include this exact checklist in that skill's own instructions — the same
   care needs to apply every time the data is updated, not only the first time.

---

## Get confirmation

1. Present, in chat, in `os/language`: what `spec.md` says (what's needed and why) and what
   `plan.md` says (what will be created or changed). Keep it short and plain — the owner is
   approving a summary, not reading the files themselves.
2. Wait for an explicit answer.
   - **Confirmed** → set `spec.md`'s `status: confirmed`, updated to today, and move to
     **Implement** below.
   - **Declined, or the owner asks for changes** → revise `spec.md`/`plan.md`/`tasks.md` in place
     (same slug, still `draft`) and present again — or, if the owner wants to abandon it entirely,
     set `status: discarded`. Either way, nothing outside `os/changes/<slug>/` is touched.
   - **No answer yet / owner moves on to something else** → leave it as `draft`. It stays exactly
     as it is, discoverable the next time anyone lists `os/changes/`.

---

## Implement

1. Re-read `tasks.md`. Do only what's still unchecked — if some lines are already checked (a
   previous session started this same change and was interrupted), pick up from there. Never redo
   a step that's already checked, never restart the proposal from scratch.
2. For each unchecked line, create or modify exactly the file `plan.md` describes for it, then
   check it off (`- [x]`) before moving to the next line.
3. When every line in `tasks.md` is checked, set `spec.md`'s `status: implemented`, updated to
   today.
4. `os/changes/<slug>/` is never deleted or moved once implemented — it stays in place as a
   historical record of what was asked for and why.

---

## If it can't be done with what's available

If, during **Rule zero** or while drafting the plan, you find the request genuinely can't be
satisfied with the native tools already available:

1. First consider whether a new externally-configured connection (a new MCP connection the owner
   sets up) would close the gap. If so, the plan proposes that, and the owner configures it — this
   is still the normal confirm-then-implement flow above, just with "the owner sets up a
   connection" as one of the steps.
2. Only if that's also insufficient, say so plainly and propose that a developer build something
   new. Never invent or pretend to have a capability that doesn't exist — an honest "this needs
   custom development" is always better than a fabricated result.
