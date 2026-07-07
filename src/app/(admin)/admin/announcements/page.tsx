import type { Metadata } from "next";
import { getAllAnnouncements } from "@/lib/admin/queries";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
} from "@/lib/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { DeleteAnnouncementButton } from "@/components/delete-announcement-button";

export const metadata: Metadata = { title: "Announcements" };

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    created?: string;
    updated?: string;
    deleted?: string;
  }>;
}) {
  const { error, created, updated, deleted } = await searchParams;
  const announcements = await getAllAnnouncements();

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-3xl font-semibold text-brand-navy">
        Announcements
      </h1>
      <p className="mt-1 text-muted-foreground">
        Published announcements appear on the journal homepage.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {(created || updated || deleted) && (
        <p className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {created && "Announcement created."}
          {updated && "Announcement updated."}
          {deleted && "Announcement deleted."}
        </p>
      )}

      {/* Create form */}
      <div className="mt-8 rounded-md border border-border p-6">
        <h2 className="font-serif text-lg font-semibold text-brand-navy">
          New announcement
        </h2>
        <form action={createAnnouncementAction} className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              required
              className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-blue"
              placeholder="e.g. Call for papers — Vol. 2, Issue 1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              Body <span className="text-red-500">*</span>
            </label>
            <textarea
              name="body"
              required
              rows={5}
              className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-blue"
              placeholder="Announcement content..."
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" name="publish_now" defaultChecked />
            Publish immediately
          </label>
          <SubmitButton pendingText="Creating...">
            Create announcement
          </SubmitButton>
        </form>
      </div>

      {/* Existing announcements */}
      {announcements.length > 0 && (
        <div className="mt-10 space-y-4">
          <h2 className="font-serif text-lg font-semibold text-brand-navy">
            All announcements
          </h2>
          {announcements.map((a) => (
            <div
              key={a.id}
              className="rounded-md border border-border p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-serif font-semibold text-brand-navy">
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.published_at
                      ? `Published ${formatDate(a.published_at)}`
                      : "Draft — not yet published"}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-foreground/80">
                    {a.body}
                  </p>
                </div>
                <div className="shrink-0">
                  {a.published_at ? (
                    <span className="rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-xs text-green-700">
                      Live
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      Draft
                    </span>
                  )}
                </div>
              </div>

              <form action={deleteAnnouncementAction} className="mt-4">
                <input type="hidden" name="id" value={a.id} />
                <DeleteAnnouncementButton />
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
