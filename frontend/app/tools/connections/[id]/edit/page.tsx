import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { getExternalServerConnection } from "@/lib/external-mcp/store";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Page } from "@/app/_ui/Page";
import { PageHeader } from "@/app/_ui/PageHeader";
import { Banner } from "@/app/_ui/Banner";
import { BackLink } from "@/app/_ui/BackLink";
import { Field } from "@/app/_ui/Field";
import { Button } from "@/app/_ui/Button";

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
      <Page size="sm">
        <BackLink href="/tools/connections" label={dict.cancelButton} />
        <PageHeader title={dict.editTitle} />
        <Banner tone="danger">
          <p>{dict.changeFailed(`unknown connection "${id}"`)}</p>
        </Banner>
        <p>
          <a href="/tools/connections">{dict.title}</a>
        </p>
      </Page>
    );
  }

  return (
    <Page size="sm">
      <BackLink href="/tools/connections" label={dict.cancelButton} />
      <PageHeader title={dict.editTitle} />
      <form method="POST" action={`/tools/connections/${connection.id}`} className="stack">
        <Field label={dict.labelFieldLabel}>
          <input className="input" type="text" name="label" defaultValue={connection.label} required />
        </Field>
        <Field label={dict.urlFieldLabel}>
          <input className="input" type="url" name="url" defaultValue={connection.url} required />
        </Field>
        <Field label={dict.tokenFieldLabel} hint={dict.tokenWriteOnlyNotice}>
          <input className="input" type="password" name="token" placeholder={dict.tokenPlaceholder} />
        </Field>
        <div className="cluster">
          <Button type="submit">{dict.submitEdit}</Button>
          <Button as="a" href="/tools/connections" variant="ghost">
            {dict.cancelButton}
          </Button>
        </div>
      </form>
    </Page>
  );
}
