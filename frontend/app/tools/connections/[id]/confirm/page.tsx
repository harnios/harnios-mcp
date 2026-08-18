import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { listExternalServerConnections } from "@/lib/external-mcp/store";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";

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
      <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
        <h1>{dict.confirmTitle}</h1>
        <p>{dict.changeFailed(!connection ? `unknown connection "${id}"` : `invalid status "${to}"`)}</p>
        <p>
          <a href="/tools/connections">{dict.title}</a>
        </p>
      </main>
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
    <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>{dict.confirmTitle}</h1>
      <p>{message}</p>
      <p>{to === "removed" ? dict.removeWarning : dict.warningNotice}</p>
      <form method="POST" action={action} style={{ display: "flex", gap: 8 }}>
        {to !== "removed" && <input type="hidden" name="to" value={to} />}
        <button type="submit">{dict.confirmButton}</button>
        <a href="/tools/connections">{dict.cancelButton}</a>
      </form>
    </main>
  );
}
