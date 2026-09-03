import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Code-bundled Markdown documentation about how to use the Harnios app
 * itself (spec 035) — read once at module load, with every path spelled out
 * literally (mirrors lib/mcp-tools/engineTools.ts's ENGINE_CONTENT) so
 * Vercel's build-time file tracing (`@vercel/nft`) bundles every file.
 *
 * Deliberately separate from lib/os/engine/ (spec 016/033): that content is
 * scoped to building/repairing a connected assistant's own operating
 * instructions for a specific business; this content is generic, in-app
 * documentation for the human owner about the app itself (spec.md FR-009).
 * Both the /docs page routes and the get_docs MCP tool
 * (lib/mcp-tools/docsTools.ts) import from this one module — neither reads a
 * .md file directly — so there is exactly one place to edit a topic's
 * content (FR-008).
 */
const DOCS_DIR = join(process.cwd(), "lib/docs");

const DOCS_CONTENT = {
  overview: readFileSync(join(DOCS_DIR, "overview.md"), "utf-8"),
  dashboard: readFileSync(join(DOCS_DIR, "dashboard.md"), "utf-8"),
  files: readFileSync(join(DOCS_DIR, "files.md"), "utf-8"),
  tools: readFileSync(join(DOCS_DIR, "tools.md"), "utf-8"),
  schedules: readFileSync(join(DOCS_DIR, "schedules.md"), "utf-8"),
  settings: readFileSync(join(DOCS_DIR, "settings.md"), "utf-8"),
} as const;

/**
 * The fixed set of documentation topics (data-model.md), in display order —
 * expected to mirror NAV_ITEMS in app/_ui/nav.ts (plus this "overview" entry,
 * which has no nav counterpart). Keep this list and NAV_ITEMS in sync by
 * hand when either changes (User Story 3, spec.md) — there is no derivation
 * between the two.
 */
export const DOCS_TOPICS = ["overview", "dashboard", "files", "tools", "schedules", "settings"] as const;

export type DocsTopicId = (typeof DOCS_TOPICS)[number];

export function isDocsTopicId(value: string): value is DocsTopicId {
  return (DOCS_TOPICS as readonly string[]).includes(value);
}

/**
 * Returns a topic's Markdown content — the overview when `topicId` is
 * omitted, `undefined` when `topicId` doesn't match a known topic. Callers
 * (the get_docs MCP tool, the /docs page routes) each decide how to surface
 * "not found" in the way appropriate to their own surface (contracts/
 * get-docs-tool.md, contracts/docs-page-routes.md) — this function only
 * reports it, it has no opinion on presentation.
 */
export function getDocsContent(topicId?: string): string | undefined {
  if (topicId === undefined) return DOCS_CONTENT.overview;
  return isDocsTopicId(topicId) ? DOCS_CONTENT[topicId] : undefined;
}
