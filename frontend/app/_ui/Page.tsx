import type { CSSProperties, ReactNode } from "react";

/** Centered page column (spec 034) — replaces the copy-pasted
 * `<main style={{ maxWidth, margin, fontFamily }}>` shell on every page. */
export function Page({
  size = "md",
  className = "",
  style,
  children,
}: {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <main className={`page page--${size}${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </main>
  );
}
