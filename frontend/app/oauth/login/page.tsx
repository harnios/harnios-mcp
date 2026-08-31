import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Page } from "@/app/_ui/Page";
import { PageHeader } from "@/app/_ui/PageHeader";
import { Banner } from "@/app/_ui/Banner";
import { Field } from "@/app/_ui/Field";
import { Button } from "@/app/_ui/Button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ continue?: string; error?: string }>;
}) {
  const params = await searchParams;
  const continueUrl = params.continue ?? "/";
  const dict = getDictionary(await resolveLanguage()).oauth.login;

  const errorMessages: Record<string, string> = {
    invalid_credentials: dict.errorInvalidCredentials,
    locked_out: dict.errorLockedOut,
  };
  const errorMessage = params.error ? errorMessages[params.error] ?? dict.errorGeneric : null;

  return (
    <Page size="xs">
      <PageHeader title={dict.title} description={dict.description} />
      {errorMessage && (
        <Banner tone="danger">
          <p>{errorMessage}</p>
        </Banner>
      )}
      <form method="POST" action="/oauth/login/submit" className="stack">
        <input type="hidden" name="continue" value={continueUrl} />
        <Field label={dict.username} htmlFor="username">
          <input className="input" id="username" name="username" type="text" required autoFocus />
        </Field>
        <Field label={dict.password} htmlFor="password">
          <input className="input" id="password" name="password" type="password" required />
        </Field>
        <Button type="submit">{dict.submit}</Button>
      </form>
    </Page>
  );
}
