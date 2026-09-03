import { DOCS_TOPICS } from "@/lib/docs/content";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Page } from "@/app/_ui/Page";
import { PageHeader } from "@/app/_ui/PageHeader";

/**
 * Segment-level 404 for /docs/* (spec 035, FR-007a) — rendered whenever
 * app/docs/[topic]/page.tsx calls notFound() for an unrecognized topic.
 * Lists the valid topics from the same DOCS_TOPICS every other part of this
 * feature reads, rather than a hand-written duplicate list, per Q1 of the
 * feature's clarification session: a clear "not found" message, never a
 * silent redirect or fallback.
 */
export default async function DocsNotFound() {
  const dict = getDictionary(await resolveLanguage()).docs;

  return (
    <Page size="md">
      <PageHeader title={dict.notFoundTitle} description={dict.notFoundBody} />
      <ul className="stack--sm" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {DOCS_TOPICS.map((id) => (
          <li key={id}>
            <a className="card" style={{ display: "block" }} href={id === "overview" ? "/docs" : `/docs/${id}`}>
              {dict.topics[id]}
            </a>
          </li>
        ))}
      </ul>
      <p>
        <a href="/docs">{dict.backToOverview}</a>
      </p>
    </Page>
  );
}
