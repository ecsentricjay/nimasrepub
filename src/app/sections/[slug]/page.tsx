import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ArticleCard } from "@/components/article-card";
import { getPublishedArticles, getSectionBySlug } from "@/lib/articles";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const section = await getSectionBySlug(slug);
  if (!section) return {};

  return {
    title: section.name,
    description:
      section.description ??
      `Published articles in ${section.name} from NIMASREPUB.`,
  };
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const section = await getSectionBySlug(slug);
  if (!section) notFound();

  const articles = await getPublishedArticles({ sectionSlug: slug });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-green">
          Section
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-brand-navy">
          {section.name}
        </h1>
        {section.description && (
          <p className="mt-2 text-muted-foreground">{section.description}</p>
        )}

        <div className="mt-10">
          {articles.length === 0 ? (
            <p className="text-muted-foreground">
              No articles have been published in this section yet.
            </p>
          ) : (
            articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
