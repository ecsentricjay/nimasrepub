import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Factory,
  FileCheck2,
  Inbox,
  Timer,
  WalletCards,
} from "lucide-react";
import { statusColor, statusLabel } from "@/lib/author/queries";
import { getSubmissionQueue } from "@/lib/editorial/queries";

export const metadata: Metadata = { title: "Editorial Dashboard" };

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function countByStatus(queue: Awaited<ReturnType<typeof getSubmissionQueue>>) {
  return queue.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});
}

export default async function EditorialDashboard() {
  const queue = await getSubmissionQueue();
  const counts = countByStatus(queue);

  const grouped = queue.reduce<Record<string, typeof queue>>((acc, item) => {
    const status = item.status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(item);
    return acc;
  }, {});

  const statusOrder = [
    "submitted",
    "under_review",
    "revisions_requested",
    "accepted",
    "awaiting_payment",
    "in_production",
  ];

  const stats = [
    {
      label: "New submissions",
      value: counts.submitted ?? 0,
      icon: Inbox,
      tone: "bg-brand-green-light text-brand-navy",
    },
    {
      label: "Under review",
      value: counts.under_review ?? 0,
      icon: Timer,
      tone: "bg-amber-100 text-amber-800",
    },
    {
      label: "Revisions",
      value: counts.revisions_requested ?? 0,
      icon: ClipboardList,
      tone: "bg-blue-100 text-blue-800",
    },
    {
      label: "Accepted",
      value: counts.accepted ?? 0,
      icon: FileCheck2,
      tone: "bg-emerald-100 text-emerald-800",
    },
    {
      label: "Awaiting payment",
      value: counts.awaiting_payment ?? 0,
      icon: WalletCards,
      tone: "bg-violet-100 text-violet-800",
    },
    {
      label: "In production",
      value: counts.in_production ?? 0,
      icon: Factory,
      tone: "bg-slate-100 text-slate-800",
    },
  ];

  const priority = queue.filter((item) =>
    ["submitted", "accepted", "awaiting_payment", "in_production"].includes(
      item.status
    )
  );

  return (
    <div className="max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-brand-navy">
            Editorial dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            {queue.length} active submission{queue.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/policies/review-policy"
          className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-surface px-4 py-2 text-sm font-semibold text-brand-navy hover:border-brand-blue"
        >
          Review policy
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-md border border-border bg-surface p-4"
            >
              <div
                className={`inline-flex h-9 w-9 items-center justify-center rounded-sm ${stat.tone}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-1 font-serif text-3xl font-semibold text-brand-navy">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {queue.length === 0 ? (
        <div className="mt-10 rounded-md border border-dashed border-border bg-surface px-8 py-14 text-center">
          <p className="font-serif text-lg text-brand-navy">
            No active submissions
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Submissions will appear here once authors submit manuscripts.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-10">
            {statusOrder
              .filter((status) => grouped[status]?.length)
              .map((status) => (
                <section key={status}>
                  <div className="mb-3 flex items-center gap-3">
                    <h2 className="font-serif text-lg font-semibold text-brand-navy">
                      {statusLabel(status)}
                    </h2>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {grouped[status].length}
                    </span>
                  </div>

                  <ul className="divide-y divide-border rounded-md border border-border bg-surface">
                    {grouped[status].map((item) => (
                      <li key={item.id}>
                        <Link
                          href={`/editorial/submissions/${item.id}`}
                          className="flex flex-col gap-2 px-6 py-4 transition-colors hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="font-serif font-semibold leading-snug text-brand-navy line-clamp-2">
                              {item.title}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.authors
                                .map((author) => author.display_name)
                                .join(", ")}{" "}
                              &middot; {item.section?.name ?? "-"} &middot;{" "}
                              Submitted {formatDate(item.submitted_at)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor(
                                item.status
                              )}`}
                            >
                              {statusLabel(item.status)}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
          </div>

          <aside className="rounded-md border border-border bg-surface p-5 lg:self-start">
            <h2 className="font-serif text-lg font-semibold text-brand-navy">
              Priority work
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Items likely to need an editorial action soon.
            </p>

            {priority.length === 0 ? (
              <p className="mt-5 rounded-md bg-muted p-4 text-sm text-muted-foreground">
                No urgent editorial items are waiting.
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {priority.slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/editorial/submissions/${item.id}`}
                      className="block rounded-md border border-border p-3 hover:border-brand-blue hover:bg-muted"
                    >
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-brand-navy">
                        {item.title}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {statusLabel(item.status)} &middot;{" "}
                        {formatDate(item.submitted_at)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
