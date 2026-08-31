import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = { as?: "button"; variant?: Variant } & ComponentProps<"button">;
type LinkProps = { as: "a"; variant?: Variant } & ComponentProps<"a">;

/** Button / link with a shared look (spec 034).
 *
 * Renders a real `<button>` (default) or `<a>` (`as="a"`), and spreads every
 * other prop through — so `name`, `value`, `type`, `formAction`, `disabled`,
 * `autoFocus` all reach the DOM (the `/oauth/authorize` approve/deny buttons
 * rely on `name`/`value`). Defaults `type="button"`: a submit caller passes
 * `type="submit"` explicitly, so a cancel button never submits by accident. */
export function Button(props: ButtonProps | LinkProps) {
  const variant = props.variant ?? "primary";
  const cls = `btn btn--${variant}${props.className ? ` ${props.className}` : ""}`;

  if (props.as === "a") {
    const { as: _as, variant: _v, className: _c, ...rest } = props;
    return <a className={cls} {...rest} />;
  }

  const { as: _as, variant: _v, className: _c, type, ...rest } = props;
  return <button className={cls} type={type ?? "button"} {...rest} />;
}
