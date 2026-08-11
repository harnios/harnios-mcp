/**
 * `html-to-text` ships no TypeScript types of its own, and the community
 * `@types/html-to-text` package is pinned to the v9 API (this project uses
 * v10) — declaring only the one export this codebase actually calls avoids
 * pulling in a version-mismatched types package (spec 030 research.md §2).
 */
declare module "html-to-text" {
  export function convert(html: string, options?: Record<string, unknown>): string;
}
