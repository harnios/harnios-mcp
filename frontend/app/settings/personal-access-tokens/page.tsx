import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { listPersonalAccessTokens } from "@/lib/oauth/personalAccessTokens";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Page } from "@/app/_ui/Page";
import { PageHeader } from "@/app/_ui/PageHeader";
import { StatusPill } from "@/app/_ui/StatusPill";

/** Lists every personal access token, lets the owner create or revoke one (FR-001, FR-005, FR-006). */
export default async function PersonalAccessTokensPage() {
  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    redirect(`/oauth/login?continue=${encodeURIComponent("/settings/personal-access-tokens")}`);
  }

  const tokens = await listPersonalAccessTokens();
  const dict = getDictionary(await resolveLanguage()).settings.pat;

  return (
    <Page size="md">
      <PageHeader title={dict.title} description={dict.description} />

      {tokens.length === 0 ? (
        <p>{dict.empty}</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>{dict.name}</th>
              <th>{dict.status}</th>
              <th>{dict.created}</th>
              <th>{dict.lastUsed}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tokens
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((token) => (
                <tr key={token.id}>
                  <td>{token.name}</td>
                  <td>
                    <StatusPill tone={token.revoked ? "muted" : "success"}>
                      {token.revoked ? dict.revoked : dict.active}
                    </StatusPill>
                  </td>
                  <td>{new Date(token.createdAt).toLocaleString()}</td>
                  <td>{token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString() : dict.never}</td>
                  <td>
                    {!token.revoked && (
                      <form method="POST" action={`/settings/personal-access-tokens/${token.id}/revoke`}>
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

      <h2>{dict.createTitle}</h2>
      <form method="POST" action="/settings/personal-access-tokens/create" className="cluster">
        <input className="input" type="text" name="name" placeholder={dict.namePlaceholder} required style={{ flex: 1 }} />
        <button type="submit" className="btn btn--primary">
          {dict.generate}
        </button>
      </form>
    </Page>
  );
}
