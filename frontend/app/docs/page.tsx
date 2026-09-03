import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DOCS_TOPICS, getDocsContent } from "@/lib/docs/content";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Page } from "@/app/_ui/Page";
import { PageHeader } from "@/app/_ui/PageHeader";

/**
 * The general documentation overview (spec 035) — deliberately no
 * owner-session check (FR-004): unlike /tools, /schedules, /settings, this
 * page is readable by any visitor, signed in or not. Renders the same
 * content the get_docs MCP tool returns when called with no topic
 * (lib/mcp-tools/docsTools.ts) — both read lib/docs/content.ts, never a
 * duplicated copy (FR-008).
 */
export default async function DocsPage() {
  const dict = getDictionary(await resolveLanguage()).docs;
  const content = getDocsContent(); // "overview" always exists

  return (
    <Page size="md">
      <PageHeader title={dict.pageTitle} description={dict.pageDescription} />
      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
      <h2>{dict.topicsHeading}</h2>
      <ul className="stack--sm" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {DOCS_TOPICS.filter((id) => id !== "overview").map((id) => (
          <li key={id}>
            <a className="card" style={{ display: "block" }} href={`/docs/${id}`}>
              {dict.topics[id]}
            </a>
          </li>
        ))}
      </ul>
    </Page>
  );
}
