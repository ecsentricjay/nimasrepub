import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ArticleCard } from "@/components/article-card";
import { getPublishedArticles, getSections } from "@/lib/articles";
import { getAllAnnouncements } from "@/lib/admin/queries";

const commitments = [
  {
    label: "Open Access Journal",
    body: "Every published article remains free to read, download, and cite.",
  },
  {
    label: "Double-Blind Review",
    body: "Author and reviewer identities are protected throughout peer review.",
  },
  {
    label: "Scholar-Ready Metadata",
    body: "Article pages are built for durable indexing and citation discovery.",
  },
];

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [sections, latestArticles, announcements] = await Promise.all([
    getSections(),
    getPublishedArticles({ limit: 3 }),
    getAllAnnouncements(),
  ]);

  const publishedAnnouncements = announcements
    .filter((a) => a.published_at && new Date(a.published_at) <= new Date())
    .slice(0, 3);

  return (
    <>
      <SiteHeader />

      <main>
        <section className="border-b border-border bg-background">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:py-24">
            <div>
              <p className="inline-flex rounded-full bg-brand-green-light px-3 py-1 text-xs font-bold text-brand-green">
                Open Access Journal - ISSN pending
              </p>
              <h1 className="mt-8 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-brand-navy sm:text-6xl">
                Advancing Health. Generating Knowledge.{" "}
                <span className="text-brand-green">Impacting Lives.</span>
              </h1>
              <p className="mt-7 max-w-2xl font-serif text-lg leading-8 text-foreground/80">
                The premier scholarly repository for Nigerian medical and
                allied sciences, fostering rigorous research and global
                scientific collaboration.
              </p>
              <div className="mt-9 flex flex-wrap gap-4">
                <Link
                  href="/signup"
                  className="rounded-sm bg-brand-navy px-6 py-3 text-sm font-bold text-white hover:bg-brand-blue"
                >
                  Submit Manuscript
                </Link>
                <Link
                  href="/issues"
                  className="rounded-sm border border-brand-navy px-6 py-3 text-sm font-bold text-brand-navy hover:bg-surface"
                >
                  View Latest Issue
                </Link>
              </div>
            </div>

            <div className="rounded-md border border-border bg-surface p-6">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Publication Standards
              </p>
              <div className="mt-6 grid gap-4">
                {commitments.map((item) => (
                  <div key={item.label} className="border-l-4 border-brand-green pl-4">
                    <p className="font-semibold text-brand-navy">{item.label}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="sections" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-brand-navy">Journal Scope</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
              Multidisciplinary excellence across the full spectrum of health
              care, laboratory sciences, and public health.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sections.slice(0, 6).map((section) => (
              <Link
                key={section.id}
                href={`/sections/${section.slug}`}
                className="rounded-md border border-border bg-surface p-6 hover:border-brand-blue"
              >
                <p className="font-semibold text-brand-navy">{section.name}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {section.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-brand-navy">
                  Latest Articles
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Recently published research from NIMASREPUB.
                </p>
              </div>
              <Link href="/articles" className="text-sm font-bold text-brand-blue hover:underline">
                Archive
              </Link>
            </div>

            <div className="mt-8 grid gap-5">
              {latestArticles.length === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-surface p-8 text-sm text-muted-foreground">
                  No articles have been published yet.
                </div>
              ) : (
                latestArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-md border border-border bg-surface p-5">
              <h3 className="font-semibold text-brand-navy">Announcements</h3>
              <div className="mt-4 space-y-4">
                {publishedAnnouncements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No announcements published yet.
                  </p>
                ) : (
                  publishedAnnouncements.map((item) => (
                    <div key={item.id} className="border-l-2 border-brand-green pl-3">
                      <p className="text-[11px] font-bold uppercase text-brand-green">
                        {item.published_at
                          ? new Date(item.published_at).toLocaleDateString("en-NG")
                          : ""}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-foreground">
                        {item.title}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-md bg-brand-navy p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-green-light">
                Global Indexing
              </p>
              <h3 className="mt-3 font-semibold">Google Scholar Ready</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/78">
                Article pages include server-rendered citation metadata,
                stable URLs, and public PDF access.
              </p>
            </div>

            <div className="rounded-md border border-border bg-surface p-5">
              <p className="text-sm font-semibold text-brand-navy">
                Editorial Leadership
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Board profiles and public policies are next in the launch
                content queue.
              </p>
            </div>
          </aside>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
