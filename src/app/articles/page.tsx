import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ArticleCard } from "@/components/article-card";
import { getPublishedArticles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Articles",
  description:
    "Browse all published, open-access articles from the Nigerian Medical and Allied Sciences Research Publication.",
};

export const revalidate = 300;

export default async function ArticlesPage() {
  const articles = await getPublishedArticles();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-serif text-3xl font-semibold text-brand-navy">
          Articles
        </h1>
        <p className="mt-2 text-muted-foreground">
          {articles.length} published article{articles.length === 1 ? "" : "s"}
        </p>

        <div className="mt-10">
          {articles.length === 0 ? (
            <p className="text-muted-foreground">
              No articles have been published yet.
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
