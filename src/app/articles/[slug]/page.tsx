import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ExternalLink, FileText } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getArticleBySlug, getPublicPdfUrl, formatAuthorList } from "@/lib/articles";

export const revalidate = 300;

const JOURNAL_TITLE = "Nigerian Medical and Allied Sciences Research Publication";

function citationDate(dateStr: string | null): string | undefined {
  if (!dateStr) return undefined;
  return dateStr.split("-").join("/");
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimasrepub.com.ng";
  const articleUrl = `${siteUrl}/articles/${article.slug}`;

  const other: Record<string, string | string[]> = {
    citation_title: article.title,
    citation_author: article.authors.map((a) => a.display_name),
    citation_journal_title: JOURNAL_TITLE,
    citation_abstract_html_url: articleUrl,
    citation_language: article.language,
  };

  const citDate = citationDate(article.publication_date);
  if (citDate) other.citation_publication_date = citDate;
  if (article.pdf_path) other.citation_pdf_url = getPublicPdfUrl(article.pdf_path);
  if (article.doi) other.citation_doi = article.doi;
  if (article.keywords.length > 0) other.citation_keywords = article.keywords;

  return {
    title: article.title,
    description: article.abstract.slice(0, 300),
    alternates: { canonical: articleUrl },
    openGraph: {
      title: article.title,
      description: article.abstract.slice(0, 300),
      url: articleUrl,
      type: "article",
    },
    other,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimasrepub.com.ng";
  const articleUrl = `${siteUrl}/articles/${article.slug}`;
  const authorNames = formatAuthorList(article.authors);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: article.title,
    abstract: article.abstract,
    datePublished: article.publication_date ?? undefined,
    inLanguage: article.language,
    keywords: article.keywords.join(", "),
    url: articleUrl,
    isAccessibleForFree: true,
    author: article.authors.map((a) => ({
      "@type": "Person",
      name: a.display_name,
      affiliation: a.affiliation ?? undefined,
    })),
    publisher: {
      "@type": "Organization",
      name: JOURNAL_TITLE,
    },
  };

  const plainCitation = `${authorNames}. (${
    article.publication_date ? new Date(article.publication_date).getFullYear() : "n.d."
  }). ${article.title}. ${JOURNAL_TITLE}${
    article.page_start
      ? `, pp. ${article.page_start}${article.page_end ? `-${article.page_end}` : ""}`
      : ""
  }.${article.doi ? ` https://doi.org/${article.doi}` : ""}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteHeader />

      <main>
        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
            {article.section && (
              <Link
                href={`/sections/${article.section.slug}`}
                className="inline-flex rounded-full bg-brand-green-light px-3 py-1 text-xs font-bold text-brand-green hover:bg-brand-green-light/80"
              >
                {article.section.name}
              </Link>
            )}

            <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_320px] lg:items-start">
              <div>
                <h1 className="max-w-4xl font-serif text-4xl font-semibold leading-tight text-brand-navy sm:text-5xl">
                  {article.title}
                </h1>
                <p className="mt-5 max-w-3xl text-sm leading-7 text-muted-foreground">
                  {authorNames}
                </p>
              </div>

              <aside className="rounded-md border border-border bg-surface p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Article Tools
                </p>
                <dl className="mt-5 space-y-4 text-sm">
                  <div>
                    <dt className="font-semibold text-brand-navy">Published</dt>
                    <dd className="mt-1 text-muted-foreground">
                      {formatDate(article.publication_date) || "Pending"}
                    </dd>
                  </div>
                  {article.page_start && (
                    <div>
                      <dt className="font-semibold text-brand-navy">Pages</dt>
                      <dd className="mt-1 text-muted-foreground">
                        {article.page_start}
                        {article.page_end ? `-${article.page_end}` : ""}
                      </dd>
                    </div>
                  )}
                  {article.doi && (
                    <div>
                      <dt className="font-semibold text-brand-navy">DOI</dt>
                      <dd className="mt-1 break-all text-muted-foreground">
                        {article.doi}
                      </dd>
                    </div>
                  )}
                </dl>

                {article.pdf_path && (
                  <a
                    href={getPublicPdfUrl(article.pdf_path)}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-brand-navy px-4 py-3 text-sm font-bold text-white hover:bg-brand-blue"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </a>
                )}
                <a
                  href={articleUrl}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-sm border border-border px-4 py-3 text-sm font-bold text-brand-navy hover:bg-muted"
                >
                  <ExternalLink className="h-4 w-4" />
                  Permanent Link
                </a>
              </aside>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_320px]">
          <article className="rounded-md border border-border bg-surface p-6 sm:p-8">
            <div className="flex items-center gap-2 text-sm font-bold text-brand-navy">
              <FileText className="h-4 w-4 text-brand-green" />
              Abstract
            </div>
            <p className="mt-5 font-serif text-lg leading-9 text-foreground/90">
              {article.abstract}
            </p>

            {article.keywords.length > 0 && (
              <div className="mt-8 border-t border-border pt-6">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Keywords
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {article.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>

          <aside className="space-y-5">
            <div className="rounded-md border border-border bg-surface p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Authors
              </p>
              <div className="mt-4 space-y-4">
                {article.authors.map((author) => (
                  <div key={author.id}>
                    <p className="text-sm font-semibold text-brand-navy">
                      {author.display_name}
                    </p>
                    {author.affiliation && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {author.affiliation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md bg-brand-navy p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-green-light">
                Cite this article
              </p>
              <p className="mt-3 text-sm leading-7 text-white/82">
                {plainCitation}
              </p>
            </div>
          </aside>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
