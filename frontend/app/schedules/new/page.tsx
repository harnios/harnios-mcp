import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { SUPPORTED_MODELS } from "@/lib/scheduler/models";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { HomeLink } from "@/app/HomeLink";

/** Owner-gated form to create a new Scheduled Task (spec 032, US2, FR-014). */
export default async function NewSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    redirect(`/oauth/login?continue=${encodeURIComponent("/schedules/new")}`);
  }

  const { error } = await searchParams;
  const fullDict = getDictionary(await resolveLanguage());
  const dict = fullDict.schedules;

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
      <HomeLink label={fullDict.common.homeLink} />
      <h1>{dict.newTitle}</h1>
      {error && (
        <div style={{ border: "1px solid #b00", borderRadius: 6, padding: "0.75rem 1rem", marginBottom: "1rem", color: "#b00" }}>
          {dict.validationError(error)}
        </div>
      )}
      <form method="POST" action="/schedules/create" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label>
          {dict.nameFieldLabel}
          <input type="text" name="name" placeholder={dict.namePlaceholder} required style={{ display: "block", width: "100%" }} />
        </label>
        <label>
          {dict.cronFieldLabel}
          <input type="text" name="cron" placeholder={dict.cronPlaceholder} required style={{ display: "block", width: "100%" }} />
        </label>
        <label>
          {dict.timezoneFieldLabel}
          <input type="text" name="timezone" placeholder={dict.timezonePlaceholder} style={{ display: "block", width: "100%" }} />
        </label>
        <label>
          {dict.modelFieldLabel}
          <select name="model" required style={{ display: "block", width: "100%" }}>
            {SUPPORTED_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {dict.promptFieldLabel}
          <textarea name="prompt" placeholder={dict.promptPlaceholder} required rows={8} style={{ display: "block", width: "100%" }} />
        </label>
        <label>
          <input type="checkbox" name="enabled" value="true" defaultChecked /> {dict.enabledFieldLabel}
        </label>
        <div>
          <button type="submit">{dict.submitCreate}</button>
          <a href="/schedules" style={{ marginLeft: 12 }}>
            {dict.backLink}
          </a>
        </div>
      </form>
    </main>
  );
}
