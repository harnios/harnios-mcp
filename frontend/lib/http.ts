/**
 * `request.url`'s origin isn't reliable on self-hosted deployments behind a
 * reverse proxy (e.g. Coolify/Traefik) — it can resolve to the app's
 * internal bind address (`http://localhost:3000`) instead of the public
 * host the browser actually connected to. Building absolute redirect URLs
 * from the forwarded headers instead keeps them pointed at the real domain.
 *
 * Accepts anything with a `.headers.get()` — a route handler's `NextRequest`
 * or the `ReadonlyHeaders` a Server Component gets from `next/headers`'
 * `headers()` — so both call sites share this one source of truth.
 */
export function requestOrigin(request: { headers: Pick<Headers, "get"> }): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
