import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { TOOL_CATALOG } from "@/lib/mcp-tools/catalog";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Page } from "@/app/_ui/Page";
import { PageHeader } from "@/app/_ui/PageHeader";
import { Banner } from "@/app/_ui/Banner";
import { Button } from "@/app/_ui/Button";

/** Owner-gated confirmation screen for one pending tool status change (spec 025 FR-002, FR-003). */
export default async function ConfirmToolStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ to?: string }>;
}) {
  const { name } = await params;
  const { to } = await searchParams;
  const currentUrl = `/tools/${encodeURIComponent(name)}/confirm?to=${encodeURIComponent(to ?? "")}`;

  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    redirect(`/oauth/login?continue=${encodeURIComponent(currentUrl)}`);
  }

  const dict = getDictionary(await resolveLanguage()).tools;
  const knownTool = TOOL_CATALOG.some((tool) => tool.name === name);
  const validStatus = to === "active" || to === "disabled";

  if (!knownTool || !validStatus) {
    return (
      <Page size="sm">
        <PageHeader title={dict.confirmTitle} />
        <Banner tone="danger">
          <p>{dict.changeFailed(!knownTool ? `unknown tool "${name}"` : `invalid status "${to}"`)}</p>
        </Banner>
        <p>
          <a href="/tools">{dict.title}</a>
        </p>
      </Page>
    );
  }

  const statusLabel = to === "active" ? dict.active : dict.disabled;

  return (
    <Page size="sm">
      <PageHeader title={dict.confirmTitle} />
      <p>{dict.confirmPendingChange(name, statusLabel)}</p>
      <Banner tone="warning">
        <p>{dict.warningNotice}</p>
      </Banner>
      <form method="POST" action={`/tools/${encodeURIComponent(name)}/status`} className="cluster">
        <input type="hidden" name="to" value={to} />
        <Button type="submit" variant={to === "disabled" ? "danger" : "primary"}>
          {dict.confirmButton}
        </Button>
        <Button as="a" href="/tools" variant="ghost">
          {dict.cancelButton}
        </Button>
      </form>
    </Page>
  );
}
