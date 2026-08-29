# Contract: changes to existing engine content

These are content contracts for the three existing engine markdown files this feature modifies —
what must change, precisely, so an implementer doesn't have to re-derive it from prose.

## `frontend/lib/os/engine/engine.md`

- Front matter `os-engine-version`: `1` → `2`.
- **Build** section (the fixed content written into every `AGENTS.md`): add one line, next to the
  existing "call `get_os_init` for business setup" line, telling the assistant to call
  `get_change_process` before creating or modifying a skill, a schedule, `os/routing.md`, a
  policy, requesting a new external connection, or establishing a place and shape for a kind of
  business content that has never been tracked before.
- **Changelog** section: add a new entry:

  ```markdown
  ### v2

  - Added `get_change_process`: before creating or modifying a skill, a schedule, the routing
    table, or a policy — requesting a new external connection — or tracking a kind of business
    content for the first time — describe the change, plan it, and get explicit confirmation
    before writing anything. `AGENTS.md` now points to it alongside `get_os_init`.
  ```

- Nothing else in `engine.md` changes — Rule Zero, Repair, and Pre-existing (v0) instances stay
  exactly as they are; the confirm-before-rebuild gate they define already covers this version
  bump with no changes needed to that mechanism itself.

### Follow-up: `os-engine-version` `2` → `3` (post-launch hardening, 2026-08-29)

Real-world testing the same day found that a weaker connected model (Mistral, via Chatbox) never
called `get_change_process` at all for a request that should have triggered it — the one-line
pointer in **Build** ("call `get_change_process` before...") depends on the model deciding, on its
own, that the current request matches that description. A stronger model (Claude, both via the
Cowork product and via the raw API) handled this reliably; a weaker one did not.

- Front matter `os-engine-version`: `2` → `3`.
- **Build** section's "nevers" bullet: state the same trigger list (skill, schedule,
  `os/routing.md`, policy, external connection, new kind of business content) as its own explicit
  rule, in full, inside the "nevers" — not only as the separate pointer line. The rule itself is
  now always present in the one file every session reads first, independent of whether the model
  decides to look up a separate tool.
- **Changelog**: add a `### v3` entry documenting this (see `engine.md` for exact wording).
- The pointer line to `get_change_process` (added in v2) stays as well — the explicit rule and the
  pointer are complementary, not a replacement of one by the other.

## `frontend/lib/os/engine/change-process.md` (follow-up, 2026-08-29)

Not version-gated (this file has no `os-engine-version` front matter — it's returned fresh on
every tool call, no upgrade propagation needed for its own content). Added a new
**"Transcribing data accurately"** section, inserted between **Draft a proposal** and **Get
confirmation**, in response to a concrete data-corruption bug found in the same Mistral test: a
CSV converted by a weaker model had every column shifted by one position (an empty source cell
was skipped instead of preserved as an empty field) and a date left as a raw Excel serial number.
The new section is a five-item checklist: never skip an empty cell, verify column counts match
before saving, convert date serial numbers, quote CSV fields containing a comma/quote/newline, and
— when a companion skill is created for future updates of the same data — carry this same
checklist into that skill's own instructions.

## `frontend/lib/os/engine/init.md`

Remove:

- All of **Phase 2 — Decide the structure** (the activity-type → elements decision table).
- From **Phase 3 — Write**: the `os/policies/pricing.md`, `os/policies/delivery.md`,
  `os/policies/communication.md` subsections, and the entire **Domain skills** subsection
  (all nine skill blueprints: `daily-plan.md` through `product.md`).
- The `data/clients/`, `data/projects/`, `data/leads/`, `data/products/`, `data/library/`
  directory creation (these are downstream of Phase 2's now-removed table; still created later,
  on demand, the first time a Change Proposal needs one).
- `os/templates/*` (`client.md`/`project.md`) — found during implementation to be dead weight
  once removed: it was only ever created "if the type calls for it" (itself a business-type guess)
  and was only ever read by the now-removed `client-onboarding` skill. Removing one without the
  other would leave an orphaned, unused file.
- `data/schedule.md` (the old manual recurring-task table) — same reasoning: it was only ever
  read by the now-removed `schedule` domain skill, and its purpose (recurring tasks) is now
  properly served by the real cron-based Scheduled Tasks (spec 032) that `get_change_process`
  creates on demand. Keeping it would leave two different, confusing notions of "a schedule."

Keep, but adjust wording to remove any reference to "based on activity type":

- **Phase 1 — Interview**: keep only the "Always" questions (company name/what-you-do, who works
  there, tone/language). Remove the "If there's services being sold" / "If there's a product"
  conditional question blocks and the "what you do NOT do" optional question — these fed directly
  into the now-removed Phase 2 table and policy files.
- **Phase 3 — Write**: keep `os/routing.md` (empty table, header only), `os/identity.md` (filled
  from the retained interview answers), `data/index.md` (empty, ready-to-fill), `data/inbox.md`
  (header + instructions).
- **Phase 4 — Report**: update "Still to fill in" / "Next step" language — the next step is now
  always "tell me what you need and I'll set it up" (pointing at `get_change_process`), never a
  business-type-specific suggestion.
- **Rules**: the "create only what the type calls for" rule is removed (there is no type-driven
  creation left); the "never invent numbers/names/facts" and "fixed English file names" rules stay
  unchanged — they still apply to `os/identity.md` and to whatever a Change Proposal creates
  later.

`init.md`'s own header ("Self-contained instructions for standing up... `os/identity.md`,
`os/policies/*`, domain skills, `os/templates/*`, and `os/routing.md`") is updated to drop
`os/policies/*`, domain skills, and `os/templates/*` from what this tool is responsible for
(those now come from a Change Proposal, not from init).

## `frontend/lib/mcp-tools/engineTools.ts`

- Add `"change-process"` to `ENGINE_CONTENT` (reads `change-process.md`).
- Add a fourth entry to `ENGINE_TOOLS` for `get_change_process` (see
  `get-change-process-tool.md` for the tool metadata contract).
- No changes to `registerEngineTools`'s loop itself — it already iterates `ENGINE_TOOLS`
  generically.
