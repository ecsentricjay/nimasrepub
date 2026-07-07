import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getReviewerArticleDetail } from "@/lib/reviewer/queries";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Review manuscript" };

const RECOMMENDATIONS = [
  { value: "accept", label: "Accept" },
  { value: "minor_revisions", label: "Minor revisions required" },
  { value: "major_revisions", label: "Major revisions required" },
  { value: "reject", label: "Reject" },
];

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-NG", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default async function ReviewerSubmissionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ accepted?: string; submitted?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const { accepted, submitted, error } = await searchParams;

  const detail = await getReviewerArticleDetail(id, user.id);
  if (!detail) notFound();

  const isAccepted = detail.invitation?.status === "accepted";
  const alreadySubmitted =
    detail.myReview != null && detail.myReview.submitted_at != null;

  return (
    <div className="max-w-3xl">
      <Link
        href="/reviewer/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-blue"
      >
        &larr; Back to dashboard
      </Link>

      {accepted && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Invitation accepted. Please review the manuscript below and submit
          your assessment before the deadline.
        </div>
      )}
      {submitted && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Your review has been submitted. Thank you for your contribution.
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Double-blind notice */}
      <div className="mt-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
        <strong>Double-blind peer review.</strong> Author identities have been
        removed from this view. Your identity as a reviewer will not be
        disclosed to the author.
      </div>

      {/* Header — no section label since it could hint at authorship */}
      <div className="mt-6">
        <h1 className="font-serif text-2xl font-semibold leading-snug text-brand-navy sm:text-3xl">
          {detail.title}
        </h1>
        {detail.invitation?.deadline && (
          <p className="mt-2 text-sm font-medium text-amber-700">
            Review deadline: {formatDate(detail.invitation.deadline)}
          </p>
        )}
      </div>

      {/* Abstract only — no author names (double-blind) */}
      <section className="mt-6">
        <h2 className="font-serif text-base font-semibold text-brand-navy">Abstract</h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/90">
          {detail.abstract}
        </p>
        {detail.keywords.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {detail.keywords.map((kw) => (
              <span
                key={kw}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
              >
                {kw}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Manuscript files */}
      {isAccepted && detail.files.length > 0 && (
        <section className="mt-6">
          <h2 className="font-serif text-base font-semibold text-brand-navy">
            Manuscript files
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Ensure the manuscript you download does not contain author
            identifying information. If it does, please notify the editor.
          </p>
          <ul className="mt-3 divide-y divide-border rounded-md border border-border text-sm">
            {detail.files.map((f) => (
              <li key={f.id} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm">
                  {f.file_type === "revision"
                    ? `Revised manuscript (v${f.version})`
                    : "Manuscript"}
                </p>
                {f.signed_url && (
                  <a
                    href={f.signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-brand-blue hover:underline"
                  >
                    Download
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <hr className="my-8 border-border" />

      {/* Already submitted review */}
      {alreadySubmitted && (
        <section>
          <h2 className="font-serif text-lg font-semibold text-brand-navy">
            Your submitted review
          </h2>
          <div className="mt-4 rounded-md border border-border p-5 text-sm space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recommendation
              </p>
              <p className="mt-1 font-medium capitalize text-brand-navy">
                {detail.myReview!.recommendation?.replace(/_/g, " ") ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Comments to author
              </p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed text-foreground/90">
                {detail.myReview!.comments_to_author}
              </p>
            </div>
            {detail.myReview!.comments_to_editor && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Confidential comments to editor
                </p>
                <p className="mt-1 whitespace-pre-wrap leading-relaxed text-foreground/90">
                  {detail.myReview!.comments_to_editor}
                </p>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Submitted {formatDate(detail.myReview!.submitted_at)} &middot;
            Round {detail.myReview!.round}
          </p>
        </section>
      )}

      {/* Review form */}
      {isAccepted && !alreadySubmitted && (
        <section>
          <h2 className="font-serif text-lg font-semibold text-brand-navy">
            Submit your review
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This journal uses double-blind peer review. Your identity will
            not be disclosed to the author. Your comments will be shared with
            the author and the editorial team.
          </p>

          <form
            action="/api/reviewer/reviews"
            method="post"
            className="mt-6 space-y-5"
          >
            <input type="hidden" name="article_id" value={id} />

            <div>
              <label className="text-sm font-medium text-foreground">
                Recommendation <span className="text-red-500">*</span>
              </label>
              <select
                name="recommendation"
                required
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-blue"
              >
                <option value="">Select a recommendation</option>
                {RECOMMENDATIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">
                Comments to the author <span className="text-red-500">*</span>
              </label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                These will be shared with the author anonymously. Be
                constructive and specific.
              </p>
              <textarea
                name="comments_to_author"
                required
                rows={12}
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-blue"
                placeholder="Provide a summary, your assessment, and specific suggestions..."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">
                Confidential comments to the editor
              </label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Optional. Visible to the editorial team only — not shared with the author.
              </p>
              <textarea
                name="comments_to_editor"
                rows={5}
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-blue"
              />
            </div>

            <SubmitButton pendingText="Submitting review...">
              Submit review
            </SubmitButton>
          </form>
        </section>
      )}

      {detail.invitation?.status === "invited" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          You have a pending invitation. Go to your{" "}
          <Link href="/reviewer/dashboard" className="font-medium underline">
            reviewer dashboard
          </Link>{" "}
          to accept or decline before accessing the manuscript.
        </div>
      )}
    </div>
  );
}
