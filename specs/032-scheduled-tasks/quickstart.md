# Quickstart: Scheduled Tasks

Validates the feature end-to-end: an owner-created task executes unattended, uses a native tool,
and its outcome is visible in the management UI.

## Prerequisites

- Local storage running: `docker compose up -d` (MinIO, per the repo's existing dev setup).
- `frontend/.env.local` with the usual storage/owner-session variables already configured
  (per existing `/init` flow), plus the new scheduler variables:
  ```
  MISTRAL_API_KEY=<a real Mistral API key>
  SCHEDULER_ENABLED=true
  ```
- Telegram messaging already configured (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) so the sample
  task below has an observable side effect — email works equally well if SMTP is configured
  instead.
- `npm install && npm run dev` from `frontend/`.

## Scenario 1 — unattended execution (User Story 1 / P1)

1. Sign in as owner, open `http://localhost:3000/schedules`, click "New task".
2. Fill in: `name` = "Quickstart test", `cron` = the next minute from now (e.g. if it's 10:32,
   use `33 10 * * *` adjusted to your local test time), `model` = any entry from the dropdown,
   `prompt` = "Send a Telegram message saying the scheduler works, using
   send_telegram_message." Leave `enabled` checked. Save.
3. Wait up to 60 seconds. **Expected**: the Telegram message arrives.
4. Reload `/schedules`. **Expected**: the task's row shows a `success` outcome and a recent
   timestamp (SC-002, SC-003).
5. Open the task's detail page. **Expected**: one Task Execution Record with `trigger:
   "scheduled"`, `status: "success"`, and a `toolCalls` entry for `send_telegram_message`
   (contracts/scheduler-run-protocol.md).

## Scenario 2 — manual run, including while disabled (User Story 3 / P3)

1. On the task created above, toggle it to disabled.
2. Click "Run now". **Expected**: it executes immediately despite being disabled (FR-015) —
   another Telegram message arrives within a few seconds, without waiting for any cron tick.
3. Reload the task's detail page. **Expected**: a second Task Execution Record with `trigger:
   "manual"`.

## Scenario 3 — editing takes effect without restart (User Story 2 / P2, SC-005)

1. Edit the task's prompt to something different (e.g. "Send a Telegram message saying 'edited
   prompt works'.").
2. Click "Run now" again (no server restart). **Expected**: the new message content reflects the
   updated prompt, proving the edit took effect immediately.

## Scenario 4 — isolation on failure (FR-010, SC-004)

1. Create a second task with an invalid setup — e.g. temporarily unset `MISTRAL_API_KEY` and
   restart the dev server, or use a prompt instructing a tool call guaranteed to fail (e.g. "send
   an email" with SMTP unconfigured).
2. Trigger it (scheduled or manual). **Expected**: its Task Execution Record shows `status:
   "failure"` with a `SchedulerErrorCode`.
3. Re-run Scenario 1's task (or wait for its next scheduled minute). **Expected**: it still
   succeeds — the other task's failure had no effect on it (FR-010).

## Scenario 5 — UI-side validation (FR-014a)

1. On "New task", submit with an intentionally malformed `cron` (e.g. `not-a-cron`).
   **Expected**: the form is rejected with a clear error; no file is written to
   `os/schedules/`.
2. Submit again with a valid `cron` but leave `prompt` empty. **Expected**: rejected the same
   way.

## Manual inspection (optional)

Reserved-prefix records aren't visible through `/files` by design (data-model.md). To inspect
them directly against the local MinIO bucket:

```bash
aws --endpoint-url http://localhost:9000 s3 ls s3://<bucket>/.scheduler/runs/
aws --endpoint-url http://localhost:9000 s3 ls s3://<bucket>/.scheduler/last-run/
```
