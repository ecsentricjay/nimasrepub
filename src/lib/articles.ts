import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];
type SectionRow = Database["public"]["Tables"]["sections"]["Row"];
type AuthorRow = Database["public"]["Tables"]["article_authors"]["Row"];

export type ArticleWithRelations = ArticleRow & {
  section: SectionRow | null;
  authors: AuthorRow[];
};

/**
 * Attaches section + author data to a batch of articles via separate
 * queries rather than a PostgREST embedded select. Once you've run
 * `supabase gen types` against the real project (which produces
 * accurate `Relationships` metadata), this can be simplified to a
 * single `.select("*, sections(*), article_authors(*)")` call — but
 * this approach is correct and fully type-safe regardless.
 */
async function attachRelations(articles: ArticleRow[]): Promise<ArticleWithRelations[]> {
  if (articles.length === 0) return [];
  const supabase = await createClient();

  const sectionIds = [...new Set(articles.map((a) => a.section_id))];
  const articleIds = articles.map((a) => a.id);

  const [{ data: sections }, { data: authors }] = await Promise.all([
    supabase.from("sections").select("*").in("id", sectionIds),
    supabase
      .from("article_authors")
      .select("*")
      .in("article_id", articleIds)
      .order("author_order", { ascending: true }),
  ]);

  return articles.map((a) => ({
    ...a,
    section: sections?.find((s) => s.id === a.section_id) ?? null,
    authors: authors?.filter((au) => au.article_id === a.id) ?? [],
  }));
}

export async function getPublishedArticles(opts?: {
  sectionSlug?: string;
  limit?: number;
}): Promise<ArticleWithRelations[]> {
  const supabase = await createClient();

  let sectionId: string | undefined;
  if (opts?.sectionSlug) {
    const { data: section } = await supabase
      .from("sections")
      .select("id")
      .eq("slug", opts.sectionSlug)
      .maybeSingle();
    if (!section) return [];
    sectionId = section.id;
  }

  let query = supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (sectionId) query = query.eq("section_id", sectionId);
  if (opts?.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error || !data) return [];

  return attachRelations(data);
}

export async function getArticleBySlug(
  slug: string
): Promise<ArticleWithRelations | null> {
  const supabase = await createClient();

  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!article) return null;

  const [withRelations] = await attachRelations([article]);
  return withRelations;
}

export async function getSections(): Promise<SectionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("sections").select("*").order("name");
  return data ?? [];
}

export async function getSectionBySlug(slug: string): Promise<SectionRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sections")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

/** Lightweight — only what sitemap.ts needs, not full article rows. */
export async function getPublishedArticleSlugsForSitemap(): Promise<
  { slug: string; published_at: string | null }[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("slug, published_at")
    .eq("status", "published");
  return data ?? [];
}

export function getPublicPdfUrl(pdfPath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/published-pdfs/${pdfPath}`;
}

export function formatAuthorList(authors: AuthorRow[]): string {
  return authors.map((a) => a.display_name).join(", ");
}
