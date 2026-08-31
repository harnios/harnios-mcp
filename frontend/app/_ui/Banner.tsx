import type { ReactNode } from "react";

/** Notice / callout box (spec 034) — replaces every
 * `<div style={{ border, borderRadius, padding, marginBottom }}>` notice and
 * the conditional-color status banners. `warning`/`danger` get `role="alert"`
 * unless the caller overrides it. */
export function Banner({
  tone = "info",
  role,
  className = "",
  children,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  role?: string;
  className?: string;
  children: ReactNode;
}) {
  const resolvedRole = role ?? (tone === "danger" || tone === "warning" ? "alert" : undefined);
  return (
    <div role={resolvedRole} className={`banner banner--${tone}${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}
