import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { getCachedCatalog, listExternalServerConnections } from "@/lib/external-mcp/store";
import type { CachedToolCatalog } from "@/lib/external-mcp/types";
import { resolveExternalTools } from "@/lib/mcp-tools/externalTools";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Page } from "@/app/_ui/Page";
import { PageHeader } from "@/app/_ui/PageHeader";
import { Banner } from "@/app/_ui/Banner";
import { StatusPill } from "@/app/_ui/StatusPill";

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
    <Page size="lg">
      <PageHeader title={dict.title} description={dict.description} />

      {changed && changedStatusLabel && (
        <Banner tone="info">
          <p>{dict.changedBanner(changed, changedStatusLabel)}</p>
        </Banner>
      )}

      {connections.length === 0 ? (
        <p>{dict.empty}</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>{dict.labelHeader}</th>
              <th>{dict.urlHeader}</th>
              <th>{dict.statusHeader}</th>
              <th>{dict.catalogHeader}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {connections
              .sort((a, b) => a.label.localeCompare(b.label))
              .map((connection) => {
                const catalog = catalogs.get(connection.id);
                return (
                  <tr key={connection.id}>
                    <td>{connection.label}</td>
                    <td>
                      <code>{connection.url}</code>
                    </td>
                    <td>
                      <StatusPill tone={connection.enabled ? "success" : "muted"}>
                        {connection.enabled ? dict.enabledLabel : dict.disabledLabel}
                      </StatusPill>
                    </td>
                    <td>
                      {catalog ? (
                        <>
                          <div>{dict.toolCount(catalog.tools.length)}</div>
                          <div>{dict.lastFetched(new Date(catalog.fetchedAt).toLocaleString())}</div>
                          {catalog.lastError && (
                            <div className="error-text">{dict.errorCodeLabel(catalog.lastError.code)}</div>
                          )}
                        </>
                      ) : (
                        <div>{dict.neverFetched}</div>
                      )}
                    </td>
                    <td>
                      <div className="cluster">
                        <a href={`/tools/connections/${connection.id}/edit`}>{dict.editAction}</a>
                        <a href={`/tools/connections/${connection.id}/confirm?to=${connection.enabled ? "disabled" : "enabled"}`}>
                          {connection.enabled ? dict.disableAction : dict.enableAction}
                        </a>
                        <form method="POST" action={`/tools/connections/${connection.id}/refresh`}>
                          <button type="submit" className="btn btn--secondary">
                            {dict.refreshAction}
                          </button>
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
        <Banner tone="danger">
          {collisions.map((collision) => (
            <p key={`${collision.connectionId}-${collision.toolName}`}>
              {dict.collisionNotice(collision.toolName, collision.connectionLabel)}
            </p>
          ))}
        </Banner>
      )}

      <p>
        <a href="/tools/connections/new">{dict.newLink}</a>
      </p>
      <p>
        <a href="/tools">{dict.title}</a>
      </p>
    </Page>
  );
}
