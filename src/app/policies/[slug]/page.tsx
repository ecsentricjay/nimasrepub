import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPolicyPage, policyPages } from "@/lib/content/policies";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return policyPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getPolicyPage(slug);

  if (!page) {
    return { title: "Policy not found" };
  }

  return {
    title: page.title,
    description: page.description,
  };
}

export default async function PolicyDetailPage({ params }: Props) {
  const { slug } = await params;
  const page = getPolicyPage(slug);

  if (!page) notFound();

  const currentIndex = policyPages.findIndex((item) => item.slug === page.slug);
  const nextPage = policyPages[(currentIndex + 1) % policyPages.length];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[260px_1fr] lg:py-16">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <Link
            href="/policies"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-blue hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            All policies
          </Link>
          <nav className="mt-6 rounded-md border border-border bg-surface p-3">
            {policyPages.map((item) => (
              <Link
                key={item.slug}
                href={`/policies/${item.slug}`}
                className={`block rounded px-3 py-2 text-sm font-medium transition-colors ${
                  item.slug === page.slug
                    ? "bg-brand-navy text-white"
                    : "text-foreground/75 hover:bg-muted hover:text-brand-navy"
                }`}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </aside>

        <article className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-green">
            Updated {page.updated}
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-brand-navy sm:text-5xl">
            {page.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            {page.description}
          </p>

          <div className="mt-10 space-y-10">
            {page.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-serif text-2xl font-semibold text-brand-navy">
                  {section.heading}
                </h2>
                <div className="mt-4 space-y-4 text-base leading-8 text-foreground/82">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <Link
            href={`/policies/${nextPage.slug}`}
            className="mt-12 inline-flex items-center gap-2 rounded-sm bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue"
          >
            Next: {nextPage.title}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
