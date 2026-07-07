import Link from "next/link";
import type { ArticleWithRelations } from "@/lib/articles";
import { formatAuthorList } from "@/lib/articles";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Publication date pending";
  return new Date(dateStr).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ArticleCard({ article }: { article: ArticleWithRelations }) {
  return (
    <article className="rounded-md border border-border bg-surface p-6 transition-colors hover:border-brand-blue">
      <div className="flex flex-wrap items-center gap-2">
        {article.section && (
          <Link
            href={`/sections/${article.section.slug}`}
            className="rounded-full bg-brand-green-light px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-green"
          >
            {article.section.name}
          </Link>
        )}
        <span className="text-xs text-muted-foreground">
          {formatDate(article.publication_date)}
        </span>
      </div>

      <h3 className="mt-4 font-serif text-xl font-semibold leading-snug text-brand-navy">
        <Link href={`/articles/${article.slug}`} className="hover:text-brand-blue">
          {article.title}
        </Link>
      </h3>

      <p className="mt-2 text-sm text-muted-foreground">
        {formatAuthorList(article.authors)}
      </p>

      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-foreground/80">
        {article.abstract}
      </p>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
        <span>
          {article.doi ? `DOI: ${article.doi}` : "DOI pending"}
          {article.page_start
            ? ` · pp. ${article.page_start}${article.page_end ? `-${article.page_end}` : ""}`
            : ""}
        </span>
        <Link
          href={`/articles/${article.slug}`}
          className="font-semibold text-brand-blue hover:underline"
        >
          Read
        </Link>
      </div>
    </article>
  );
}
