"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { NAV_ITEMS } from "./nav";

const CHROMELESS = ["/oauth", "/init", "/files", "/editor", "/share"];

function isChromeless(pathname: string): boolean {
  return CHROMELESS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function SiteHeaderClient({ osName, nav }: { osName: string; nav: Dictionary["nav"] }) {
  const pathname = usePathname() || "/";
  if (isChromeless(pathname)) return null;

  return (
    <header className="site-header">
      <Link className="site-header__brand" href="/" aria-label={nav.home}>
        <span className="logo-mark" aria-hidden="true" />
        <span className="site-header__wordmark">HARNIOS</span>
        <span className="site-header__instance">{osName}</span>
      </Link>
      <nav className="site-nav" aria-label={nav.menuLabel}>
        {NAV_ITEMS.map((item) => {
          const active = item.prefix === "/" ? pathname === "/" : pathname === item.prefix || pathname.startsWith(`${item.prefix}/`);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>{nav[item.key]}</Link>;
        })}
      </nav>
      <div className="site-header__signout">
        <form method="POST" action="/oauth/logout">
          <button type="submit" className="btn btn--ghost">{nav.signOut}</button>
        </form>
      </div>
    </header>
  );
}
