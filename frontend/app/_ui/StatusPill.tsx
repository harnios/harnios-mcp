import type { ReactNode } from "react";

/** Small status label (spec 034) — replaces inline
 * `enabled ? dict.active : dict.disabled` bare text in table cells. */
export function StatusPill({
  tone = "muted",
  children,
}: {
  tone?: "success" | "warning" | "danger" | "muted" | "accent";
  children: ReactNode;
}) {
  return <span className={`pill${tone === "muted" ? "" : ` pill--${tone}`}`}>{children}</span>;
}
