import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { listExternalServerConnections } from "@/lib/external-mcp/store";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Page } from "@/app/_ui/Page";
import { PageHeader } from "@/app/_ui/PageHeader";
import { Banner } from "@/app/_ui/Banner";
import { Button } from "@/app/_ui/Button";

/** Owner-gated confirmation screen for enabling, disabling, or removing one External Server Connection (spec 031, US2, FR-009, FR-017). */
export default async function ConfirmConnectionChangePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ to?: string }>;
}) {
  const { id } = await params;
  const { to } = await searchParams;
  const currentUrl = `/tools/connections/${encodeURIComponent(id)}/confirm?to=${encodeURIComponent(to ?? "")}`;

  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    redirect(`/oauth/login?continue=${encodeURIComponent(currentUrl)}`);
  }

  const dict = getDictionary(await resolveLanguage()).connections;
  const connections = await listExternalServerConnections();
  const connection = connections.find((c) => c.id === id);
  const validTo = to === "enabled" || to === "disabled" || to === "removed";

  if (!connection || !validTo) {
    return (
      <Page size="sm">
        <PageHeader title={dict.confirmTitle} />
        <Banner tone="danger">
          <p>{dict.changeFailed(!connection ? `unknown connection "${id}"` : `invalid status "${to}"`)}</p>
        </Banner>
        <p>
          <a href="/tools/connections">{dict.title}</a>
        </p>
      </Page>
    );
  }

  const message =
    to === "enabled"
      ? dict.confirmEnable(connection.label)
      : to === "disabled"
        ? dict.confirmDisable(connection.label)
        : dict.confirmRemove(connection.label);

  const action =
    to === "removed"
      ? `/tools/connections/${connection.id}/remove`
      : `/tools/connections/${connection.id}/enabled`;

  return (
    <Page size="sm">
      <PageHeader title={dict.confirmTitle} />
      <p>{message}</p>
      <Banner tone="warning">
        <p>{to === "removed" ? dict.removeWarning : dict.warningNotice}</p>
      </Banner>
      <form method="POST" action={action} className="cluster">
        {to !== "removed" && <input type="hidden" name="to" value={to} />}
        <Button type="submit" variant={to === "removed" ? "danger" : "primary"}>
          {dict.confirmButton}
        </Button>
        <Button as="a" href="/tools/connections" variant="ghost">
          {dict.cancelButton}
        </Button>
      </form>
    </Page>
  );
}
