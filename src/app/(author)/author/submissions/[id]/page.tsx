import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getSubmissionDetail,
  statusLabel,
  statusColor,
} from "@/lib/author/queries";
import { submitRevisionAction } from "@/lib/author/actions";
import { getPaymentInfo, formatNaira } from "@/lib/payments/queries";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Submission detail" };

const FILE_TYPE_LABELS: Record<string, string> = {
  original_submission: "Manuscript (v1)",
  revision: "Revised manuscript",
  cover_letter: "Cover letter",
  supplementary: "Supplementary file",
  response_to_reviewers: "Response to reviewers",
  final_pdf: "Final PDF",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function SubmissionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    submitted?: string;
    revised?: string;
    error?: string;
    payment_success?: string;
  }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const { submitted, revised, error, payment_success } = await searchParams;

  const [submission, { payment, apcRate }] = await Promise.all([
    getSubmissionDetail(id, user.id),
    getPaymentInfo(id),
  ]);
  if (!submission) notFound();

  const canRevise = ["revisions_requested"].includes(submission.status);
  const awaitingPayment = submission.status === "awaiting_payment";

  return (
    <div className="max-w-3xl">
      {/* Back */}
      <Link
        href="/author/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-blue"
      >
        &larr; Back to dashboard
      </Link>

      {/* Success banners */}
      {submitted && (
        <div className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Your manuscript has been submitted successfully. You will receive a
          confirmation email shortly.
        </div>
      )}
      {revised && (
        <div className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Your revised manuscript has been submitted.
        </div>
      )}
      {payment_success && (
        <div className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 font-medium">
          Payment confirmed! Your manuscript has been moved to production.
        </div>
      )}
      {error && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
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

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Section
            </dt>
            <dd className="mt-0.5">{submission.section?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Submitted
            </dt>
            <dd className="mt-0.5">{formatDate(submission.submitted_at)}</dd>
          </div>
        </dl>
      </div>

      {/* Authors */}
      <section className="mt-8">
        <h2 className="font-serif text-lg font-semibold text-brand-navy">
          Authors
        </h2>
        <ul className="mt-3 space-y-1 text-sm">
          {submission.authors.map((a) => (
            <li key={a.id}>
              <span className="font-medium">{a.display_name}</span>
              {a.affiliation && (
                <span className="text-muted-foreground"> — {a.affiliation}</span>
              )}
              {a.is_corresponding && (
                <span className="ml-2 text-xs text-brand-blue">(corresponding)</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Abstract */}
      <section className="mt-8">
        <h2 className="font-serif text-lg font-semibold text-brand-navy">
          Abstract
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">
          {submission.abstract}
        </p>
        {submission.keywords.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {submission.keywords.map((kw) => (
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

      <hr className="my-8 border-border" />

      {/* Files */}
      <section>
        <h2 className="font-serif text-lg font-semibold text-brand-navy">
          Submitted files
        </h2>
        {submission.files.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No files on record.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-md border border-border text-sm">
            {submission.files.map((f) => (
              <li key={f.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">
                    {FILE_TYPE_LABELS[f.file_type] ?? f.file_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    v{f.version} &middot; {formatDate(f.created_at)}
                  </p>
                </div>
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
        )}
      </section>

      {/* Editorial decisions */}
      {submission.decisions.length > 0 && (
        <>
          <hr className="my-8 border-border" />
          <section>
            <h2 className="font-serif text-lg font-semibold text-brand-navy">
              Editorial decisions
            </h2>
            <div className="mt-4 space-y-4">
              {submission.decisions.map((d) => (
                <div
                  key={d.id}
                  className="rounded-md border border-border p-5 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold capitalize text-brand-navy">
                      {d.decision.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Round {d.round} &middot; {formatDate(d.created_at)}
                    </span>
                  </div>
                  {d.decision_letter && (
                    <div className="mt-3 whitespace-pre-wrap rounded-md bg-muted p-4 leading-relaxed text-foreground/90">
                      {d.decision_letter}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Review comments (double-blind — reviewer identities not shown to author) */}
      {submission.reviews.length > 0 && (
        <>
          <hr className="my-8 border-border" />
          <section>
            <h2 className="font-serif text-lg font-semibold text-brand-navy">
              Reviewer comments
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              NIMASREPUB uses double-blind peer review. Reviewer identities
              are not disclosed.
            </p>
            <div className="mt-4 space-y-4">
              {submission.reviews.map((r, index) => (
                <div
                  key={r.id}
                  className="rounded-md border border-border p-5 text-sm"
                >
                  <p className="font-semibold text-brand-navy capitalize">
                    Reviewer {index + 1} &mdash;{" "}
                    {r.recommendation?.replace(/_/g, " ") ?? "Pending"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Round {r.round}
                  </p>
                  {r.comments_to_author && (
                    <div className="mt-3 whitespace-pre-wrap rounded-md bg-muted p-4 leading-relaxed text-foreground/90">
                      {r.comments_to_author}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* APC Payment */}
      {awaitingPayment && (
        <>
          <hr className="my-8 border-border" />
          <section className="rounded-md border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-serif text-lg font-semibold text-brand-navy">
              Article Processing Charge
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your manuscript has been accepted. To proceed to publication,
              please pay the Article Processing Charge (APC).
            </p>

            {payment?.status === "paid" ? (
              <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                Payment of{" "}
                <strong>{formatNaira(payment.amount_charged)}</strong>{" "}
                confirmed. Ref: {payment.paystack_reference ?? "—"}
              </div>
            ) : payment?.status === "waived" ? (
              <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                APC waived by the editorial office.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {apcRate ? (
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif text-3xl font-semibold text-brand-navy">
                      {formatNaira(apcRate.amount)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      one-time charge
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-amber-800">
                    APC amount not yet configured. Contact the editorial
                    office.
                  </p>
                )}

                {apcRate && (
                  <form action="/api/payments/initialize" method="post">
                    <input type="hidden" name="article_id" value={submission.id} />
                    <SubmitButton pendingText="Redirecting to payment...">
                      Pay {formatNaira(apcRate.amount)}
                    </SubmitButton>
                  </form>
                )}

                <p className="text-xs text-muted-foreground">
                  You will be redirected to our secure payment provider
                  (Paystack). Payment is processed in Nigerian Naira (NGN).
                  If you have been granted a waiver, no action is needed
                  here.
                </p>
              </div>
            )}
          </section>
        </>
      )}

      {/* Revision upload */}
      {canRevise && (
        <>
          <hr className="my-8 border-border" />
          <section>
            <h2 className="font-serif text-lg font-semibold text-brand-navy">
              Submit your revision
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload your revised manuscript and a response-to-reviewers
              document addressing each comment raised.
            </p>

            <form action={submitRevisionAction} className="mt-6 space-y-5">
              <input type="hidden" name="article_id" value={submission.id} />

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Revised manuscript <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  name="revised_manuscript"
                  accept=".pdf,.doc,.docx"
                  className="mt-1.5 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-brand-blue file:px-4 file:py-2 file:text-xs file:font-medium file:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Response to reviewers
                </label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  A document addressing each reviewer comment point-by-point.
                </p>
                <input
                  type="file"
                  name="response_to_reviewers"
                  accept=".pdf,.doc,.docx"
                  className="mt-1.5 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-muted file:px-4 file:py-2 file:text-xs file:font-medium"
                />
              </div>

              <SubmitButton pendingText="Submitting revision...">
                Submit revision
              </SubmitButton>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
