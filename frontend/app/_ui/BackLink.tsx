/** Scoped "back to <list>" link for sub-pages (spec 034) — replaces the
 * app-wide `<HomeLink>` on new/edit/confirm pages, which now points at the
 * page's own list rather than always at the dashboard. Plain `<a>`, matching
 * every other link in these pages. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link className="backlink" href={href}>
      ← {label}
    </Link>
  );
}
import Link from "next/link";
