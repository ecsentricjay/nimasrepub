import type { MetadataRoute } from "next";
import { getPublishedArticleSlugsForSitemap, getSections } from "@/lib/articles";
import { policyPages } from "@/lib/content/policies";
import { getAllIssues } from "@/lib/issues/queries";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimasrepub.com.ng";

// Every published article must appear here or it's unlikely Google
// Scholar's crawler ever discovers it — this is the file the entire
// indexing goal depends on.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, sections, issues] = await Promise.all([
    getPublishedArticleSlugsForSitemap(),
    getSections(),
    getAllIssues(),
  ]);

  const issueEntries: MetadataRoute.Sitemap = issues.map((i) => ({
    url: `${siteUrl}/issues/${i.id}`,
    lastModified: i.published_at ? new Date(i.published_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${siteUrl}/articles/${a.slug}`,
    lastModified: a.published_at ? new Date(a.published_at) : new Date(),
    changeFrequency: "yearly",
    priority: 0.9,
  }));

  const sectionEntries: MetadataRoute.Sitemap = sections.map((s) => ({
    url: `${siteUrl}/sections/${s.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const policyEntries: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/policies`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...policyPages.map((page) => ({
      url: `${siteUrl}/policies/${page.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/articles`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/issues`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/oai`,
      changeFrequency: "daily",
      priority: 0.4,
    },
    ...policyEntries,
    ...sectionEntries,
    ...issueEntries,
    ...articleEntries,
  ];
}
