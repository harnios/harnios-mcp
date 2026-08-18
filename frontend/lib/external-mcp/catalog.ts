import { listExternalTools } from "./client";
import { getCachedCatalog, putCachedCatalog } from "./store";
import type { CachedToolCatalog, ExternalServerConnection, ExternalProxyError } from "./types";

/**
 * How long a cached tool catalog is served without a refresh attempt
 * (research.md §3) — not user-configurable in v1 (spec.md Assumptions).
 * Kept off the common `/mcp` request path: most requests hit the cache,
 * only a stale one triggers a bounded-timeout network call.
 */
const CATALOG_TTL_MS = 5 * 60 * 1000;

function isFresh(catalog: CachedToolCatalog): boolean {
  return Date.now() - new Date(catalog.fetchedAt).getTime() < CATALOG_TTL_MS;
}

/**
 * Serves the cached catalog for `connection` as-is if still fresh;
 * otherwise attempts one bounded-timeout refresh, falling back to the
 * existing (now-stale) cache — or an empty list if there's no prior
 * catalog at all — on failure (research.md §3, spec.md Edge Cases).
 * `force: true` (manual "refresh now", FR-014) skips the freshness check.
 */
export async function getOrRefreshCatalog(
  connection: ExternalServerConnection,
  options: { force?: boolean } = {},
): Promise<CachedToolCatalog> {
  const existing = await getCachedCatalog(connection.id);

  if (!options.force && existing && isFresh(existing)) {
    return existing;
  }

  try {
    const tools = await listExternalTools(connection);
    const refreshed: CachedToolCatalog = {
      connectionId: connection.id,
      fetchedAt: new Date().toISOString(),
      tools,
      lastError: null,
    };
    await putCachedCatalog(refreshed);
    return refreshed;
  } catch (err) {
    const proxyError = err as ExternalProxyError;
    const fallback: CachedToolCatalog = existing ?? {
      connectionId: connection.id,
      fetchedAt: new Date(0).toISOString(),
      tools: [],
      lastError: null,
    };
    const withError: CachedToolCatalog = {
      ...fallback,
      lastError: { code: proxyError.code ?? "external_unreachable", message: proxyError.message },
    };
    await putCachedCatalog(withError);
    return withError;
  }
}
