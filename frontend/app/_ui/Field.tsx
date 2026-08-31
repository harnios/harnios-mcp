import type { ReactNode } from "react";

/** Label + control wrapper (spec 034) — replaces the repeated
 * `<label>text<input style={{ display: "block", width: "100%" }} /></label>`.
 * The control (`<input className="input">` / `<select>` / `<textarea>`) is
 * passed as children verbatim, so `name`, `required`, `defaultValue`,
 * `placeholder`, `autoFocus`, etc. are untouched. */
export function Field({
  label,
  hint,
  htmlFor,
  className = "",
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`field${className ? ` ${className}` : ""}`} htmlFor={htmlFor}>
      <span className="field__label">{label}</span>
      {children}
      {hint ? <span className="field__hint muted">{hint}</span> : null}
    </label>
  );
}
