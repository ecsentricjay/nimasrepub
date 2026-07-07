"use client";

import { useState, useTransition } from "react";
import { ghostPublishAction } from "@/lib/admin/actions";
import type { Database } from "@/lib/supabase/types";

type Section = Database["public"]["Tables"]["sections"]["Row"];

type AuthorEntry = {
  display_name: string;
  email: string;
  affiliation: string;
  orcid: string;
  is_corresponding: boolean;
};

const blankAuthor = (): AuthorEntry => ({
  display_name: "",
  email: "",
  affiliation: "",
  orcid: "",
  is_corresponding: false,
});

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";

export function GhostPublishForm({ sections }: { sections: Section[] }) {
  const [authors, setAuthors] = useState<AuthorEntry[]>([
    { ...blankAuthor(), is_corresponding: true },
  ]);
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);

  function addAuthor() {
    setAuthors((prev) => [...prev, blankAuthor()]);
  }

  function removeAuthor(i: number) {
    setAuthors((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateAuthor(
    i: number,
    field: keyof AuthorEntry,
    value: string | boolean
  ) {
    setAuthors((prev) =>
      prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a))
    );
  }

  function setCorresponding(i: number) {
    setAuthors((prev) =>
      prev.map((a, idx) => ({ ...a, is_corresponding: idx === i }))
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs: string[] = [];
    const fd = new FormData(e.currentTarget);

    if (!String(fd.get("title") ?? "").trim()) errs.push("Title is required");
    if (!String(fd.get("abstract") ?? "").trim())
      errs.push("Abstract is required");
    if (authors.length === 0) errs.push("At least one author is required");
    authors.forEach((a, i) => {
      if (!a.display_name.trim())
        errs.push(`Author ${i + 1}: name is required`);
    });

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);

    fd.set("authors_json", JSON.stringify(authors));

    startTransition(async () => {
      await ghostPublishAction(fd);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.length > 0 && (
        <ul className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-1">
          {errors.map((e) => (
            <li key={e}>&bull; {e}</li>
          ))}
        </ul>
      )}

      {/* Article metadata */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            required
            className={`mt-1.5 ${inputCls}`}
            placeholder="Full article title"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">
            Abstract <span className="text-red-500">*</span>
          </label>
          <textarea
            name="abstract"
            required
            rows={6}
            className={`mt-1.5 ${inputCls}`}
            placeholder="Article abstract..."
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">
            Manuscript body{" "}
            <span className="font-normal text-muted-foreground">
              (used when no final PDF is uploaded)
            </span>
          </label>
          <textarea
            name="manuscript_body"
            rows={14}
            className={`mt-1.5 ${inputCls}`}
            placeholder={"Introduction\n\nMethods\n\nResults\n\nDiscussion\n\nConclusion\n\nReferences"}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Use simple headings like Introduction, Methods, Results, Discussion,
            Conclusion, and References. If you upload a final PDF, the uploaded
            file is used instead.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-foreground">
              Section <span className="text-red-500">*</span>
            </label>
            <select name="section_id" className={`mt-1.5 ${inputCls}`}>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              Keywords
            </label>
            <input
              type="text"
              name="keywords"
              className={`mt-1.5 ${inputCls}`}
              placeholder="keyword1, keyword2"
            />
          </div>
        </div>
      </div>

      {/* Authors */}
      <div>
        <p className="text-sm font-semibold text-brand-navy">Authors</p>
        <div className="mt-3 space-y-4">
          {authors.map((author, i) => (
            <div
              key={i}
              className="rounded-md border border-border p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Author {i + 1}
                </p>
                {authors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAuthor(i)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-foreground">
                    Full name *
                  </label>
                  <input
                    className={`mt-1 ${inputCls}`}
                    value={author.display_name}
                    onChange={(e) =>
                      updateAuthor(i, "display_name", e.target.value)
                    }
                    placeholder="Dr. Jane Smith"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">
                    Email
                  </label>
                  <input
                    type="email"
                    className={`mt-1 ${inputCls}`}
                    value={author.email}
                    onChange={(e) => updateAuthor(i, "email", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">
                    Affiliation
                  </label>
                  <input
                    className={`mt-1 ${inputCls}`}
                    value={author.affiliation}
                    onChange={(e) =>
                      updateAuthor(i, "affiliation", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">
                    ORCID
                  </label>
                  <input
                    className={`mt-1 ${inputCls}`}
                    value={author.orcid}
                    onChange={(e) => updateAuthor(i, "orcid", e.target.value)}
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="corresponding"
                  checked={author.is_corresponding}
                  onChange={() => setCorresponding(i)}
                />
                Corresponding author
              </label>
            </div>
          ))}

          <button
            type="button"
            onClick={addAuthor}
            className="w-full rounded-md border border-dashed border-brand-blue py-2.5 text-sm font-medium text-brand-blue hover:bg-brand-blue/5"
          >
            + Add author
          </button>
        </div>
      </div>

      {/* Final PDF */}
      <div className="rounded-md border border-border p-4">
        <p className="text-sm font-semibold text-brand-navy">Final PDF</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Optional. If uploaded, the PDF will be branded with the journal
          title, logo, metadata, and page numbers before publication.
        </p>
        <input
          type="file"
          name="final_pdf"
          accept=".pdf"
          className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-brand-navy file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
        />
      </div>

      {/* Routing option */}
      <div className="rounded-md border border-border p-4">
        <p className="text-sm font-semibold text-brand-navy">
          Review routing
        </p>
        <div className="mt-3 space-y-2 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" name="skip_review" />
            Skip peer review — move directly to &ldquo;Accepted&rdquo;
          </label>
          <p className="ml-5 text-xs text-muted-foreground">
            Leave unchecked to route through the normal editorial workflow.
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-brand-green px-5 py-3 text-sm font-medium text-white disabled:opacity-60 hover:bg-brand-navy"
      >
        {isPending
          ? "Creating article..."
          : "Create ghost-published article"}
      </button>
    </form>
  );
}
