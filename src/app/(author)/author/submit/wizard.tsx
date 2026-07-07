"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSubmissionAction } from "@/lib/author/actions";
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

const STEPS = ["Manuscript details", "Authors", "Files", "Review & submit"];

function StepIndicator({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <nav aria-label="Submission steps" className="mb-10">
      <ol className="flex items-center gap-0">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    done
                      ? "bg-brand-green text-white"
                      : active
                      ? "bg-brand-blue text-white"
                      : "border-2 border-border bg-background text-muted-foreground"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span
                  className={`mt-1 hidden text-xs sm:block ${
                    active ? "font-semibold text-brand-navy" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`mx-2 h-px flex-1 transition-colors ${
                    done ? "bg-brand-green" : "bg-border"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";

export function SubmissionWizard({ sections }: { sections: Section[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Clear any ?error= left in the URL from a previous failed attempt.
  // Without this, the error banner from the page component stays visible
  // across all steps, making it look like each step caused the error.
  useEffect(() => {
    router.replace("/author/submit");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 1 state
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? "");
  const [keywords, setKeywords] = useState("");

  // Step 2 state
  const [authors, setAuthors] = useState<AuthorEntry[]>([
    { ...blankAuthor(), is_corresponding: true },
  ]);

  // Step 3 state
  const [manuscript, setManuscript] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState<File | null>(null);
  const manuscriptRef = useRef<HTMLInputElement>(null);
  const clRef = useRef<HTMLInputElement>(null);

  // Step-level validation errors
  const [errors, setErrors] = useState<string[]>([]);

  // useTransition lets us call the server action programmatically while
  // keeping the pending state for the submit button.
  // This is the ONLY correct way to pass File objects (from React state)
  // to a server action — native form submission can only include inputs
  // that exist in the DOM at submit time, which excludes file inputs from
  // earlier steps that are no longer rendered.
  const [isPending, startTransition] = useTransition();

  function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep()) return;

    const formData = new FormData();
    formData.set("title", title);
    formData.set("abstract", abstract);
    formData.set("section_id", sectionId);
    formData.set("keywords", keywords);
    formData.set("authors_json", JSON.stringify(authors));
    if (manuscript) formData.set("manuscript", manuscript, manuscript.name);
    if (coverLetter) formData.set("cover_letter", coverLetter, coverLetter.name);

    startTransition(async () => {
      await createSubmissionAction(formData);
    });
  }

  function addAuthor() {
    setAuthors((prev) => [...prev, blankAuthor()]);
  }

  function removeAuthor(i: number) {
    setAuthors((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateAuthor(i: number, field: keyof AuthorEntry, value: string | boolean) {
    setAuthors((prev) =>
      prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a))
    );
  }

  function setCorresponding(i: number) {
    setAuthors((prev) =>
      prev.map((a, idx) => ({ ...a, is_corresponding: idx === i }))
    );
  }

  function validateStep(): boolean {
    const errs: string[] = [];

    if (step === 0) {
      if (!title.trim()) errs.push("Title is required");
      if (!abstract.trim()) errs.push("Abstract is required");
      if (abstract.trim().split(/\s+/).length < 50)
        errs.push("Abstract should be at least 50 words");
      if (!sectionId) errs.push("Please select a section");
    }

    if (step === 1) {
      if (authors.length === 0) errs.push("At least one author is required");
      authors.forEach((a, i) => {
        if (!a.display_name.trim())
          errs.push(`Author ${i + 1}: name is required`);
      });
      if (!authors.some((a) => a.is_corresponding))
        errs.push("Please mark one author as corresponding");
    }

    if (step === 2) {
      if (!manuscript) errs.push("Please upload the manuscript file");
      else if (manuscript.size > 50 * 1024 * 1024)
        errs.push("Manuscript must be under 50 MB");
    }

    setErrors(errs);
    return errs.length === 0;
  }

  function nextStep() {
    if (validateStep()) setStep((s) => s + 1);
  }

  function prevStep() {
    setErrors([]);
    setStep((s) => s - 1);
  }

  const wordCount = abstract.trim().split(/\s+/).filter(Boolean).length;

  return (
    <form onSubmit={handleFinalSubmit}>
      <StepIndicator steps={STEPS} current={step} />

      {/* Validation errors */}
      {errors.length > 0 && (
        <ul className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-1">
          {errors.map((e) => (
            <li key={e}>&bull; {e}</li>
          ))}
        </ul>
      )}

      {/* ── Step 0: Article metadata ──────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-5">
          <Field label="Title" required>
            <input
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Full title of your manuscript"
            />
          </Field>

          <Field
            label="Abstract"
            required
            hint={`${wordCount} words — aim for 150–300`}
          >
            <textarea
              className={`${inputCls} min-h-[180px] resize-y`}
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="Structured or unstructured abstract..."
            />
          </Field>

          <Field label="Section" required>
            <select
              className={inputCls}
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Keywords"
            hint="Comma-separated, e.g. malaria, public health, Nigeria"
          >
            <input
              className={inputCls}
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="keyword1, keyword2, keyword3"
            />
          </Field>
        </div>
      )}

      {/* ── Step 1: Authors ────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          {authors.map((author, i) => (
            <div
              key={i}
              className="rounded-md border border-border p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-brand-navy">
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

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" required>
                  <input
                    className={inputCls}
                    value={author.display_name}
                    onChange={(e) =>
                      updateAuthor(i, "display_name", e.target.value)
                    }
                    placeholder="Dr. Jane Smith"
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    className={inputCls}
                    value={author.email}
                    onChange={(e) => updateAuthor(i, "email", e.target.value)}
                  />
                </Field>
                <Field label="Affiliation">
                  <input
                    className={inputCls}
                    value={author.affiliation}
                    onChange={(e) =>
                      updateAuthor(i, "affiliation", e.target.value)
                    }
                    placeholder="University / Hospital"
                  />
                </Field>
                <Field label="ORCID" hint="Optional, e.g. 0000-0001-2345-6789">
                  <input
                    className={inputCls}
                    value={author.orcid}
                    onChange={(e) => updateAuthor(i, "orcid", e.target.value)}
                  />
                </Field>
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
            className="w-full rounded-md border border-dashed border-brand-blue py-3 text-sm font-medium text-brand-blue hover:bg-brand-blue/5"
          >
            + Add another author
          </button>
        </div>
      )}

      {/* ── Step 2: Files ──────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          <Field
            label="Manuscript"
            required
            hint="PDF, Word, or similar — max 50 MB"
          >
            <div
              className="cursor-pointer rounded-md border-2 border-dashed border-border p-8 text-center transition-colors hover:border-brand-blue"
              onClick={() => manuscriptRef.current?.click()}
            >
              {manuscript ? (
                <p className="text-sm font-medium text-brand-navy">
                  {manuscript.name}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({(manuscript.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Click to select your manuscript file
                </p>
              )}
            </div>
            <input
              ref={manuscriptRef}
              type="file"
              name="manuscript"
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setManuscript(e.target.files?.[0] ?? null)}
            />
          </Field>

          <Field
            label="Cover letter"
            hint="Optional — PDF or Word"
          >
            <div
              className="cursor-pointer rounded-md border-2 border-dashed border-border p-8 text-center transition-colors hover:border-brand-blue"
              onClick={() => clRef.current?.click()}
            >
              {coverLetter ? (
                <p className="text-sm font-medium text-brand-navy">
                  {coverLetter.name}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Click to select a cover letter (optional)
                </p>
              )}
            </div>
            <input
              ref={clRef}
              type="file"
              name="cover_letter"
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setCoverLetter(e.target.files?.[0] ?? null)}
            />
          </Field>
        </div>
      )}

      {/* ── Step 3: Review & submit ────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="rounded-md bg-muted p-5 space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Title
              </p>
              <p className="mt-1 font-medium text-brand-navy">{title}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Section
              </p>
              <p className="mt-1">
                {sections.find((s) => s.id === sectionId)?.name ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Abstract
              </p>
              <p className="mt-1 line-clamp-4 leading-relaxed text-foreground/80">
                {abstract}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Authors
              </p>
              <ul className="mt-1 space-y-1">
                {authors.map((a, i) => (
                  <li key={i}>
                    {a.display_name}
                    {a.affiliation ? ` — ${a.affiliation}` : ""}
                    {a.is_corresponding ? (
                      <span className="ml-2 text-xs text-brand-blue">
                        (corresponding)
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Files
              </p>
              <p className="mt-1">
                {manuscript?.name ?? "—"}{" "}
                {coverLetter ? `+ ${coverLetter.name}` : ""}
              </p>
            </div>
          </div>

          {/* Hidden fields consumed by the Server Action */}
          {/* NOTE: these are intentionally removed — FormData is built
              manually in handleFinalSubmit() from React state, which is
              the only way to correctly include File objects from earlier
              steps that are no longer rendered in the DOM. */}

          <p className="text-xs text-muted-foreground">
            By submitting, you confirm this work is original, has not been
            published elsewhere, and you have the authority to submit on
            behalf of all listed authors.
          </p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={prevStep}
          disabled={step === 0 || isPending}
          className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground disabled:opacity-40 hover:border-brand-blue"
        >
          Back
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={nextStep}
            className="rounded-md bg-brand-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-navy"
          >
            Next step
          </button>
        ) : (
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-brand-green px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-navy disabled:opacity-70"
          >
            {isPending ? "Submitting..." : "Submit manuscript"}
          </button>
        )}
      </div>
    </form>
  );
}
