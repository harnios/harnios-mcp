# Schedules

The `/schedules` page manages Scheduled Tasks — recurring jobs that run unattended, without any
manual action.

Each task has:

- **A name** you choose, used as its identifier.
- **A cron expression** (and an optional time zone) deciding when it's due.
- **An assigned model**, picked from the currently supported set.
- **A prompt** — free-form instructions describing what the task should accomplish.
- **An enabled/disabled switch** — disabling a task stops it from running automatically, but it
  can still be run manually at any time.

When a task becomes due, the assigned model receives its prompt and the same built-in
capabilities (file access, email, messaging, and so on) a connected assistant already has, decides
what to do, and the outcome — success or failure, with a summary — is recorded. This check runs
about once a minute in the background; a task's own next scheduled time is its natural retry if a
run fails, so nothing is automatically re-tried in between.

From the page you can also:

- **Run a task right now**, regardless of its schedule or enabled state.
- **Review a task's history** — the outcome and a summary of every past run, scheduled or manual.
- **Edit** a task's model, prompt, schedule, or enabled state — the very next run (scheduled or
  manual) uses the change, no restart required.

A task's definition is a file under `os/schedules/`, so it can also be inspected or edited
directly through Files if needed — both views show the same underlying task.
