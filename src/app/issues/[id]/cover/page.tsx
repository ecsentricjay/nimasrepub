import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getIssueDetail } from "@/lib/issues/queries";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const issue = await getIssueDetail(id);
  if (!issue) return {};
  return {
    title: `Cover - Vol. ${issue.volume?.number} Issue ${issue.number} - NIMASREPUB`,
  };
}

export default async function IssueCoverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const issue = await getIssueDetail(id);
  if (!issue) notFound();

  const vol = issue.volume;
  const pubDate = issue.published_at
    ? new Date(issue.published_at).toLocaleDateString("en-NG", {
        month: "long",
        year: "numeric",
      })
    : "Publication date pending";

  return (
    <>
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-3 print:hidden">
        <Link
          href={`/issues/${id}`}
          className="text-sm font-medium text-muted-foreground hover:text-brand-blue"
        >
          &larr; Back to table of contents
        </Link>
        <PrintButton />
      </div>

      <main className="mx-auto min-h-screen max-w-4xl bg-[#f7f8fb] p-5 print:m-0 print:max-w-none print:bg-white print:p-0">
        <section className="mx-auto flex min-h-[1120px] max-w-[794px] flex-col overflow-hidden bg-white shadow-2xl print:min-h-screen print:max-w-none print:shadow-none">
          <div className="h-3 bg-brand-navy" />
          <div className="h-1.5 bg-brand-green" />

          <div className="flex flex-1 flex-col px-12 py-10">
            <header className="flex items-start justify-between gap-8">
              <div className="flex items-start gap-5">
                <Image
                  src="/images/logo.png"
                  alt="NIMASREPUB"
                  width={132}
                  height={64}
                  priority
                  className="h-auto w-28"
                />
                <div>
                  <p className="font-sans text-[10px] font-extrabold uppercase tracking-[0.22em] text-brand-green">
                    Open Access Journal
                  </p>
                  <h1 className="mt-2 max-w-md font-serif text-[25px] font-bold leading-tight text-brand-navy">
                    Nigerian Medical and Allied Sciences Research Publication
                  </h1>
                </div>
              </div>
              <div className="text-right font-sans text-[10px] leading-5 text-muted-foreground">
                <p>ISSN: pending</p>
                <p>nimasrepub.com.ng</p>
              </div>
            </header>

            <section className="mt-14 grid grid-cols-[1fr_190px] gap-10">
              <div>
                <p className="font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-brand-green">
                  Journal Issue
                </p>
                <div className="mt-5 border-l-8 border-brand-green pl-6">
                  <p className="font-sans text-sm font-bold text-muted-foreground">
                    {pubDate}
                  </p>
                  <p className="mt-4 font-serif text-[58px] font-bold leading-none text-brand-navy">
                    Volume {vol?.number ?? "-"}
                  </p>
                  <p className="mt-2 font-serif text-[38px] font-semibold leading-none text-brand-blue">
                    Issue {issue.number}
                  </p>
                  {issue.title && (
                    <p className="mt-5 max-w-lg font-serif text-2xl italic leading-snug text-brand-green">
                      {issue.title}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-sm border border-border bg-surface-soft p-5">
                <p className="font-sans text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                  Publication Model
                </p>
                <div className="mt-5 space-y-4 font-sans text-sm">
                  <p className="border-l-2 border-brand-green pl-3 font-bold text-brand-navy">
                    Double-blind peer review
                  </p>
                  <p className="border-l-2 border-brand-blue pl-3 font-bold text-brand-navy">
                    Open access archive
                  </p>
                  <p className="border-l-2 border-brand-green pl-3 font-bold text-brand-navy">
                    Scholar-ready metadata
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-10 flex flex-1 items-center justify-center">
              <div className="relative flex h-[330px] w-full items-center justify-center overflow-hidden border-y border-border bg-[#fbfcff]">
                <div className="absolute inset-x-10 top-1/2 h-px bg-border" />
                <div className="absolute inset-y-8 left-1/2 w-px bg-border" />
                <Image
                  src="/images/coverpage.png"
                  alt="NIMASREPUB cover artwork"
                  width={520}
                  height={520}
                  priority
                  className="relative z-10 h-[280px] w-auto object-contain"
                />
              </div>
            </section>

            <section className="mt-10">
              <div className="grid w-full grid-cols-[1fr_220px] gap-10 border-t border-border pt-8">
                <div>
                  <p className="font-sans text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-green">
                    Issue Record
                  </p>
                  <p className="mt-3 max-w-md font-serif text-2xl leading-snug text-brand-navy">
                    Official publication cover for the NIMASREPUB scholarly
                    archive.
                  </p>
                </div>
                <dl className="space-y-4 font-sans text-sm">
                  <div>
                    <dt className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                      Articles
                    </dt>
                    <dd className="mt-1 text-2xl font-extrabold text-brand-navy">
                      {issue.articles.length}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                      Website
                    </dt>
                    <dd className="mt-1 font-bold text-brand-green">
                      nimasrepub.com.ng
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            <footer className="mt-10 border-t border-border pt-5">
              <div className="flex items-end justify-between gap-6">
                <p className="max-w-md font-sans text-[11px] leading-5 text-muted-foreground">
                  Advancing Health. Generating Knowledge. Impacting Lives.
                </p>
                <p className="font-sans text-[11px] font-bold text-brand-navy">
                  &copy; {vol?.year ?? new Date().getFullYear()} NIMASREPUB
                </p>
              </div>
            </footer>
          </div>
        </section>
      </main>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; background: #fff; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  );
}
