import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEditorialSubmissionDetail } from "@/lib/editorial/queries";
import {
  recordDecisionAction,
  updateArticleStatusAction,
} from "@/lib/editorial/actions";
import { getVolumesAndIssues } from "@/lib/editorial/publishing";
import { waivePaymentAction, recordManualPaymentAction } from "@/lib/payments/actions";
import { getPaymentInfo, formatNaira } from "@/lib/payments/queries";
import { statusLabel, statusColor } from "@/lib/author/queries";
import { SubmitButton } from "@/components/submit-button";
import { PublishingPanel } from "@/components/publishing-panel";
import { ReviewerSearch } from "./reviewer-search";

export const metadata: Metadata = { title: "Submission — Editorial" };

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-NG", {
    day: "numeric", month: "long", year: "numeric",
  });
}

const FILE_TYPE_LABELS: Record<string, string> = {
  original_submission: "Manuscript (original)",
  revision: "Revised manuscript",
  cover_letter: "Cover letter",
  supplementary: "Supplementary",
  response_to_reviewers: "Response to reviewers",
  final_pdf: "Final PDF",
};

const DECISION_OPTIONS = [
  { value: "accept", label: "Accept" },
  { value: "minor_revisions", label: "Minor revisions" },
  { value: "major_revisions", label: "Major revisions" },
  { value: "reject", label: "Reject" },
];

const STATUS_OPTIONS = [
  "submitted", "under_review", "revisions_requested", "accepted",
  "awaiting_payment", "in_production", "published", "rejected", "withdrawn",
];

