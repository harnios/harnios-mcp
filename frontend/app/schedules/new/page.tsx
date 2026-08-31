import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { SUPPORTED_MODELS } from "@/lib/scheduler/models";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Page } from "@/app/_ui/Page";
import { PageHeader } from "@/app/_ui/PageHeader";
import { Banner } from "@/app/_ui/Banner";
import { BackLink } from "@/app/_ui/BackLink";
import { Field } from "@/app/_ui/Field";
import { Button } from "@/app/_ui/Button";

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
  const dict = getDictionary(await resolveLanguage()).schedules;

  return (
    <Page size="sm">
      <BackLink href="/schedules" label={dict.backLink} />
      <PageHeader title={dict.newTitle} />
      {error && (
        <Banner tone="danger">
          <p>{dict.validationError(error)}</p>
        </Banner>
      )}
      <form method="POST" action="/schedules/create" className="stack">
        <Field label={dict.nameFieldLabel}>
          <input className="input" type="text" name="name" placeholder={dict.namePlaceholder} required />
        </Field>
        <Field label={dict.cronFieldLabel}>
          <input className="input" type="text" name="cron" placeholder={dict.cronPlaceholder} required />
        </Field>
        <Field label={dict.timezoneFieldLabel}>
          <input className="input" type="text" name="timezone" placeholder={dict.timezonePlaceholder} />
        </Field>
        <Field label={dict.modelFieldLabel}>
          <select className="input" name="model" required>
            {SUPPORTED_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={dict.promptFieldLabel}>
          <textarea className="input" name="prompt" placeholder={dict.promptPlaceholder} required rows={8} />
        </Field>
        <label className="field field--inline">
          <input type="checkbox" name="enabled" value="true" defaultChecked /> {dict.enabledFieldLabel}
        </label>
        <div className="cluster">
          <Button type="submit">{dict.submitCreate}</Button>
          <Button as="a" href="/schedules" variant="ghost">
            {dict.backLink}
          </Button>
        </div>
      </form>
    </Page>
  );
}
