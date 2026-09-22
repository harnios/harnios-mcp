import { getOsName } from "@/lib/config/app";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { SiteHeaderClient } from "./SiteHeaderClient";

/** The shared header on every top-level page: brand, primary nav with the
 * current section marked, and a sign-out control for an active owner session. */
export async function SiteHeader() {
  const osName = getOsName();
  const nav = getDictionary(await resolveLanguage()).nav;
  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) return null;

  return <SiteHeaderClient osName={osName} nav={nav} />;
}