export default async function EditorialSubmissionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    invited?: string;
    decision?: string;
    status_updated?: string;
    pdf_uploaded?: string;
    pdf_regenerated?: string;
    issue_assigned?: string;
    published?: string;
    payment_waived?: string;
    payment_recorded?: string;
    warning?: string;
  }>;
}) {
  const { id } = await params;
  const {
    error, invited, decision, status_updated,
    pdf_uploaded, pdf_regenerated, issue_assigned, published,
    payment_waived, payment_recorded, warning,
  } = await searchParams;

  const [submission, { volumes, issues }, { payment, apcRate }] = await Promise.all([
    getEditorialSubmissionDetail(id),
    getVolumesAndIssues(),
    getPaymentInfo(id),
  ]);
  if (!submission) notFound();

  const currentRound =
    (submission.decisions[0]?.round ?? 0) + 1;

  const submittedReviews = submission.reviews.filter(
    (r) => r.submitted_at !== null
  );

  return (
    <div className="max-w-3xl">
      <Link
        href="/editorial/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-blue"
      >
        &larr; Back to dashboard
      </Link>

      {/* Banners */}
      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {invited && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Reviewer invited successfully.
        </div>
      )}
      {decision && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Decision recorded and email sent to the corresponding author.
        </div>
      )}
      {status_updated && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Article status updated.
        </div>
      )}
      {pdf_uploaded && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Final PDF uploaded successfully.
        </div>
      )}
      {pdf_regenerated && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          PDF regenerated/restamped successfully.
        </div>
      )}
      {issue_assigned && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Volume/issue assignment saved.
        </div>
      )}
      {warning && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warning}
        </div>
      )}
      {published && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 font-medium">
          🎉 Article published! It is now publicly visible on the journal website.
        </div>
      )}
      {payment_waived && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          APC waived. Article moved to in production.
        </div>
      )}
      {payment_recorded && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Manual payment recorded. Article moved to in production.
        </div>
      )}

      {/* Header */}
      <div className="mt-6">
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="flex-1 font-serif text-2xl font-semibold leading-snug text-brand-navy sm:text-3xl">
            {submission.title}
          </h1>
          <span
            className={`shrink-0 self-start rounded-full px-3 py-1 text-xs font-medium ${statusColor(
              submission.status
            )}`}
          >
            {statusLabel(submission.status)}
          </span>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Section</dt>
            <dd className="mt-0.5">{submission.section?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submitted</dt>
            <dd className="mt-0.5">{formatDate(submission.submitted_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Review round</dt>
            <dd className="mt-0.5">{currentRound}</dd>
          </div>
        </dl>
      </div>

      {/* Authors */}
      <section className="mt-8">
        <h2 className="font-serif text-lg font-semibold text-brand-navy">Authors</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {submission.authors.map((a) => (
            <li key={a.id}>
              <span className="font-medium">{a.display_name}</span>
              {a.affiliation && <span className="text-muted-foreground"> — {a.affiliation}</span>}
              {a.email && <span className="text-muted-foreground"> &lt;{a.email}&gt;</span>}
              {a.is_corresponding && (
                <span className="ml-2 text-xs text-brand-blue">(corresponding)</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Abstract */}
      <section className="mt-8">
        <h2 className="font-serif text-lg font-semibold text-brand-navy">Abstract</h2>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">{submission.abstract}</p>
        {submission.keywords.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {submission.keywords.map((kw) => (
              <span key={kw} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {kw}
              </span>
            ))}
          </div>
        )}
      </section>

      <hr className="my-8 border-border" />

      {/* Files */}
      <section>
        <h2 className="font-serif text-lg font-semibold text-brand-navy">Files</h2>
        <ul className="mt-3 divide-y divide-border rounded-md border border-border text-sm">
          {submission.files.map((f) => (
            <li key={f.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{FILE_TYPE_LABELS[f.file_type] ?? f.file_type}</p>
                <p className="text-xs text-muted-foreground">v{f.version} · {formatDate(f.created_at)}</p>
              </div>
              {f.signed_url && (
                <a href={f.signed_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-medium text-brand-blue hover:underline">
                  Download
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>

      <hr className="my-8 border-border" />

      {/* Review invitations */}
      <section>
        <h2 className="font-serif text-lg font-semibold text-brand-navy">Peer reviewers</h2>

        {submission.invitations.length > 0 && (
          <ul className="mt-3 divide-y divide-border rounded-md border border-border text-sm">
            {submission.invitations.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">{inv.reviewer?.full_name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.reviewer?.affiliation ?? inv.reviewer?.email ?? "—"}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  inv.status === "accepted" ? "bg-green-50 text-green-700 border border-green-200" :
                  inv.status === "declined" ? "bg-red-50 text-red-700 border border-red-200" :
                  inv.status === "expired" ? "bg-muted text-muted-foreground" :
                  "bg-amber-50 text-amber-700 border border-amber-200"
                }`}>
                  {inv.status}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Invite reviewer */}
        <div className="mt-6 rounded-md border border-border p-5">
          <p className="text-sm font-semibold text-brand-navy">Invite a reviewer</p>
          <ReviewerSearch articleId={id} />
        </div>
      </section>

      <hr className="my-8 border-border" />

      {/* Submitted reviews */}
      {submittedReviews.length > 0 && (
        <>
          <section>
            <h2 className="font-serif text-lg font-semibold text-brand-navy">
              Reviews ({submittedReviews.length})
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Reviewer identities are visible to editors only — not disclosed to authors (double-blind).
            </p>
            <div className="mt-4 space-y-4">
              {submittedReviews.map((r) => (
                <div key={r.id} className="rounded-md border border-border p-5 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-navy">
                        {r.reviewer?.full_name ?? "Reviewer"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Round {r.round} · {formatDate(r.submitted_at)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium capitalize">
                      {r.recommendation?.replace(/_/g, " ") ?? "—"}
                    </span>
                  </div>
                  {r.comments_to_author && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Comments to author
                      </p>
                      <p className="mt-1 whitespace-pre-wrap leading-relaxed text-foreground/90">
                        {r.comments_to_author}
                      </p>
                    </div>
                  )}
                  {r.comments_to_editor && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Confidential comments to editor
                      </p>
                      <p className="mt-1 whitespace-pre-wrap leading-relaxed text-foreground/90">
                        {r.comments_to_editor}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
          <hr className="my-8 border-border" />
        </>
      )}

      {/* Past decisions */}
      {submission.decisions.length > 0 && (
        <>
          <section>
            <h2 className="font-serif text-lg font-semibold text-brand-navy">Decision history</h2>
            <div className="mt-4 space-y-3">
              {submission.decisions.map((d) => (
                <div key={d.id} className="rounded-md border border-border p-4 text-sm">
                  <p className="font-semibold capitalize text-brand-navy">
                    {d.decision.replace(/_/g, " ")}
                    <span className="ml-2 font-normal text-muted-foreground">
                      Round {d.round} · {formatDate(d.created_at)}
                    </span>
                  </p>
                  {d.decision_letter && (
                    <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                      {d.decision_letter}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
          <hr className="my-8 border-border" />
        </>
      )}

      {/* Record decision */}
      {!["published", "rejected", "withdrawn"].includes(submission.status) && (
        <section>
          <h2 className="font-serif text-lg font-semibold text-brand-navy">
            Record editorial decision
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This will update the article status and email the corresponding author.
          </p>

          <form action={recordDecisionAction} className="mt-5 space-y-4">
            <input type="hidden" name="article_id" value={id} />
            <input type="hidden" name="round" value={currentRound} />

            <div>
              <label className="text-sm font-medium text-foreground">Decision</label>
              <select
                name="decision"
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-blue"
              >
                {DECISION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">
                Decision letter <span className="text-red-500">*</span>
              </label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                This will be emailed to the corresponding author.
              </p>
              <textarea
                name="decision_letter"
                rows={10}
                required
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-blue"
                placeholder="Dear [Author name],&#10;&#10;Thank you for submitting your manuscript..."
              />
            </div>

            <SubmitButton pendingText="Recording decision...">
              Record decision & notify author
            </SubmitButton>
          </form>
        </section>
      )}

      {/* Payment management — for awaiting_payment articles */}
      {submission.status === "awaiting_payment" && (
        <>
          <hr className="my-8 border-border" />
          <section>
            <h2 className="font-serif text-lg font-semibold text-brand-navy">
              APC payment management
            </h2>

            {/* Current payment status */}
            <div className="mt-3 rounded-md bg-muted p-4 text-sm">
              {payment?.status === "paid" ? (
                <p className="text-green-700 font-medium">
                  ✓ Payment confirmed —{" "}
                  {formatNaira(payment.amount_charged)},
                  ref: {payment.paystack_reference ?? "—"}
                </p>
              ) : payment?.status === "waived" ? (
                <p className="text-green-700 font-medium">
                  ✓ Payment waived — {payment.waived_reason}
                </p>
              ) : payment?.status === "pending" ? (
                <p className="text-amber-700">
                  Payment pending — author has initiated checkout
                  (ref: {payment.paystack_reference ?? "—"})
                </p>
              ) : (
                <p className="text-muted-foreground">
                  No payment on record yet.
                  {apcRate
                    ? ` Current APC: ${formatNaira(apcRate.amount)}`
                    : " APC rate not configured."}
                </p>
              )}
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {/* Waive */}
              <div className="rounded-md border border-border p-5">
                <p className="text-sm font-semibold text-brand-navy">
                  Waive payment
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Waive the APC for this author. A reason is required for
                  audit purposes.
                </p>
                <form action={waivePaymentAction} className="mt-4 space-y-3">
                  <input type="hidden" name="article_id" value={id} />
                  <textarea
                    name="waived_reason"
                    required
                    rows={3}
                    placeholder="e.g. Invited article, institutional agreement, financial hardship..."
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs outline-none focus:border-brand-blue"
                  />
                  <SubmitButton pendingText="Saving...">
                    Waive APC
                  </SubmitButton>
                </form>
              </div>

              {/* Manual payment */}
              <div className="rounded-md border border-border p-5">
                <p className="text-sm font-semibold text-brand-navy">
                  Record manual payment
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Author paid offline (bank transfer, etc.)
                </p>
                <form
                  action={recordManualPaymentAction}
                  className="mt-4 space-y-3"
                >
                  <input type="hidden" name="article_id" value={id} />
                  <div>
                    <label className="text-xs font-medium text-foreground">
                      Amount (₦)
                    </label>
                    <input
                      type="number"
                      name="amount"
                      required
                      min={0}
                      step="0.01"
                      defaultValue={apcRate?.amount ?? ""}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs outline-none focus:border-brand-blue"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">
                      Reference / receipt no.
                    </label>
                    <input
                      type="text"
                      name="reference"
                      placeholder="Bank transfer ref, receipt no..."
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs outline-none focus:border-brand-blue"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">
                      Note
                    </label>
                    <input
                      type="text"
                      name="note"
                      placeholder="Optional note for records"
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs outline-none focus:border-brand-blue"
                    />
                  </div>
                  <SubmitButton pendingText="Recording...">
                    Record payment
                  </SubmitButton>
                </form>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Publishing pipeline — shown when article is in production or accepted/awaiting payment */}
      {["accepted", "awaiting_payment", "in_production", "published"].includes(
        submission.status
      ) && (
        <>
          <hr className="my-8 border-border" />
          <section>
            <h2 className="font-serif text-lg font-semibold text-brand-navy">
              Publishing pipeline
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload the final typeset PDF, assign to a volume/issue, then
              publish.
            </p>
            <div className="mt-6">
              <PublishingPanel
                articleId={id}
                currentStatus={submission.status}
                hasPdf={!!submission.pdf_path}
                issueId={submission.issue_id}
                doi={submission.doi}
                doiStatus={submission.doi_status}
                pageStart={submission.page_start}
                pageEnd={submission.page_end}
                articleOrder={submission.article_order}
                volumes={volumes}
                issues={issues}
              />
            </div>
          </section>
        </>
      )}

      {/* Manual status override */}
      <section className="mt-10 rounded-md border border-border p-5">
        <p className="text-sm font-semibold text-brand-navy">
          Override article status
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Use this to manually correct the status without sending a decision email.
        </p>
        <form action={updateArticleStatusAction} className="mt-3 flex gap-3">
          <input type="hidden" name="article_id" value={id} />
          <select
            name="status"
            defaultValue={submission.status}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-blue"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </select>
          <SubmitButton pendingText="Saving...">Update</SubmitButton>
        </form>
      </section>
    </div>
  );
}
