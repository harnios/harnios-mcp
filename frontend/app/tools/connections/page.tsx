import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { getCachedCatalog, listExternalServerConnections } from "@/lib/external-mcp/store";
import type { CachedToolCatalog } from "@/lib/external-mcp/types";
import { resolveExternalTools } from "@/lib/mcp-tools/externalTools";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";

const cellStyle: CSSProperties = { textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #ddd" };

/** Lists every External Server Connection, its cached catalog status, and links to manage it (spec 031, US3/US2). */
export default async function ExternalConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ changed?: string; to?: string }>;
}) {
  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    redirect(`/oauth/login?continue=${encodeURIComponent("/tools/connections")}`);
  }

  const { changed, to } = await searchParams;
  const connections = await listExternalServerConnections();
  const catalogs = new Map<string, CachedToolCatalog>();
  await Promise.all(
    connections.map(async (connection) => {
      const catalog = await getCachedCatalog(connection.id);
      if (catalog) catalogs.set(connection.id, catalog);
    }),
  );

  const { collisions } = resolveExternalTools(connections, catalogs);

  const dict = getDictionary(await resolveLanguage()).connections;
  const changedStatusLabel =
    to === "enabled" ? dict.enabledLabel : to === "disabled" ? dict.disabledLabel : to === "removed" ? dict.removeAction : undefined;

  return (
    <main style={{ maxWidth: 900, margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>{dict.title}</h1>
      <p>{dict.description}</p>

      {changed && changedStatusLabel && (
        <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: "0.75rem 1rem", marginBottom: "1rem" }}>
          <p style={{ margin: 0 }}>{dict.changedBanner(changed, changedStatusLabel)}</p>
        </div>
      )}

      {connections.length === 0 ? (
        <p>{dict.empty}</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={cellStyle}>{dict.labelHeader}</th>
              <th style={cellStyle}>{dict.urlHeader}</th>
              <th style={cellStyle}>{dict.statusHeader}</th>
              <th style={cellStyle}>{dict.catalogHeader}</th>
              <th style={cellStyle} />
            </tr>
          </thead>
          <tbody>
            {connections
              .sort((a, b) => a.label.localeCompare(b.label))
              .map((connection) => {
                const catalog = catalogs.get(connection.id);
                return (
                  <tr key={connection.id}>
                    <td style={cellStyle}>{connection.label}</td>
                    <td style={cellStyle}>
                      <code>{connection.url}</code>
                    </td>
                    <td style={cellStyle}>{connection.enabled ? dict.enabledLabel : dict.disabledLabel}</td>
                    <td style={cellStyle}>
                      {catalog ? (
                        <>
                          <div>{dict.toolCount(catalog.tools.length)}</div>
                          <div>{dict.lastFetched(new Date(catalog.fetchedAt).toLocaleString())}</div>
                          {catalog.lastError && (
                            <div style={{ color: "#b00" }}>{dict.errorCodeLabel(catalog.lastError.code)}</div>
                          )}
                        </>
                      ) : (
                        <div>{dict.neverFetched}</div>
                      )}
                    </td>
                    <td style={cellStyle}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <a href={`/tools/connections/${connection.id}/edit`}>{dict.editAction}</a>
                        <a href={`/tools/connections/${connection.id}/confirm?to=${connection.enabled ? "disabled" : "enabled"}`}>
                          {connection.enabled ? dict.disableAction : dict.enableAction}
                        </a>
                        <form method="POST" action={`/tools/connections/${connection.id}/refresh`}>
                          <button type="submit">{dict.refreshAction}</button>
                        </form>
                        <a href={`/tools/connections/${connection.id}/confirm?to=removed`}>{dict.removeAction}</a>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      )}

      {collisions.length > 0 && (
        <div style={{ border: "1px solid #b00", borderRadius: 6, padding: "0.75rem 1rem", margin: "1rem 0" }}>
          {collisions.map((collision) => (
            <p key={`${collision.connectionId}-${collision.toolName}`} style={{ margin: 0 }}>
              {dict.collisionNotice(collision.toolName, collision.connectionLabel)}
            </p>
          ))}
        </div>
      )}

      <p>
        <a href="/tools/connections/new">{dict.newLink}</a>
      </p>
      <p>
        <a href="/tools">{dict.title}</a>
      </p>
    </main>
  );
}
