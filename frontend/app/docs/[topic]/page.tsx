import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DOCS_TOPICS, getDocsContent, isDocsTopicId } from "@/lib/docs/content";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Page } from "@/app/_ui/Page";
import { PageHeader } from "@/app/_ui/PageHeader";

/**
 * One documentation topic (spec 035) — no owner-session check, mirrors
 * app/docs/page.tsx. `topic: "overview"` renders identically to the bare
 * /docs route (research.md §4) rather than being treated as unknown. An
 * unrecognized topic calls notFound(), rendered by app/docs/not-found.tsx
 * (FR-007a, contracts/docs-page-routes.md).
 */
export default async function DocsTopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  if (!isDocsTopicId(topic)) notFound();

  const content = getDocsContent(topic);
  const dict = getDictionary(await resolveLanguage()).docs;

  return (
    <Page size="md">
      <PageHeader title={dict.topics[topic]} />
      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
      <h2>{dict.topicsHeading}</h2>
      <ul className="stack--sm" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {DOCS_TOPICS.filter((id) => id !== "overview").map((id) => (
          <li key={id}>
            <a
              className="card"
              style={{ display: "block" }}
              href={`/docs/${id}`}
              aria-current={id === topic ? "page" : undefined}
            >
              {dict.topics[id]}
            </a>
          </li>
        ))}
      </ul>
    </Page>
  );
}
