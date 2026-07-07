import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Plus, Timer, UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMySubmissions, statusLabel, statusColor } from "@/lib/author/queries";

export const metadata: Metadata = { title: "Author Dashboard" };

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AuthorDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const submissions = await getMySubmissions(user!.id);

  const activeCount = submissions.filter((sub) =>
    ["submitted", "under_review", "revisions_requested", "accepted", "awaiting_payment", "in_production"].includes(
      sub.status
    )
  ).length;
  const publishedCount = submissions.filter((sub) => sub.status === "published").length;
  const revisionCount = submissions.filter((sub) => sub.status === "revisions_requested").length;

  return (
    <div className="max-w-6xl">
      <div className="rounded-md border border-border bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-green">
              Author Workspace
            </p>
            <h1 className="mt-3 text-3xl font-extrabold text-brand-navy">
              My manuscripts
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              Track submissions, editorial decisions, payments, revisions, and
              production status from one place.
            </p>
          </div>
          <Link
            href="/author/submit"
            className="inline-flex items-center gap-2 rounded-sm bg-brand-navy px-5 py-3 text-sm font-bold text-white hover:bg-brand-blue"
          >
            <Plus className="h-4 w-4" />
            New submission
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <FileText className="h-4 w-4 text-brand-blue" />
              Total manuscripts
            </div>
            <p className="mt-3 text-3xl font-extrabold text-brand-navy">
              {submissions.length}
            </p>
          </div>
          <div className="rounded-md border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Timer className="h-4 w-4 text-brand-green" />
              Active pipeline
            </div>
            <p className="mt-3 text-3xl font-extrabold text-brand-navy">
              {activeCount}
            </p>
          </div>
          <div className="rounded-md border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <UploadCloud className="h-4 w-4 text-brand-blue" />
              Revisions due
            </div>
            <p className="mt-3 text-3xl font-extrabold text-brand-navy">
              {revisionCount}
            </p>
          </div>
        </div>
      </div>

      {submissions.length > 0 ? (
        <div className="mt-8 rounded-md border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="font-semibold text-brand-navy">Submission tracker</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {publishedCount} published, {activeCount} active
              </p>
            </div>
          </div>

          <ul className="divide-y divide-border">
            {submissions.map((sub) => (
              <li key={sub.id}>
                <Link
                  href={`/author/submissions/${sub.id}`}
                  className="grid gap-4 px-5 py-5 transition-colors hover:bg-muted/60 lg:grid-cols-[1fr_180px_170px_24px] lg:items-center"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-serif text-lg font-semibold leading-snug text-brand-navy">
                      {sub.title}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {sub.section?.name ?? "-"} &middot; Submitted{" "}
                      {formatDate(sub.submitted_at)}
                    </p>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground">Updated</p>
                    <p className="mt-1">{formatDate(sub.updated_at)}</p>
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusColor(
                        sub.status
                      )}`}
                    >
                      {statusLabel(sub.status)}
                    </span>
                  </div>

                  <ArrowRight className="hidden h-4 w-4 text-muted-foreground lg:block" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-8 rounded-md border border-dashed border-border bg-surface px-8 py-14 text-center">
          <UploadCloud className="mx-auto h-9 w-9 text-brand-green" />
          <p className="mt-4 font-serif text-xl text-brand-navy">
            Start your first submission
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Submit an original research article, review, or case report for
            double-blind peer review.
          </p>
          <Link
            href="/author/submit"
            className="mt-6 inline-flex items-center gap-2 rounded-sm bg-brand-navy px-5 py-3 text-sm font-bold text-white hover:bg-brand-blue"
          >
            <Plus className="h-4 w-4" />
            New submission
          </Link>
        </div>
      )}
    </div>
  );
}
