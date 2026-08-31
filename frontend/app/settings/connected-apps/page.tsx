import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { getRecord, listRecords } from "@/lib/oauth/store";
import type { AuthorizationGrant, RegisteredClient } from "@/lib/oauth/types";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Page } from "@/app/_ui/Page";
import { PageHeader } from "@/app/_ui/PageHeader";
import { StatusPill } from "@/app/_ui/StatusPill";

/** Lists every connected client and lets the owner revoke one (FR-006, FR-007). */
export default async function ConnectedAppsPage() {
  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    redirect(`/oauth/login?continue=${encodeURIComponent("/settings/connected-apps")}`);
  }

  const grants = await listRecords<AuthorizationGrant>("grants/");
  const rows = await Promise.all(
    grants
      .sort((a, b) => b.authorizedAt.localeCompare(a.authorizedAt))
      .map(async (grant) => ({
        grant,
        client: await getRecord<RegisteredClient>(`clients/${grant.clientId}`),
      })),
  );

  const dict = getDictionary(await resolveLanguage()).settings.connectedApps;

  return (
    <Page size="md">
      <PageHeader title={dict.title} />
      {rows.length === 0 ? (
        <p>{dict.empty}</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>{dict.client}</th>
              <th>{dict.status}</th>
              <th>{dict.authorized}</th>
              <th>{dict.lastUsed}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ grant, client }) => (
              <tr key={grant.grantId}>
                <td>{client?.clientName ?? grant.clientId}</td>
                <td>
                  <StatusPill tone={grant.status === "active" ? "success" : "muted"}>{grant.status}</StatusPill>
                </td>
                <td>{new Date(grant.authorizedAt).toLocaleString()}</td>
                <td>{grant.lastUsedAt ? new Date(grant.lastUsedAt).toLocaleString() : dict.never}</td>
                <td>
                  {grant.status === "active" && (
                    <form method="POST" action={`/settings/connected-apps/${grant.grantId}/revoke`}>
                      <button type="submit" className="btn btn--secondary">
                        {dict.revoke}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Page>
  );
}
