import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimasrepub.com.ng";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Nothing under /admin, /author, /reviewer should ever be crawled —
        // those are authenticated dashboards, not content.
        disallow: ["/admin", "/author", "/reviewer", "/api", "/login", "/signup"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
