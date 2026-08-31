import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Page } from "@/app/_ui/Page";
import { PageHeader } from "@/app/_ui/PageHeader";
import { BackLink } from "@/app/_ui/BackLink";
import { Field } from "@/app/_ui/Field";
import { Button } from "@/app/_ui/Button";

/** Owner-gated form to connect a new External Server Connection (spec 031, US3, FR-001). */
export default async function NewExternalConnectionPage() {
  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    redirect(`/oauth/login?continue=${encodeURIComponent("/tools/connections/new")}`);
  }

  const dict = getDictionary(await resolveLanguage()).connections;

  return (
    <Page size="sm">
      <BackLink href="/tools/connections" label={dict.cancelButton} />
      <PageHeader title={dict.newTitle} />
      <form method="POST" action="/tools/connections/create" className="stack">
        <Field label={dict.labelFieldLabel}>
          <input className="input" type="text" name="label" placeholder={dict.labelPlaceholder} required />
        </Field>
        <Field label={dict.urlFieldLabel}>
          <input className="input" type="url" name="url" placeholder={dict.urlPlaceholder} required />
        </Field>
        <Field label={dict.tokenFieldLabel}>
          <input className="input" type="password" name="token" placeholder={dict.tokenPlaceholder} required />
        </Field>
        <div className="cluster">
          <Button type="submit">{dict.submitCreate}</Button>
          <Button as="a" href="/tools/connections" variant="ghost">
            {dict.cancelButton}
          </Button>
        </div>
      </form>
    </Page>
  );
}
