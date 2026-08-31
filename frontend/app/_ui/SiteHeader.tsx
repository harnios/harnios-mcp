import { headers } from "next/headers";
import { getOsName } from "@/lib/config/app";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { NAV_ITEMS } from "./nav";

/** Surfaces that render without the standard app chrome (spec 034 FR-008):
 * pre-auth (`/oauth/*`), first-run setup (`/init`), and the file editor
 * (`/files` has its own header; `/editor` only 308-redirects into it). */
const CHROMELESS = ["/oauth", "/init", "/files", "/editor"];

function isChromeless(pathname: string): boolean {
  return CHROMELESS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** The shared header on every top-level page: brand, primary nav with the
 * current section marked, and a sign-out control when an owner session is
 * active. Reads the current path from the `x-pathname` request header that
 * `middleware.ts` already sets on every request. */
export async function SiteHeader() {
  const pathname = (await headers()).get("x-pathname") ?? "/";
  if (isChromeless(pathname)) return null;

  const osName = getOsName();
  const nav = getDictionary(await resolveLanguage()).nav;
  const signedIn = await hasActiveOwnerSession();

  return (
    <header className="site-header">
      <a className="site-header__brand" href="/" aria-label={nav.home}>
        <span className="logo-mark" aria-hidden="true" />
        <span className="site-header__wordmark">HARNIOS</span>
        <span className="site-header__instance">{osName}</span>
      </a>
      <nav className="site-nav" aria-label={nav.menuLabel}>
        {NAV_ITEMS.map((item) => {
          const active =
            item.prefix === "/"
              ? pathname === "/"
              : pathname === item.prefix || pathname.startsWith(`${item.prefix}/`);
          return (
            <a key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
              {nav[item.key]}
            </a>
          );
        })}
      </nav>
      {signedIn && (
        <div className="site-header__signout">
          <form method="POST" action="/oauth/logout">
            <button type="submit" className="btn btn--ghost">
              {nav.signOut}
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
