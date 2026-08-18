import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { getExternalServerConnection } from "@/lib/external-mcp/store";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";

/** Owner-gated edit form for one External Server Connection — token field is always blank (write-only, FR-015). */
export default async function EditExternalConnectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUrl = `/tools/connections/${encodeURIComponent(id)}/edit`;

  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    redirect(`/oauth/login?continue=${encodeURIComponent(currentUrl)}`);
  }

  const dict = getDictionary(await resolveLanguage()).connections;
  const connection = await getExternalServerConnection(id);

  if (!connection) {
    return (
      <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
        <h1>{dict.editTitle}</h1>
        <p>{dict.changeFailed(`unknown connection "${id}"`)}</p>
        <p>
          <a href="/tools/connections">{dict.title}</a>
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>{dict.editTitle}</h1>
      <form
        method="POST"
        action={`/tools/connections/${connection.id}`}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <label>
          {dict.labelFieldLabel}
          <input
            type="text"
            name="label"
            defaultValue={connection.label}
            required
            style={{ display: "block", width: "100%" }}
          />
        </label>
        <label>
          {dict.urlFieldLabel}
          <input
            type="url"
            name="url"
            defaultValue={connection.url}
            required
            style={{ display: "block", width: "100%" }}
          />
        </label>
        <label>
          {dict.tokenFieldLabel}
          <input type="password" name="token" placeholder={dict.tokenPlaceholder} style={{ display: "block", width: "100%" }} />
          <small>{dict.tokenWriteOnlyNotice}</small>
        </label>
        <div>
          <button type="submit">{dict.submitEdit}</button>
          <a href="/tools/connections" style={{ marginLeft: 12 }}>
            {dict.cancelButton}
          </a>
        </div>
      </form>
    </main>
  );
}
