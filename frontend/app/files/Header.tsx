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
        <span className="logo-mark" aria-hidden="true" />
        <span className="wordmark">HARNIOS</span>
        <span className="instance">{osName}</span>
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
          display: block;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--brand-teal);
          box-shadow: 0 0 8px var(--brand-glow);
          flex-shrink: 0;
        }
        .wordmark {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .instance {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-muted);
        }
        .instance::before {
          content: "/";
          margin: 0 0.4em 0 0.15em;
          color: var(--border-strong);
        }
        .editor-nav {
          display: flex;
          gap: 16px;
          margin-left: auto;
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
          .instance {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
