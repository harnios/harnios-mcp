# Quickstart: In-App User Documentation

Manual validation — this repo has no automated test framework (unchanged since spec
031/032/033). Run against any running Harnios instance (disposable or not — this feature never
touches the S3 bucket).

## Prerequisites

- A running Harnios instance (storage configured or not — the `/docs` page doesn't depend on it).
- An MCP client connected (any client that supports tool calling), for Scenario 3.

## Scenario 1 — Owner browses documentation from the menu (User Story 1, SC-001, SC-005)

1. Without signing in, open the app and locate the new documentation entry in the main
   navigation, alongside Dashboard/Files/Tools/Schedules/Settings.
2. Select it. **Expected**: `/docs` opens, no sign-in prompt, showing the general overview.
3. Select the "Schedules" topic link. **Expected**: `/docs/schedules` opens, showing documentation
   specific to Scheduled Tasks — not the overview, not an unrelated topic.
4. Repeat for the remaining topics (Dashboard, Files, Tools, Settings). **Expected**: each shows
   distinct, topic-specific content.

## Scenario 2 — Unknown topic fails clearly on the page (FR-007a, `/speckit-clarify` Q1)

1. Navigate directly to `/docs/not-a-real-topic`.
2. **Expected**: a "topic not found" message, listing the six valid topics as links — not a
   redirect to the overview, not a generic unstyled 404.

## Scenario 3 — A connected assistant answers using the same content (User Story 2, SC-002)

1. From an MCP client connected to the instance, call `get_docs` with no arguments.
2. **Expected**: the response text matches `/docs`'s overview content.
3. Call `get_docs` with `topic: "schedules"`.
4. **Expected**: the response text matches `/docs/schedules`'s content exactly (same source,
   FR-008).
5. Call `get_docs` with an invalid topic value (e.g. `topic: "billing"`).
6. **Expected**: the call fails with a validation error naming the six accepted topic values —
   not a silent empty/unrelated result (FR-007).

## Scenario 4 — Single source of truth (FR-008, SC-004)

1. Edit `frontend/lib/docs/schedules.md`, changing one visible sentence.
2. Redeploy/restart the app.
3. Repeat Scenario 1 step 3 and Scenario 3 steps 3–4.
4. **Expected**: both the page and the MCP tool show the edited sentence — no stale copy on
   either side, no second file to have missed.

## Scenario 5 — Disabling the tool doesn't affect the page (Edge Cases)

1. From `/tools`, disable `get_docs`.
2. Call `get_docs` from a connected MCP client. **Expected**: it's absent from `tools/list` (same
   behavior as any other disabled native tool).
3. Reload `/docs` in the browser. **Expected**: unaffected — still renders normally, since the
   page doesn't go through the MCP tool layer at all.
