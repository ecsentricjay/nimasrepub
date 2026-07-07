import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type IssueRow = Database["public"]["Tables"]["issues"]["Row"];
type VolumeRow = Database["public"]["Tables"]["volumes"]["Row"];
type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];
type SectionRow = Database["public"]["Tables"]["sections"]["Row"];
type AuthorRow = Database["public"]["Tables"]["article_authors"]["Row"];

export type IssueArticle = ArticleRow & {
  section: SectionRow | null;
  authors: AuthorRow[];
};

export type IssueDetail = IssueRow & {
  volume: VolumeRow | null;
  articles: IssueArticle[];
};

export async function getIssueDetail(
  issueId: string
): Promise<IssueDetail | null> {
  const supabase = await createClient();

  const { data: issue } = await supabase
    .from("issues")
    .select("*")
    .eq("id", issueId)
    .maybeSingle();

  if (!issue) return null;

  const { data: volume } = await supabase
    .from("volumes")
    .select("*")
    .eq("id", issue.volume_id)
    .maybeSingle();

  const { data: orderedArticles, error: orderedArticlesError } = await supabase
    .from("articles")
    .select("*")
    .eq("issue_id", issueId)
    .eq("status", "published")
    .order("article_order", { ascending: true, nullsFirst: false });

  const shouldFallbackOrder =
    orderedArticlesError?.code === "42703" ||
    orderedArticlesError?.message?.includes("article_order");

  const { data: fallbackArticles } = shouldFallbackOrder
    ? await supabase
        .from("articles")
        .select("*")
        .eq("issue_id", issueId)
        .eq("status", "published")
        .order("published_at", { ascending: false })
    : { data: null };

  const articles = shouldFallbackOrder ? fallbackArticles : orderedArticles;

  if (!articles || articles.length === 0) {
    return { ...issue, volume: volume ?? null, articles: [] };
  }

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

  const issueArticles: IssueArticle[] = articles.map((a) => ({
    ...a,
    section: sections?.find((s) => s.id === a.section_id) ?? null,
    authors: authors?.filter((au) => au.article_id === a.id) ?? [],
  }));

  return { ...issue, volume: volume ?? null, articles: issueArticles };
}

export async function getAllIssues() {
  const supabase = await createClient();

  const { data: issues } = await supabase
    .from("issues")
    .select("*")
    .order("published_at", { ascending: false });

  if (!issues || issues.length === 0) return [];

  const volumeIds = [...new Set(issues.map((i) => i.volume_id))];
  const { data: volumes } = await supabase
    .from("volumes")
    .select("*")
    .in("id", volumeIds);

  return issues.map((i) => ({
    ...i,
    volume: volumes?.find((v) => v.id === i.volume_id) ?? null,
  }));
}
