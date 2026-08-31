import type { ReactNode } from "react";

/** Page title row (spec 034) — replaces the ad-hoc
 * `<div flex space-between><h1/>…</div>` and bare `<h1>` + `<p>` on every page.
 * `actions` render in a right-aligned cluster (e.g. a form button); the shared
 * sign-out now lives in the app header, not here. */
export function PageHeader({
  title,
  actions,
  description,
}: {
  title: ReactNode;
  actions?: ReactNode;
  description?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="page-header__row">
        <h1>{title}</h1>
        {actions ? <div className="cluster">{actions}</div> : null}
      </div>
      {description ? <p className="muted">{description}</p> : null}
    </header>
  );
}
