import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  FileText,
  Megaphone,
  Newspaper,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { getDashboardStats } from "@/lib/admin/queries";
import { formatNaira } from "@/lib/payments/queries";

export const metadata: Metadata = { title: "Admin Dashboard" };

function StatCard({
  label,
  value,
  sub,
  href,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
  icon: ComponentType<{ className?: string }>;
}) {
  const inner = (
    <div className="h-full rounded-md border border-border bg-surface p-5">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-brand-green-light text-brand-navy">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl font-semibold text-brand-navy">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full transition-opacity hover:opacity-85">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  const quickActions = [
    {
      href: "/admin/ghost-publish",
      label: "Ghost publish an article",
      desc: "Create and brand a published article for a client with no account.",
      icon: Newspaper,
    },
    {
      href: "/admin/announcements",
      label: "Post an announcement",
      desc: "Publish news and notices to the journal homepage.",
      icon: Megaphone,
    },
    {
      href: "/admin/users",
      label: "Manage users and roles",
      desc: "Grant reviewer, editor, and admin permissions.",
      icon: UserCog,
    },
    {
      href: "/admin/apc",
      label: "Update APC pricing",
      desc: "Set the current article processing charge.",
      icon: Banknote,
    },
  ];

  return (
    <div className="max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-brand-navy">
            Admin dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Platform overview and operational controls.
          </p>
        </div>
        <Link
          href="/policies"
          className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-surface px-4 py-2 text-sm font-semibold text-brand-navy hover:border-brand-blue"
        >
          Review policies
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total submissions"
          value={stats.totalSubmissions}
          href="/editorial/dashboard"
          icon={FileText}
        />
        <StatCard
          label="Published"
          value={stats.published}
          href="/articles"
          icon={Newspaper}
        />
        <StatCard
          label="Under review"
          value={stats.underReview}
          href="/editorial/dashboard"
          icon={ShieldCheck}
        />
        <StatCard
          label="Acceptance rate"
          value={stats.acceptanceRate !== null ? `${stats.acceptanceRate}%` : "-"}
          sub={
            stats.acceptanceRate !== null
              ? `${stats.accepted} accepted, ${stats.rejected} rejected`
              : "Insufficient data"
          }
          icon={BadgeCheck}
        />
        <StatCard
          label="Revenue collected"
          value={formatNaira(stats.totalRevenue)}
          sub="Confirmed payments only"
          href="/admin/payments"
          icon={Banknote}
        />
        <StatCard label="Rejected" value={stats.rejected} icon={FileText} />
      </div>

      <section className="mt-12">
        <h2 className="font-serif text-lg font-semibold text-brand-navy">
          Quick actions
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex gap-4 rounded-md border border-border bg-surface p-4 transition-colors hover:border-brand-blue hover:bg-muted"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted text-brand-navy group-hover:bg-brand-green-light">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-brand-navy">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {item.desc}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
