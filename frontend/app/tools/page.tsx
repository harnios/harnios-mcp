import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { TOOL_CATALOG } from "@/lib/mcp-tools/catalog";
import { getDisabledTools } from "@/lib/mcp-tools/store";
import { resolveExternalTools } from "@/lib/mcp-tools/externalTools";
import { getCachedCatalog, listExternalServerConnections } from "@/lib/external-mcp/store";
import type { CachedToolCatalog } from "@/lib/external-mcp/types";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Page } from "@/app/_ui/Page";
import { PageHeader } from "@/app/_ui/PageHeader";
import { Banner } from "@/app/_ui/Banner";
import { StatusPill } from "@/app/_ui/StatusPill";

/** Lists every MCP tool, its current active/disabled status, and lets the owner change it (spec 024, spec 025). */
export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ changed?: string; to?: string }>;
}) {
  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    redirect(`/oauth/login?continue=${encodeURIComponent("/tools")}`);
  }

  const { changed, to } = await searchParams;
  const disabledTools = await getDisabledTools();

  const nativeRows = TOOL_CATALOG.map((tool) => ({
    name: tool.name,
    group: tool.group,
    enabled: !disabledTools.has(tool.name),
    source: null as string | null,
  }));

  const connections = await listExternalServerConnections();
  const catalogs = new Map<string, CachedToolCatalog>();
  await Promise.all(
    connections.map(async (connection) => {
      const catalog = await getCachedCatalog(connection.id);
      if (catalog) catalogs.set(connection.id, catalog);
    }),
  );
  const connectionLabels = new Map(connections.map((c) => [c.id, c.label]));
  const { registrations } = resolveExternalTools(connections, catalogs);
  const externalRows = registrations.map(({ connectionId, tool }) => ({
    name: tool.name,
    group: connectionLabels.get(connectionId) ?? connectionId,
    enabled: !disabledTools.has(tool.name),
    source: connectionLabels.get(connectionId) ?? connectionId,
  }));

  const rows = [...nativeRows, ...externalRows].sort(
    (a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name),
  );

  const dict = getDictionary(await resolveLanguage()).tools;
  const changedStatusLabel = to === "active" ? dict.active : to === "disabled" ? dict.disabled : undefined;

  return (
    <Page size="md">
      <PageHeader title={dict.title} description={dict.description} />
      {changed && changedStatusLabel && (
        <Banner tone="info">
          <p>{dict.changedBanner(changed, changedStatusLabel)}</p>
          <p>{dict.warningNotice}</p>
        </Banner>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>{dict.name}</th>
            <th>{dict.group}</th>
            <th>{dict.sourceHeader}</th>
            <th>{dict.status}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((tool) => (
            <tr key={tool.name}>
              <td>
                <code>{tool.name}</code>
              </td>
              <td>{tool.group}</td>
              <td>{tool.source ? dict.sourceExternal(tool.source) : dict.sourceNative}</td>
              <td>
                <StatusPill tone={tool.enabled ? "success" : "muted"}>
                  {tool.enabled ? dict.active : dict.disabled}
                </StatusPill>
              </td>
              <td>
                <a href={`/tools/${encodeURIComponent(tool.name)}/confirm?to=${tool.enabled ? "disabled" : "active"}`}>
                  {tool.enabled ? dict.disableAction : dict.enableAction}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Page>
  );
}
