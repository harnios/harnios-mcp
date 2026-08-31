import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Dictionary } from "@/lib/i18n/dictionaries/types";
import { Page } from "@/app/_ui/Page";
import { PageHeader } from "@/app/_ui/PageHeader";

// The single place to update when a top-level page is added or removed
// (spec 026 FR-007) — this is the only list that needs to change; no
// route-scanning exists to derive it automatically (research.md §4).
const DASHBOARD_LINKS: { href: string; labelKey: keyof Dictionary["dashboard"]["links"] }[] = [
  { href: "/files", labelKey: "files" },
  { href: "/tools", labelKey: "tools" },
  { href: "/tools/connections", labelKey: "externalMcpServers" },
  { href: "/settings/connected-apps", labelKey: "settingsConnectedApps" },
  { href: "/settings/personal-access-tokens", labelKey: "settingsPersonalAccessTokens" },
  { href: "/settings/test-messaging", labelKey: "settingsTestMessaging" },
  { href: "/schedules", labelKey: "scheduledTasks" },
];

/** Lands every visitor on a list of links to every existing top-level page (spec 026). */
export default async function DashboardPage() {
  const dict = getDictionary(await resolveLanguage()).dashboard;

  return (
    <Page size="md">
      <PageHeader title={dict.title} description={dict.description} />
      <ul className="stack--sm" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {DASHBOARD_LINKS.map(({ href, labelKey }) => (
          <li key={href}>
            <a className="card" style={{ display: "block" }} href={href}>
              {dict.links[labelKey]}
            </a>
          </li>
        ))}
      </ul>
    </Page>
  );
}
