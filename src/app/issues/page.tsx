import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getAllIssues } from "@/lib/issues/queries";

export const metadata: Metadata = {
  title: "Issues",
  description: "Browse all issues of the Nigerian Medical and Allied Sciences Research Publication.",
};

export const dynamic = "force-dynamic";

function issueTitle(issue: Awaited<ReturnType<typeof getAllIssues>>[number]) {
  return issue.title
    ? issue.title
    : `Volume ${issue.volume?.number ?? "?"}, Issue ${issue.number}`;
}

export default async function IssuesPage() {
  const issues = await getAllIssues();

  return (
    <>
      <SiteHeader />
      <main>
        <section className="border-b border-border bg-brand-navy text-white">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-green-light">
              Journal Archive
            </p>
            <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight sm:text-5xl">
              Published issues and scholarly records
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/78">
              Browse public volumes, issue covers, tables of contents, and
              assigned articles from the NIMASREPUB publication archive.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
            <aside className="rounded-md border border-border bg-surface p-5 lg:self-start">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Archive Summary
              </p>
              <dl className="mt-5 space-y-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Issues</dt>
                  <dd className="mt-1 text-3xl font-extrabold text-brand-navy">
                    {issues.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Model</dt>
                  <dd className="mt-1 text-sm font-semibold text-brand-navy">
                    Open access, double-blind review
                  </dd>
                </div>
              </dl>
            </aside>

            <div>
              {issues.length === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-surface p-10 text-center">
                  <BookOpen className="mx-auto h-8 w-8 text-brand-green" />
                  <p className="mt-4 font-serif text-xl text-brand-navy">
                    No issues published yet.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Published issues will appear here once released.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {issues.map((issue) => (
                    <article
                      key={issue.id}
                      className="rounded-md border border-border bg-surface p-5 transition-colors hover:border-brand-blue"
                    >
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="inline-flex items-center gap-2 rounded-full bg-brand-green-light px-3 py-1 text-xs font-bold text-brand-green">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {issue.volume
                              ? `Vol. ${issue.volume.number} / ${issue.volume.year}`
                              : `Issue ${issue.number}`}
                          </p>
                          <h2 className="mt-4 font-serif text-2xl font-semibold text-brand-navy">
                            {issueTitle(issue)}
                          </h2>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {issue.published_at
                              ? new Date(issue.published_at).toLocaleDateString("en-NG", {
                                  month: "long",
                                  year: "numeric",
                                })
                              : "Publication date pending"}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-3">
                          <Link
                            href={`/issues/${issue.id}/cover`}
                            className="inline-flex items-center justify-center rounded-sm border border-border px-4 py-2 text-sm font-bold text-brand-navy hover:bg-muted"
                          >
                            Cover
                          </Link>
                          <Link
                            href={`/issues/${issue.id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-sm bg-brand-navy px-4 py-2 text-sm font-bold text-white hover:bg-brand-blue"
                          >
                            Table of Contents
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
