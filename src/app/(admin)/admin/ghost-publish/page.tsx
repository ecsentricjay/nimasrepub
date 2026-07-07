import type { Metadata } from "next";
import { getSections } from "@/lib/articles";
import { GhostPublishForm } from "./ghost-publish-form";

export const metadata: Metadata = { title: "Ghost Publish" };

export default async function GhostPublishPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const sections = await getSections();

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl font-semibold text-brand-navy">
        Ghost publish
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Create and publish an article on behalf of a client who has no
        NIMASREPUB account. Every ghost-published article is tagged{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          admin_proxy
        </code>{" "}
        in the audit log with your identity and timestamp.
      </p>

      <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Restricted action.</strong> Only Admin and Editor-in-Chief
        can use this feature. The client&apos;s APC payment should be
        recorded manually after publication via the editorial dashboard.
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-8">
        <GhostPublishForm sections={sections} />
      </div>
    </div>
  );
}
