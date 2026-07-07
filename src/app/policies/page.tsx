import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { policyPages } from "@/lib/content/policies";

export const metadata: Metadata = {
  title: "Journal Policies",
  description:
    "Author guidelines, peer review policy, ethics, APC, copyright, and privacy information for NIMASREPUB.",
};

export default function PoliciesPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="max-w-3xl">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-sm bg-brand-green-light text-brand-navy">
            <BookOpenCheck className="h-5 w-5" />
          </div>
          <h1 className="mt-5 font-serif text-4xl font-semibold tracking-tight text-brand-navy sm:text-5xl">
            Journal policies
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Core editorial, author, review, ethics, payment, copyright, and
            privacy policies for Nigerian Medical and Allied Sciences Research
            Publication.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {policyPages.map((page) => (
            <Link
              key={page.slug}
              href={`/policies/${page.slug}`}
              className="group flex min-h-48 flex-col justify-between rounded-md border border-border bg-surface p-5 transition-colors hover:border-brand-blue hover:bg-surface-soft"
            >
              <div>
                <p className="font-serif text-xl font-semibold text-brand-navy">
                  {page.title}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {page.description}
                </p>
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-blue">
                Read policy
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
