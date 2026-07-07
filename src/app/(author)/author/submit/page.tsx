import type { Metadata } from "next";
import { getSections } from "@/lib/articles";
import { SubmissionWizard } from "./wizard";

export const metadata: Metadata = { title: "Submit Manuscript" };

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const sections = await getSections();

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl font-semibold text-brand-navy">
        Submit a manuscript
      </h1>
      <p className="mt-2 text-muted-foreground">
        Complete all four steps to submit your work for peer review.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="mt-8">
        <SubmissionWizard sections={sections} />
      </div>
    </div>
  );
}
