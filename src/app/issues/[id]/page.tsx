import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getIssueDetail } from "@/lib/issues/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const issue = await getIssueDetail(id);
  if (!issue) return {};
  const vol = issue.volume;
  return {
    title: issue.title
      ? `${issue.title} — NIMASREPUB`
      : `Vol. ${vol?.number ?? "?"} Issue ${issue.number} — NIMASREPUB`,
    description: `Table of contents for Volume ${vol?.number}, Issue ${issue.number} of the Nigerian Medical and Allied Sciences Research Publication.`,
  };
}

function formatAuthorList(
  authors: { display_name: string }[],
  maxShown = 3
): string {
  if (authors.length === 0) return "";
  if (authors.length <= maxShown) {
    return authors.map((a) => a.display_name).join(", ");
  }
  return (
    authors
      .slice(0, maxShown)
      .map((a) => a.display_name)
      .join(", ") + ` et al.`
  );
}

export default async function IssuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const issue = await getIssueDetail(id);
  if (!issue) notFound();

  const vol = issue.volume;
  const issueLabel = issue.title
    ? issue.title
    : `Volume ${vol?.number ?? "?"}, Issue ${issue.number}`;

  // Group articles by section for the TOC
  const bySection = issue.articles.reduce<
    Record<string, typeof issue.articles>
  >((acc, art) => {
    const key = art.section?.name ?? "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(art);
    return acc;
  }, {});

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted-foreground">
          <Link href="/articles" className="hover:text-brand-blue">
            Articles
          </Link>{" "}
          / {issueLabel}
        </nav>

        {/* Issue header */}
        <div className="mt-4 border-b-2 border-brand-navy pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-green">
            Nigerian Medical and Allied Sciences Research Publication
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-brand-navy">
            {issueLabel}
          </h1>
          {vol && (
            <p className="mt-1 text-sm text-muted-foreground">
              Vol. {vol.number} &middot; {vol.year}
              {issue.published_at && (
                <>
                  {" "}&middot;{" "}
                  {new Date(issue.published_at).toLocaleDateString("en-NG", {
                    month: "long",
                    year: "numeric",
                  })}
                </>
              )}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-4">
          <Link
            href={`/issues/${id}/cover`}
            className="text-sm font-medium text-brand-blue hover:underline"
          >
            View cover page &rarr;
          </Link>
        </div>

        {/* Table of contents */}
        {issue.articles.length === 0 ? (
          <p className="mt-10 text-muted-foreground">
            No published articles in this issue yet.
          </p>
        ) : (
          <div className="mt-10">
            <h2 className="font-serif text-xl font-semibold text-brand-navy">
              Table of contents
            </h2>

            {Object.entries(bySection).map(([sectionName, articles]) => (
              <section key={sectionName} className="mt-8">
                <h3 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-brand-green">
                  {sectionName}
                </h3>
                <ul className="mt-3 divide-y divide-border">
                  {articles.map((article) => (
                    <li
                      key={article.id}
                      className="flex items-start justify-between gap-6 py-4"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/articles/${article.slug}`}
                          className="font-serif font-semibold leading-snug text-brand-navy hover:text-brand-blue"
                        >
                          {article.title}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatAuthorList(article.authors)}
                        </p>
                      </div>
                      {article.page_start && (
                        <span className="shrink-0 font-serif text-sm font-medium text-muted-foreground">
                          {article.page_start}
                          {article.page_end ? `–${article.page_end}` : ""}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
