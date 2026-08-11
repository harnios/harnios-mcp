# Phase 1 Data Model: Send Email Messages in HTML

No new persisted entity is introduced. This feature adds one new attribute to an existing in-flight request shape and leaves every persisted entity (spec 017's Send Attempt Record, Rate Limit State, Messaging Configuration) unchanged (research.md §5).

## Email Send Request (extended, not persisted)

The existing request shape accepted by the `send_email` MCP tool and the web test route's `channel: "email"` body (spec 017, spec 029) gains one field:

| Field | Type | Notes |
|---|---|---|
| `to` | `string[]` (tool) / `string` (test route, single recipient) | Unchanged from spec 017/029. |
| `subject` | `string` | Unchanged. |
| `body` | `string` | Unchanged in type — its *meaning* is now conditional on `isHtml`: plain text (as always) when `isHtml` is falsy, HTML markup when `isHtml` is true. |
| `isHtml` | `boolean`, optional, default `false` | **New** (FR-001). When omitted or `false`, behavior is byte-for-byte identical to before this feature (FR-004) — the field's absence is itself the backward-compatibility guarantee, not a special case to detect. |

## Derived Plain-Text Body (new, not persisted, request-scoped)

Exists only for the duration of a single send attempt when `isHtml` is true — computed from `body` via `html-to-text`'s `convert()` (research.md §2), passed to the underlying mail transport as the message's plain-text MIME part alongside the original `body` as the HTML part (research.md §3). Never stored, logged, or returned to the caller — it's an internal delivery detail satisfying FR-003, not a new piece of state a caller ever sees or sets directly.

## Reused entities (spec 017, unchanged)

- **Send Attempt Record** (`lib/messaging/auditLog.ts`) — no new field; a send made with `isHtml: true` produces an audit record indistinguishable in shape from a plain-text send, same `channel`/`destination`/`status`/`errorCode`/`errorMessage` (research.md §5).
- **Rate Limit State** (`lib/messaging/rateLimit.ts`) — unchanged; an HTML send consumes exactly one rate-limit unit, same as a plain-text send.
- **Messaging Configuration** (`lib/messaging/config.ts`) — unchanged; no new environment variable or setting is introduced by this feature.
