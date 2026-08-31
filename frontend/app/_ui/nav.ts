import type { Dictionary } from "@/lib/i18n/dictionaries";

/** The primary navigation shown in the shared app header (spec 034).
 * One array to edit when a section is added or removed — mirroring the
 * `DASHBOARD_LINKS` convention in `app/page.tsx` (there is no route scanning).
 * `prefix` drives the active-item match; `/tools/connections` intentionally
 * sits under the "Tools" prefix, and the exhaustive index stays on `/`. */
export const NAV_ITEMS: {
  href: string;
  prefix: string;
  key: keyof Dictionary["nav"];
}[] = [
  { href: "/", prefix: "/", key: "dashboard" },
  { href: "/files", prefix: "/files", key: "files" },
  { href: "/tools", prefix: "/tools", key: "tools" },
  { href: "/schedules", prefix: "/schedules", key: "schedules" },
  { href: "/settings/connected-apps", prefix: "/settings", key: "settings" },
];
