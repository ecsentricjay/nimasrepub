import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, EyeOff, Inbox, Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyInvitations } from "@/lib/reviewer/queries";
import { InvitationResponseButtons } from "./invitation-response-buttons";

export const metadata: Metadata = { title: "Reviewer Dashboard" };

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ReviewerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ declined?: string; error?: string }>;
}) {
  const { declined, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/reviewer/dashboard");

  const invitations = await getMyInvitations(user.id);

  const pending = invitations.filter((i) => i.status === "invited");
  const accepted = invitations.filter((i) => i.status === "accepted");
  const past = invitations.filter((i) =>
    ["declined", "expired"].includes(i.status)
  );

  return (
    <div className="max-w-6xl">
      <div className="rounded-md border border-border bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-green">
              Reviewer Workspace
            </p>
            <h1 className="mt-3 text-3xl font-extrabold text-brand-navy">
              Review invitations
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              Accept review invitations, track deadlines, and complete assigned
              double-blind manuscript reviews.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Inbox className="h-4 w-4 text-brand-blue" />
              Pending
            </div>
            <p className="mt-3 text-3xl font-extrabold text-brand-navy">
              {pending.length}
            </p>
          </div>
          <div className="rounded-md border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Timer className="h-4 w-4 text-brand-green" />
              Active reviews
            </div>
            <p className="mt-3 text-3xl font-extrabold text-brand-navy">
              {accepted.length}
            </p>
          </div>
          <div className="rounded-md border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <EyeOff className="h-4 w-4 text-brand-blue" />
              Double-blind
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-brand-navy">
              Identities protected
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {declined && (
        <p className="mt-6 rounded-md border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          Invitation declined.
        </p>
      )}

      {pending.length > 0 && (
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="font-semibold text-brand-navy">Pending invitations</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Respond before the deadline to keep the editorial timeline moving.
            </p>
          </div>
          <ul className="grid gap-4">
            {pending.map((inv) => (
              <li
                key={inv.id}
                className="rounded-md border border-amber-200 bg-amber-50 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-serif text-lg font-semibold leading-snug text-brand-navy">
                      {inv.article?.title ?? "Untitled manuscript"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {inv.article?.section?.name ?? "-"} &middot; Invited{" "}
                      {formatDate(inv.invited_at)}
                      {inv.deadline && ` / Deadline: ${formatDate(inv.deadline)}`}
                    </p>
                  </div>

                  <InvitationResponseButtons invitationId={inv.id} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {accepted.length > 0 && (
        <section className="mt-8 rounded-md border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-brand-navy">Active reviews</h2>
          </div>
          <ul className="divide-y divide-border">
            {accepted.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/reviewer/submissions/${inv.article_id}`}
                  className="grid gap-4 px-5 py-5 transition-colors hover:bg-muted/60 lg:grid-cols-[1fr_170px_24px] lg:items-center"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-serif text-lg font-semibold leading-snug text-brand-navy">
                      {inv.article?.title ?? "Untitled"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {inv.article?.section?.name ?? "-"}
                      {inv.deadline && ` / Deadline: ${formatDate(inv.deadline)}`}
                    </p>
                  </div>
                  <span className="inline-flex w-fit rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                    Accepted
                  </span>
                  <ArrowRight className="hidden h-4 w-4 text-muted-foreground lg:block" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {invitations.length === 0 && (
        <div className="mt-8 rounded-md border border-dashed border-border bg-surface px-8 py-14 text-center">
          <Inbox className="mx-auto h-9 w-9 text-brand-green" />
          <p className="mt-4 font-serif text-xl text-brand-navy">
            No review invitations yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            You will receive an email when you are invited to review a
            manuscript.
          </p>
        </div>
      )}

      {past.length > 0 && (
        <section className="mt-8 rounded-md border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-brand-navy">Past invitations</h2>
          </div>
          <ul className="divide-y divide-border text-sm">
            {past.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-4 px-5 py-4 text-muted-foreground"
              >
                <p className="line-clamp-1">{inv.article?.title ?? "Untitled"}</p>
                <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-bold capitalize">
                  {inv.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
