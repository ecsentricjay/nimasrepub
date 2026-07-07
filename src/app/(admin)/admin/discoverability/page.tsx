import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  BookOpenCheck,
  ExternalLink,
  FileSearch,
  Globe2,
  ListChecks,
  Network,
} from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const metadata: Metadata = { title: "Discoverability Readiness" };

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimasrepub.com.ng";

async function getStats() {
  const db = createServiceRoleClient();

  const [
    { count: published },
    { count: registeredDoi },
    { count: pendingDoi },
    { count: withPdf },
  ] = await Promise.all([
    db
      .from("articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    db
      .from("articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .eq("doi_status", "registered"),
    db
      .from("articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .eq("doi_status", "pending"),
    db
      .from("articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .not("pdf_path", "is", null),
  ]);

  return {
    published: published ?? 0,
    registeredDoi: registeredDoi ?? 0,
    pendingDoi: pendingDoi ?? 0,
    withPdf: withPdf ?? 0,
  };
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl font-semibold text-brand-navy">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Checklist({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: string[];
}) {
  return (
    <section className="rounded-md border border-border bg-surface p-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-brand-green-light text-brand-navy">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="font-serif text-lg font-semibold text-brand-navy">
          {title}
        </h2>
      </div>
      <ul className="mt-5 space-y-3 text-sm leading-6 text-foreground/82">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function DiscoverabilityPage() {
  const stats = await getStats();

  const endpoints = [
    { label: "Sitemap", href: `${siteUrl}/sitemap.xml` },
    { label: "Robots", href: `${siteUrl}/robots.txt` },
    { label: "OAI Identify", href: `${siteUrl}/oai?verb=Identify` },
    {
      label: "OAI Records",
      href: `${siteUrl}/oai?verb=ListRecords&metadataPrefix=oai_dc`,
    },
  ];

  return (
    <div className="max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-brand-navy">
            Discoverability readiness
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Operational checklist for DOI management, CrossRef preparation,
            OAI-PMH harvesting, Google Scholar SEO, sitemap verification, DOAJ,
            and AJOL readiness.
          </p>
        </div>
        <Link
          href="/policies"
          className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-surface px-4 py-2 text-sm font-semibold text-brand-navy hover:border-brand-blue"
        >
          Policies
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Published articles" value={stats.published} />
        <Stat
          label="Registered DOIs"
          value={stats.registeredDoi}
          sub={`${stats.pendingDoi} pending`}
        />
        <Stat
          label="PDF coverage"
          value={`${stats.withPdf}/${stats.published}`}
          sub="Published records with PDFs"
        />
        <Stat label="OAI endpoint" value="Active" sub="/oai?verb=Identify" />
      </div>

      <section className="mt-8 rounded-md border border-border bg-surface p-5">
        <h2 className="font-serif text-lg font-semibold text-brand-navy">
          Public endpoints
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {endpoints.map((endpoint) => (
            <a
              key={endpoint.href}
              href={endpoint.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm font-medium text-brand-navy hover:border-brand-blue hover:bg-muted"
            >
              {endpoint.label}
              <ExternalLink className="h-4 w-4" />
            </a>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Checklist
          title="DOI and CrossRef workflow"
          icon={Network}
          items={[
            "Assign a DOI value in the publishing panel and mark status as pending until registration is complete.",
            "Confirm the DOI resolves to the public article URL before switching status to registered.",
            "Use article title, authors, publication date, issue metadata, DOI, abstract, URL, and PDF URL as the deposit metadata set.",
            "After CrossRef credentials are available, the next step is an automated deposit action/API integration.",
          ]}
        />
        <Checklist
          title="Scholar and SEO"
          icon={FileSearch}
          items={[
            "Article pages expose citation meta tags, canonical URLs, JSON-LD, abstracts, author names, DOI, and PDF URLs.",
            "Every published article should have a public PDF and a stable article URL before external indexing outreach.",
            "Sitemap includes articles, issues, sections, policies, and the OAI-PMH endpoint.",
            "Robots allows public content and blocks dashboards, API routes, login, and signup pages.",
          ]}
        />
        <Checklist
          title="DOAJ readiness"
          icon={BookOpenCheck}
          items={[
            "Finalize aims/scope, peer review, ethics, APC, copyright/licensing, and privacy pages.",
            "Confirm ISSN, publisher details, editorial board, licensing terms, APC amount, and archiving policy.",
            "Maintain published article landing pages with clear authorship, dates, DOI, references/PDF, and licensing.",
            "Keep OAI-PMH available with oai_dc metadata for harvesting.",
          ]}
        />
        <Checklist
          title="AJOL readiness"
          icon={Globe2}
          items={[
            "Prepare journal title, ISSN, publisher, editorial board, contact, frequency, APC, and peer review statement.",
            "Ensure issue pages contain ordered articles, page numbers, cover pages, and tables of contents.",
            "Ensure each article has complete metadata, PDF, DOI status, author affiliations, and publication month.",
            "Use the OAI-PMH and sitemap URLs when submitting technical metadata to indexing partners.",
          ]}
        />
        <Checklist
          title="Final pre-launch checks"
          icon={ListChecks}
          items={[
            "Set NEXT_PUBLIC_SITE_URL to the production domain before deployment.",
            "Verify robots.txt and sitemap.xml on production after deployment, not only localhost.",
            "Run OAI Identify and ListRecords after at least one real article is published.",
            "Avoid publishing placeholder or test articles where crawlers can index them.",
          ]}
        />
      </div>
    </div>
  );
}
