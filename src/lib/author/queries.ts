import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { getSignedManuscriptUrl } from "@/lib/storage";

type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];
type AuthorRow = Database["public"]["Tables"]["article_authors"]["Row"];
type FileRow = Database["public"]["Tables"]["manuscript_files"]["Row"];
type DecisionRow = Database["public"]["Tables"]["editorial_decisions"]["Row"];
type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
type SectionRow = Database["public"]["Tables"]["sections"]["Row"];

export type SubmissionListItem = ArticleRow & {
  section: SectionRow | null;
  authors: AuthorRow[];
};

export type SubmissionDetail = ArticleRow & {
  section: SectionRow | null;
  authors: AuthorRow[];
  files: (FileRow & { signed_url: string })[];
  decisions: DecisionRow[];
  reviews: ReviewRow[];
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  revisions_requested: "Revisions requested",
  accepted: "Accepted",
  awaiting_payment: "Awaiting payment",
  in_production: "In production",
  published: "Published",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-50 text-blue-700 border border-blue-200",
  under_review: "bg-amber-50 text-amber-700 border border-amber-200",
  revisions_requested: "bg-orange-50 text-orange-700 border border-orange-200",
  accepted: "bg-green-50 text-green-700 border border-green-200",
  awaiting_payment: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  in_production: "bg-teal-50 text-teal-700 border border-teal-200",
  published: "bg-brand-green/10 text-brand-green border border-brand-green/30",
  rejected: "bg-red-50 text-red-700 border border-red-200",
  withdrawn: "bg-muted text-muted-foreground",
};

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

export function statusColor(status: string) {
  return STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";
}

export async function getMySubmissions(
  userId: string
): Promise<SubmissionListItem[]> {
  const supabase = await createClient();

  // Get all articles this user is an author of
  const { data: authorships } = await supabase
    .from("article_authors")
    .select("article_id")
    .eq("user_id", userId);

  if (!authorships || authorships.length === 0) return [];

  const articleIds = authorships.map((a) => a.article_id);

  const { data: articles } = await supabase
    .from("articles")
    .select("*")
    .in("id", articleIds)
    .order("created_at", { ascending: false });

  if (!articles || articles.length === 0) return [];

  const sectionIds = [...new Set(articles.map((a) => a.section_id))];
  const [{ data: sections }, { data: allAuthors }] = await Promise.all([
    supabase.from("sections").select("*").in("id", sectionIds),
    supabase
      .from("article_authors")
      .select("*")
      .in("article_id", articleIds)
      .order("author_order"),
  ]);

  return articles.map((a) => ({
    ...a,
    section: sections?.find((s) => s.id === a.section_id) ?? null,
    authors: allAuthors?.filter((au) => au.article_id === a.id) ?? [],
  }));
}

export async function getSubmissionDetail(
  articleId: string,
  userId: string
): Promise<SubmissionDetail | null> {
  const supabase = await createClient();

  // Confirm the user is an author of this article
  const { data: authorship } = await supabase
    .from("article_authors")
    .select("id")
    .eq("article_id", articleId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!authorship) return null;

  const { data: article } = await supabase
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
  ] = await Promise.all([
    supabase.from("sections").select("*").eq("id", article.section_id).maybeSingle(),
    supabase
      .from("article_authors")
      .select("*")
      .eq("article_id", articleId)
      .order("author_order"),
    supabase
      .from("manuscript_files")
      .select("*")
      .eq("article_id", articleId)
      .order("created_at", { ascending: false }),
    supabase
      .from("editorial_decisions")
      .select("*")
      .eq("article_id", articleId)
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("*")
      .eq("article_id", articleId)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false }),
  ]);

  // Generate signed URLs for files
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
    reviews: reviews ?? [],
  };
}
