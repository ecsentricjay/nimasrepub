"use client";

import { useState, useRef, useTransition } from "react";
import {
  uploadFinalPdfAction,
  assignToIssueAction,
  publishArticleAction,
  regeneratePublishedPdfAction,
} from "@/lib/editorial/publishing";

type Volume = { id: string; number: number; year: number };
type Issue = {
  id: string;
  volume_id: string;
  number: number;
  title: string | null;
  published_at: string | null;
};

type Props = {
  articleId: string;
  currentStatus: string;
  hasPdf: boolean;
  issueId: string | null;
  doi: string | null;
  doiStatus: string;
  pageStart: number | null;
  pageEnd: number | null;
  articleOrder: number | null;
  volumes: Volume[];
  issues: Issue[];
};

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";

export function PublishingPanel({
  articleId,
  currentStatus,
  hasPdf,
  issueId,
  doi,
  doiStatus,
  pageStart,
  pageEnd,
  articleOrder,
  volumes,
  issues,
}: Props) {
  const [newIssue, setNewIssue] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const isPublished = currentStatus === "published";

  // PDF upload
  function handlePdfSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;
    const fd = new FormData();
    fd.set("article_id", articleId);
    fd.set("final_pdf", selectedFile, selectedFile.name);
    startTransition(async () => {
      await uploadFinalPdfAction(fd);
    });
  }

  // Issue assignment
  function handleIssueSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await assignToIssueAction(fd);
    });
  }

  // Publish
  function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (
      !confirm(
        "Publish this article? It will immediately become publicly visible on the journal website."
      )
    )
      return;
    const fd = new FormData();
    fd.set("article_id", articleId);
    startTransition(async () => {
      await publishArticleAction(fd);
    });
  }

  function handleRegenerate(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("article_id", articleId);
    startTransition(async () => {
      await regeneratePublishedPdfAction(fd);
    });
  }

  return (
    <div className="space-y-8">
      {isPublished && (
        <div className="rounded-md border border-green-200 bg-green-50 p-5 text-sm text-green-800">
          <p className="font-semibold">This article is published.</p>
          <p className="mt-1 text-green-700">
            It is publicly visible and included in the sitemap for Google
            Scholar indexing. You can still update its volume/issue
            assignment and page numbers below if needed.
          </p>
        </div>
      )}

      {/* Step 1 — Final PDF */}
      {!isPublished && (
      <div>
        <div className="flex items-center gap-3">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              hasPdf
                ? "bg-brand-green text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {hasPdf ? "✓" : "1"}
          </span>
          <h3 className="font-serif font-semibold text-brand-navy">
            Upload final typeset PDF
          </h3>
        </div>

        {hasPdf && (
          <p className="ml-10 mt-1 text-xs text-brand-green">
            PDF uploaded. You can replace it by uploading again.
          </p>
        )}

        <form onSubmit={handlePdfSubmit} className="ml-10 mt-3 space-y-3">
          <div
            className="cursor-pointer rounded-md border-2 border-dashed border-border p-6 text-center transition-colors hover:border-brand-blue"
            onClick={() => fileRef.current?.click()}
          >
            {selectedFile ? (
              <p className="text-sm font-medium text-brand-navy">
                {selectedFile.name}{" "}
                <span className="font-normal text-muted-foreground">
                  ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Click to select the final PDF
              </p>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="submit"
            disabled={!selectedFile || isPending}
            className="rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-brand-navy"
          >
            {isPending ? "Uploading..." : "Upload PDF"}
          </button>
          <p className="text-xs text-muted-foreground">
            This PDF will be publicly accessible — no login required. Name
            the file clearly (e.g. <code>Smith-2026-hypertension.pdf</code>
            ) and ensure author/title metadata is embedded.
          </p>
        </form>
      </div>
      )}

      {/* Step 2 — Volume/Issue + DOI */}
      <div>
        <div className="flex items-center gap-3">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              issueId
                ? "bg-brand-green text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {issueId ? "✓" : "2"}
          </span>
          <h3 className="font-serif font-semibold text-brand-navy">
            Assign to volume & issue
          </h3>
        </div>

        <form onSubmit={handleIssueSubmit} className="ml-10 mt-3 space-y-4">
          <input type="hidden" name="article_id" value={articleId} />

          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="_mode"
                checked={!newIssue}
                onChange={() => setNewIssue(false)}
              />
              Existing issue
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="_mode"
                checked={newIssue}
                onChange={() => setNewIssue(true)}
              />
              Create new volume/issue
            </label>
          </div>

          {!newIssue ? (
            <div>
              <label className="text-sm font-medium text-foreground">
                Issue
              </label>
              <select
                name="issue_id"
                defaultValue={issueId ?? ""}
                className={`mt-1.5 ${inputCls}`}
              >
                <option value="">— Not assigned —</option>
                {volumes.map((v) => (
                  <optgroup
                    key={v.id}
                    label={`Vol. ${v.number} (${v.year})`}
                  >
                    {issues
                      .filter((i) => i.volume_id === v.id)
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          Issue {i.number}
                          {i.title ? ` — ${i.title}` : ""}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>
          ) : (
            <>
              <input type="hidden" name="issue_id" value="__new__" />
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Volume no.
                  </label>
                  <input
                    type="number"
                    name="new_volume_number"
                    min={1}
                    className={`mt-1.5 ${inputCls}`}
                    defaultValue={
                      volumes.length > 0
                        ? volumes[0].number + 1
                        : 1
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Year
                  </label>
                  <input
                    type="number"
                    name="new_volume_year"
                    className={`mt-1.5 ${inputCls}`}
                    defaultValue={new Date().getFullYear()}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Issue no.
                  </label>
                  <input
                    type="number"
                    name="new_issue_number"
                    min={1}
                    className={`mt-1.5 ${inputCls}`}
                    defaultValue={1}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Issue title{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <input
                  type="text"
                  name="new_issue_title"
                  placeholder="e.g. Inaugural Issue"
                  className={`mt-1.5 ${inputCls}`}
                />
              </div>
            </>
          )}

          {/* Page numbers */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-foreground">
                Start page
              </label>
              <input
                type="number"
                name="page_start"
                min={1}
                defaultValue={pageStart ?? ""}
                placeholder="e.g. 1"
                className={`mt-1.5 ${inputCls}`}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                End page
              </label>
              <input
                type="number"
                name="page_end"
                min={1}
                defaultValue={pageEnd ?? ""}
                placeholder="e.g. 15"
                className={`mt-1.5 ${inputCls}`}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Page numbers appear in citations and the issue table of contents.
          </p>

          <div>
            <label className="text-sm font-medium text-foreground">
              Article order in issue
            </label>
            <input
              type="number"
              name="article_order"
              min={1}
              defaultValue={articleOrder ?? ""}
              placeholder="e.g. 1 (first), 2 (second)..."
              className={`mt-1.5 ${inputCls}`}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">
              DOI{" "}
              <span className="font-normal text-muted-foreground">
                (optional — leave blank if not yet registered)
              </span>
            </label>
            <input
              type="text"
              name="doi"
              defaultValue={doi ?? ""}
              placeholder="10.XXXXX/nimasrepub.YYYY.NNNN"
              className={`mt-1.5 ${inputCls}`}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">
              DOI status
            </label>
            <select
              name="doi_status"
              defaultValue={doiStatus}
              className={`mt-1.5 ${inputCls}`}
            >
              <option value="none">No DOI yet</option>
              <option value="pending">Pending registration</option>
              <option value="registered">Registered</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Use pending while preparing Crossref/AJOL/DOAJ metadata, then
              switch to registered after the DOI resolves.
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-brand-navy"
          >
            {isPending ? "Saving..." : "Save assignment"}
          </button>
        </form>
      </div>

      {/* Step 3 — Publish */}
      {!isPublished && (
      <div>
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
            3
          </span>
          <h3 className="font-serif font-semibold text-brand-navy">
            Publish
          </h3>
        </div>

        <div className="ml-10 mt-3">
          {!hasPdf ? (
            <p className="text-sm text-muted-foreground">
              Upload the final PDF (step 1) before publishing.
            </p>
          ) : (
            <form onSubmit={handlePublish} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Publishing will make the article publicly visible, add it to
                the sitemap for Google Scholar indexing, and email the
                corresponding author.
              </p>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-brand-green px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 hover:bg-brand-navy"
              >
                {isPending ? "Publishing..." : "Publish article"}
              </button>
            </form>
          )}
        </div>
      </div>
      )}

      <div>
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
            PDF
          </span>
          <h3 className="font-serif font-semibold text-brand-navy">
            Regenerate or restamp PDF
          </h3>
        </div>
        <form onSubmit={handleRegenerate} className="ml-10 mt-3 space-y-3">
          <p className="text-sm text-muted-foreground">
            Rebuilds journal branding, page numbers, DOI, article URL, volume,
            issue, and publication month on the current PDF. If no PDF exists,
            a metadata-based PDF is generated.
          </p>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-brand-navy disabled:opacity-50 hover:border-brand-blue"
          >
            {isPending ? "Regenerating..." : "Regenerate/restamp PDF"}
          </button>
        </form>
      </div>
    </div>
  );
}
