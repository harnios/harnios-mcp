import { ExternalProxyError } from "./types";
import { getRateLimitState, putRateLimitState } from "./store";

/**
 * Per-connection fixed-window limit on proxied calls (research.md §6,
 * FR-016) — independent of any rate limiting the external server applies
 * itself, and independent of every other connection's counter, so one
 * chatty/misbehaving connection can't throttle calls to another (spec.md
 * Edge Cases). Not user-configurable in v1, same status as the catalog TTL
 * (spec.md Assumptions).
 */
const RATE_LIMIT_WINDOW_MINUTES = 1;
const RATE_LIMIT_MAX = 30;

/**
 * Checks and records one more proxied call against `connectionId`'s
 * fixed-window counter (mirrors lib/messaging/rateLimit.ts's
 * checkAndRecordSend — best-effort, non-atomic read-check-then-write, same
 * accepted tradeoff). Throws `ExternalProxyError("rate_limited", ...)`
 * without recording if the current window's limit is already reached.
 */
export async function checkAndRecordExternalCall(connectionId: string): Promise<void> {
  const now = Date.now();
  const existing = await getRateLimitState(connectionId);

  const state =
    !existing || now - new Date(existing.windowStart).getTime() >= RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
      ? { windowStart: new Date(now).toISOString(), count: 0 }
      : existing;

  if (state.count >= RATE_LIMIT_MAX) {
    throw new ExternalProxyError(
      "rate_limited",
      `Proxy call rate limit reached (${RATE_LIMIT_MAX} per ${RATE_LIMIT_WINDOW_MINUTES} minute(s)) for this connection; try again later`,
    );
  }

  await putRateLimitState(connectionId, { windowStart: state.windowStart, count: state.count + 1 });
}
