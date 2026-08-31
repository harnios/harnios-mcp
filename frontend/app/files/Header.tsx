"use client";

import type { Dictionary } from "@/lib/i18n/dictionaries";
import { NAV_ITEMS } from "@/app/_ui/nav";
import { MenuIcon } from "./Icons";

export function Header({
  osName,
  onToggleSidebar,
  dict,
  nav,
  homeLinkLabel,
}: {
  osName: string;
  onToggleSidebar: () => void;
  dict: Dictionary["editor"]["header"];
  nav: Dictionary["nav"];
  homeLinkLabel: string;
}) {
  return (
    <header className="app-header">
      <button
        type="button"
        className="sidebar-toggle"
        aria-label={dict.toggleSidebar}
        onClick={onToggleSidebar}
      >
        <MenuIcon />
      </button>
      <a href="/" className="home-link" title={homeLinkLabel} aria-label={homeLinkLabel}>
        <span className="logo-mark" aria-hidden="true">
          {osName.charAt(0).toUpperCase()}
        </span>
        <span className="app-name">{osName}</span>
      </a>
      {/* Same primary nav as the shared SiteHeader (spec 034) — the editor is
          chromeless, so without this the rest of the app is unreachable from
          here except via the logo. "Files" is always the current section. */}
      <nav className="editor-nav" aria-label={nav.menuLabel}>
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            aria-current={item.key === "files" ? "page" : undefined}
          >
            {nav[item.key]}
          </a>
        ))}
      </nav>
      <style jsx>{`
        .app-header {
          display: flex;
          align-items: center;
          gap: 10px;
          height: var(--header-h);
          flex-shrink: 0;
          padding: 0 16px;
          border-bottom: 1px solid var(--border);
          background: var(--surface-raised);
        }
        .sidebar-toggle {
          display: none;
        }
        .home-link {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .logo-mark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 7px;
          background: var(--accent);
          color: var(--accent-fg);
          font-size: 13px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .app-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
          letter-spacing: -0.01em;
        }
        .editor-nav {
          display: flex;
          gap: 16px;
          margin-left: 8px;
          min-width: 0;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .editor-nav::-webkit-scrollbar {
          display: none;
        }
        .editor-nav :global(a) {
          color: var(--text-muted);
          text-decoration: none;
          white-space: nowrap;
        }
        .editor-nav :global(a:hover) {
          color: var(--text);
        }
        .editor-nav :global(a[aria-current="page"]) {
          color: var(--text);
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .sidebar-toggle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            flex-shrink: 0;
            border: 1px solid var(--border-strong);
            border-radius: 8px;
            background: var(--surface-raised);
            color: var(--text);
          }
          .app-name {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
