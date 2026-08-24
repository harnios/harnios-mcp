import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { HomeLink } from "@/app/HomeLink";

/** Owner-gated form to connect a new External Server Connection (spec 031, US3, FR-001). */
export default async function NewExternalConnectionPage() {
  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    redirect(`/oauth/login?continue=${encodeURIComponent("/tools/connections/new")}`);
  }

  const fullDict = getDictionary(await resolveLanguage());
  const dict = fullDict.connections;

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
      <HomeLink label={fullDict.common.homeLink} />
      <h1>{dict.newTitle}</h1>
      <form method="POST" action="/tools/connections/create" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label>
          {dict.labelFieldLabel}
          <input type="text" name="label" placeholder={dict.labelPlaceholder} required style={{ display: "block", width: "100%" }} />
        </label>
        <label>
          {dict.urlFieldLabel}
          <input type="url" name="url" placeholder={dict.urlPlaceholder} required style={{ display: "block", width: "100%" }} />
        </label>
        <label>
          {dict.tokenFieldLabel}
          <input type="password" name="token" placeholder={dict.tokenPlaceholder} required style={{ display: "block", width: "100%" }} />
        </label>
        <div>
          <button type="submit">{dict.submitCreate}</button>
          <a href="/tools/connections" style={{ marginLeft: 12 }}>
            {dict.cancelButton}
          </a>
        </div>
      </form>
    </main>
  );
}
