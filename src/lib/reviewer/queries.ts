import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "@/lib/supabase/types";
import { getSignedManuscriptUrl } from "@/lib/storage";

type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];
type SectionRow = Database["public"]["Tables"]["sections"]["Row"];
type AuthorRow = Database["public"]["Tables"]["article_authors"]["Row"];
type FileRow = Database["public"]["Tables"]["manuscript_files"]["Row"];
type InvitationRow = Database["public"]["Tables"]["review_invitations"]["Row"];
type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];

export type ReviewerInvitation = InvitationRow & {
  article: (ArticleRow & {
    section: SectionRow | null;
    authors: AuthorRow[];
  }) | null;
};

export type ReviewerArticleDetail = ArticleRow & {
  section: SectionRow | null;
  authors: AuthorRow[];
  files: (FileRow & { signed_url: string })[];
  invitation: InvitationRow | null;
  myReview: ReviewRow | null;
};

export async function getMyInvitations(
  userId: string
): Promise<ReviewerInvitation[]> {
  const db = createServiceRoleClient();

  const { data: invitations } = await db
    .from("review_invitations")
    .select("*")
    .eq("reviewer_id", userId)
    .order("invited_at", { ascending: false });

  if (!invitations || invitations.length === 0) return [];

  const articleIds = invitations.map((i) => i.article_id);

  const { data: articles } = await db
    .from("articles")
    .select("*")
    .in("id", articleIds);

  if (!articles) return invitations.map((i) => ({ ...i, article: null }));

  const sectionIds = [...new Set(articles.map((a) => a.section_id))];
  const [{ data: sections }, { data: authors }] = await Promise.all([
    db.from("sections").select("*").in("id", sectionIds),
    db
      .from("article_authors")
      .select("*")
      .in("article_id", articleIds)
      .order("author_order"),
  ]);

  return invitations.map((inv) => {
    const article = articles.find((a) => a.id === inv.article_id) ?? null;
    return {
      ...inv,
      article: article
        ? {
            ...article,
            section:
              sections?.find((s) => s.id === article.section_id) ?? null,
            authors:
              authors?.filter((au) => au.article_id === article.id) ?? [],
          }
        : null,
    };
  });
}

export async function getReviewerArticleDetail(
  articleId: string,
  userId: string
): Promise<ReviewerArticleDetail | null> {
  const db = createServiceRoleClient();

  // Verify the reviewer has an invitation for this article
  const { data: invitation } = await db
    .from("review_invitations")
    .select("*")
    .eq("article_id", articleId)
    .eq("reviewer_id", userId)
    .maybeSingle();

  if (!invitation) return null;

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
    { data: myReview },
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
      .in("file_type", ["original_submission", "revision"])
      .order("created_at", { ascending: false }),
    db
      .from("reviews")
      .select("*")
      .eq("article_id", articleId)
      .eq("reviewer_id", userId)
      .maybeSingle(),
  ]);

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
    invitation,
    myReview: myReview ?? null,
  };
}
