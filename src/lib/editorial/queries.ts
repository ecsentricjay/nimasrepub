import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "@/lib/supabase/types";
import { getSignedManuscriptUrl } from "@/lib/storage";

type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];
type SectionRow = Database["public"]["Tables"]["sections"]["Row"];
type AuthorRow = Database["public"]["Tables"]["article_authors"]["Row"];
type FileRow = Database["public"]["Tables"]["manuscript_files"]["Row"];
type DecisionRow = Database["public"]["Tables"]["editorial_decisions"]["Row"];
type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type InvitationRow = Database["public"]["Tables"]["review_invitations"]["Row"];

export type QueueItem = ArticleRow & {
  section: SectionRow | null;
  authors: AuthorRow[];
};

export type EditorialSubmissionDetail = ArticleRow & {
  section: SectionRow | null;
  authors: AuthorRow[];
  files: (FileRow & { signed_url: string })[];
  decisions: DecisionRow[];
  reviews: (ReviewRow & { reviewer: ProfileRow | null })[];
  invitations: (InvitationRow & { reviewer: ProfileRow | null })[];
};

const ACTIVE_STATUSES = [
  "submitted",
  "under_review",
  "revisions_requested",
  "accepted",
  "awaiting_payment",
  "in_production",
] as const;

export async function getSubmissionQueue(): Promise<QueueItem[]> {
  const db = createServiceRoleClient();

  const { data: articles } = await db
    .from("articles")
    .select("*")
    .in("status", ACTIVE_STATUSES)
    .order("submitted_at", { ascending: true });

  if (!articles || articles.length === 0) return [];

  const ids = articles.map((a) => a.id);
  const sectionIds = [...new Set(articles.map((a) => a.section_id))];

  const [{ data: sections }, { data: authors }] = await Promise.all([
    db.from("sections").select("*").in("id", sectionIds),
    db
      .from("article_authors")
      .select("*")
      .in("article_id", ids)
      .order("author_order"),
  ]);

  return articles.map((a) => ({
    ...a,
    section: sections?.find((s) => s.id === a.section_id) ?? null,
    authors: authors?.filter((au) => au.article_id === a.id) ?? [],
  }));
}

export async function getEditorialSubmissionDetail(
  articleId: string
): Promise<EditorialSubmissionDetail | null> {
  const db = createServiceRoleClient();

  const { data: article } = await db
    .from("articles")
    .select("*")
    .eq("id", articleId)
    .maybeSingle();

  if (!article) return null;

  const [
    { data: section },
    { data: authors },
    { data: files },
    { data: decisions },
    { data: reviews },
    { data: invitations },
  ] = await Promise.all([
    db.from("sections").select("*").eq("id", article.section_id).maybeSingle(),
    db
      .from("article_authors")
      .select("*")
      .eq("article_id", articleId)
      .order("author_order"),
    db
      .from("manuscript_files")
      .select("*")
      .eq("article_id", articleId)
      .order("created_at", { ascending: false }),
    db
      .from("editorial_decisions")
      .select("*")
      .eq("article_id", articleId)
      .order("created_at", { ascending: false }),
    db
      .from("reviews")
      .select("*")
      .eq("article_id", articleId)
      .order("created_at", { ascending: false }),
    db
      .from("review_invitations")
      .select("*")
      .eq("article_id", articleId)
      .order("invited_at", { ascending: false }),
  ]);

  // Attach reviewer profiles to reviews and invitations
  const reviewerIds = [
    ...(reviews?.map((r) => r.reviewer_id) ?? []),
    ...(invitations?.map((i) => i.reviewer_id) ?? []),
  ];
  const uniqueReviewerIds = [...new Set(reviewerIds)];

  const { data: reviewerProfiles } =
    uniqueReviewerIds.length > 0
      ? await db
          .from("profiles")
          .select("*")
          .in("id", uniqueReviewerIds)
      : { data: [] };

  const profileMap = Object.fromEntries(
    (reviewerProfiles ?? []).map((p) => [p.id, p])
  );

  // Signed URLs for files
  const filesWithUrls = await Promise.all(
    (files ?? []).map(async (f) => {
      try {
        const signed_url = await getSignedManuscriptUrl(f.file_path);
        return { ...f, signed_url };
      } catch {
        return { ...f, signed_url: "" };
      }
    })
  );

  return {
    ...article,
    section: section ?? null,
    authors: authors ?? [],
    files: filesWithUrls,
    decisions: decisions ?? [],
    reviews: (reviews ?? []).map((r) => ({
      ...r,
      reviewer: profileMap[r.reviewer_id] ?? null,
    })),
    invitations: (invitations ?? []).map((i) => ({
      ...i,
      reviewer: profileMap[i.reviewer_id] ?? null,
    })),
  };
}

export async function searchReviewers(query: string): Promise<ProfileRow[]> {
  const db = createServiceRoleClient();
  const { data } = await db
    .from("profiles")
    .select("*")
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .eq("is_active", true)
    .limit(10);
  return data ?? [];
}
