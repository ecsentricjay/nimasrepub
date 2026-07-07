"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendPublicationEmail } from "@/lib/email";
import { brandPublishedPdf, generateGhostPublishedPdf } from "@/lib/pdf/published";
import type { ArticleStatus, DoiStatus } from "@/lib/supabase/types";

async function requireEditor() {
  const cookieClient = await createClient();
  const {
    data: { user },
    error,
  } = await cookieClient.auth.getUser();

  if (error || !user) redirect("/login");

  const db = createServiceRoleClient();
  const { data: roles } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const editorialRoles = ["admin", "editor_in_chief", "section_editor"];
  if (!roles?.some((r) => editorialRoles.includes(r.role))) {
    redirect("/author/dashboard");
  }

  return { db, user, cookieClient };
}

export async function uploadFinalPdfAction(formData: FormData) {
  const { db, cookieClient } = await requireEditor();

  const articleId = String(formData.get("article_id") ?? "").trim();
  const file = formData.get("final_pdf") as File | null;

  if (!articleId || !file || file.size === 0) {
    redirect(
      `/editorial/submissions/${articleId}?error=Please+select+a+PDF+file`
    );
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    redirect(
      `/editorial/submissions/${articleId}?error=Final+PDF+must+be+a+.pdf+file`
    );
  }

  if (file.size > 50 * 1024 * 1024) {
    redirect(
      `/editorial/submissions/${articleId}?error=PDF+must+be+under+50+MB`
    );
  }

  const { data: article } = await db
    .from("articles")
    .select("title, slug, pdf_path, doi, publication_date, issue_id")
    .eq("id", articleId)
    .single();

  if (!article) redirect(`/editorial/submissions/${articleId}?error=Article+not+found`);

  const { data: issue } = article.issue_id
    ? await db
        .from("issues")
        .select("number, volume_id")
        .eq("id", article.issue_id)
        .maybeSingle()
    : { data: null };

  const { data: volume } = issue?.volume_id
    ? await db
        .from("volumes")
        .select("number")
        .eq("id", issue.volume_id)
        .maybeSingle()
    : { data: null };

  const path = `${articleId}/${article.slug}.pdf`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimasrepub.com.ng";

  if (article.pdf_path) {
    await cookieClient.storage
      .from("published-pdfs")
      .remove([article.pdf_path]);
  }

  const brandedPdf = await brandPublishedPdf(
    await file.arrayBuffer(),
    article.title,
    {
      volume: volume?.number ?? null,
      issue: issue?.number ?? null,
      websiteUrl: siteUrl,
      articleUrl: `${siteUrl}/articles/${article.slug}`,
      doi: article.doi,
      publicationDate: article.publication_date,
    }
  );

  const { error: uploadError } = await cookieClient.storage
    .from("published-pdfs")
    .upload(path, brandedPdf, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    redirect(
      `/editorial/submissions/${articleId}?error=${encodeURIComponent(
        `PDF upload failed: ${uploadError.message}`
      )}`
    );
  }

  const { data: current } = await db
    .from("articles")
    .select("status")
    .eq("id", articleId)
    .single();

  const newStatus: ArticleStatus =
    current?.status === "awaiting_payment" ||
    current?.status === "accepted"
      ? "in_production"
      : (current?.status as ArticleStatus);

  await db
    .from("articles")
    .update({ pdf_path: path, status: newStatus })
    .eq("id", articleId);

  revalidatePath(`/editorial/submissions/${articleId}`);

  redirect(`/editorial/submissions/${articleId}?pdf_uploaded=1`);
}

export async function assignToIssueAction(formData: FormData) {
  const { db } = await requireEditor();

  const articleId = String(formData.get("article_id") ?? "").trim();
  const issueId = String(formData.get("issue_id") ?? "").trim();
  const doi = String(formData.get("doi") ?? "").trim();
  const doiStatusRaw = String(formData.get("doi_status") ?? "none").trim();
  const doiStatus: DoiStatus = ["none", "pending", "registered"].includes(
    doiStatusRaw
  )
    ? (doiStatusRaw as DoiStatus)
    : "none";
  const pageStartRaw = formData.get("page_start");
  const pageEndRaw = formData.get("page_end");
  const articleOrderRaw = formData.get("article_order");

  const pageStart = pageStartRaw ? parseInt(String(pageStartRaw), 10) : null;
  const pageEnd = pageEndRaw ? parseInt(String(pageEndRaw), 10) : null;
  const articleOrder = articleOrderRaw
    ? parseInt(String(articleOrderRaw), 10)
    : null;

  const { data: currentArticle } = articleId
    ? await db
        .from("articles")
        .select("id, issue_id, slug")
        .eq("id", articleId)
        .maybeSingle()
    : { data: null };

  if (!currentArticle) {
    redirect(`/editorial/submissions/${articleId}?error=Article+not+found`);
  }

  let resolvedIssueId = issueId;

  if (issueId === "__new__") {
    const volumeNumber = parseInt(
      String(formData.get("new_volume_number") ?? "1"),
      10
    );
    const issueNumber = parseInt(
      String(formData.get("new_issue_number") ?? "1"),
      10
    );
    const year = parseInt(
      String(formData.get("new_volume_year") ?? new Date().getFullYear()),
      10
    );
    const issueTitle = String(formData.get("new_issue_title") ?? "").trim();

    const { data: volume } = await db
      .from("volumes")
      .upsert({ number: volumeNumber, year }, { onConflict: "number" })
      .select("id")
      .single();

    if (!volume) {
      redirect(
        `/editorial/submissions/${articleId}?error=Failed+to+create+volume`
      );
    }

    const { data: issue } = await db
      .from("issues")
      .upsert(
        {
          volume_id: volume.id,
          number: issueNumber,
          title: issueTitle || null,
          published_at: new Date().toISOString().split("T")[0],
        },
        { onConflict: "volume_id,number" }
      )
      .select("id")
      .single();

    if (!issue) {
      redirect(
        `/editorial/submissions/${articleId}?error=Failed+to+create+issue`
      );
    }

    resolvedIssueId = issue.id;
  }

  if (!resolvedIssueId) {
    redirect(`/editorial/submissions/${articleId}?error=Please+select+an+issue`);
  }

  const { data: selectedIssue } = await db
    .from("issues")
    .select("id, number, volume_id")
    .eq("id", resolvedIssueId)
    .maybeSingle();

  if (!selectedIssue) {
    redirect(`/editorial/submissions/${articleId}?error=Selected+issue+not+found`);
  }

  const { data: updatedArticle, error: updateError } = await db
    .from("articles")
    .update({
      issue_id: resolvedIssueId,
      doi: doi || null,
      doi_status: doi ? doiStatus : "none",
    })
    .eq("id", articleId)
    .select("issue_id, slug, title, pdf_path, doi, publication_date")
    .single();

  if (updateError || !updatedArticle) {
    redirect(
      `/editorial/submissions/${articleId}?error=${encodeURIComponent(
        updateError?.message ?? "Issue assignment update returned no article"
      )}`
    );
  }

  if (updatedArticle.issue_id !== resolvedIssueId) {
    redirect(
      `/editorial/submissions/${articleId}?error=Issue+assignment+was+not+saved`
    );
  }

  let metadataWarning: string | null = null;
  const pageMetadata: {
    page_start?: number;
    page_end?: number;
    article_order?: number;
  } = {};

  if (pageStart !== null) pageMetadata.page_start = pageStart;
  if (pageEnd !== null) pageMetadata.page_end = pageEnd;
  if (articleOrder !== null) pageMetadata.article_order = articleOrder;

  if (Object.keys(pageMetadata).length > 0) {
    const { error: metadataError } = await db
      .from("articles")
      .update(pageMetadata)
      .eq("id", articleId);

    if (metadataError) {
      metadataWarning =
        "Issue saved, but page numbers/order could not be saved. Apply migration 0012_page_numbers_and_ordering.sql.";
    }
  }

  if (updatedArticle.pdf_path) {
    const { data: volume } = selectedIssue.volume_id
      ? await db
          .from("volumes")
          .select("number")
          .eq("id", selectedIssue.volume_id)
          .maybeSingle()
      : { data: null };

    const { data: storedPdf } = await db.storage
      .from("published-pdfs")
      .download(updatedArticle.pdf_path);

    if (storedPdf) {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimasrepub.com.ng";
      const restampedPdf = await brandPublishedPdf(
        await storedPdf.arrayBuffer(),
        updatedArticle.title,
        {
          volume: volume?.number ?? null,
          issue: selectedIssue.number,
          websiteUrl: siteUrl,
          articleUrl: `${siteUrl}/articles/${updatedArticle.slug}`,
          doi: updatedArticle.doi,
          publicationDate: updatedArticle.publication_date,
        }
      );

      await db.storage
        .from("published-pdfs")
        .upload(updatedArticle.pdf_path, restampedPdf, {
          contentType: "application/pdf",
          upsert: true,
        });
    }
  }

  revalidatePath("/issues");
  if (currentArticle.issue_id) {
    revalidatePath(`/issues/${currentArticle.issue_id}`);
    revalidatePath(`/issues/${currentArticle.issue_id}/cover`);
  }
  revalidatePath(`/issues/${resolvedIssueId}`);
  revalidatePath(`/issues/${resolvedIssueId}/cover`);
  revalidatePath(`/articles/${updatedArticle.slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath(`/editorial/submissions/${articleId}`);

  const warningParam = metadataWarning
    ? `&warning=${encodeURIComponent(metadataWarning)}`
    : "";

  redirect(`/editorial/submissions/${articleId}?issue_assigned=1${warningParam}`);
}

export async function regeneratePublishedPdfAction(formData: FormData) {
  const { db, user } = await requireEditor();

  const articleId = String(formData.get("article_id") ?? "").trim();
  if (!articleId) redirect("/editorial/dashboard?error=Missing+article");

  const { data: article } = await db
    .from("articles")
    .select(
      "id, title, slug, abstract, keywords, section_id, pdf_path, issue_id, doi, publication_date, submitted_via"
    )
    .eq("id", articleId)
    .single();

  if (!article) {
    redirect(`/editorial/submissions/${articleId}?error=Article+not+found`);
  }

  const [{ data: section }, { data: authors }, { data: issue }] =
    await Promise.all([
      db.from("sections").select("name").eq("id", article.section_id).maybeSingle(),
      db
        .from("article_authors")
        .select("display_name, affiliation")
        .eq("article_id", articleId)
        .order("author_order"),
      article.issue_id
        ? db
            .from("issues")
            .select("number, volume_id")
            .eq("id", article.issue_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const { data: volume } = issue?.volume_id
    ? await db
        .from("volumes")
        .select("number")
        .eq("id", issue.volume_id)
        .maybeSingle()
    : { data: null };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimasrepub.com.ng";
  const metadata = {
    volume: volume?.number ?? null,
    issue: issue?.number ?? null,
    websiteUrl: siteUrl,
    articleUrl: `${siteUrl}/articles/${article.slug}`,
    doi: article.doi,
    publicationDate: article.publication_date,
  };

  const pdfPath = article.pdf_path ?? `${article.id}/${article.slug}.pdf`;
  const { data: storedPdf } = article.pdf_path
    ? await db.storage.from("published-pdfs").download(article.pdf_path)
    : { data: null };

  const pdfBytes = storedPdf
    ? await brandPublishedPdf(await storedPdf.arrayBuffer(), article.title, metadata)
    : await generateGhostPublishedPdf({
        title: article.title,
        abstract: article.abstract,
        authors: (authors ?? []).map((author) => ({
          display_name: author.display_name,
          affiliation: author.affiliation,
        })),
        keywords: article.keywords,
        sectionName: section?.name ?? null,
        publicationDate: article.publication_date,
        websiteUrl: siteUrl,
        articleUrl: `${siteUrl}/articles/${article.slug}`,
        doi: article.doi,
        volume: volume?.number ?? null,
        issue: issue?.number ?? null,
      });

  const { error: uploadError } = await db.storage
    .from("published-pdfs")
    .upload(pdfPath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    redirect(
      `/editorial/submissions/${articleId}?error=${encodeURIComponent(
        uploadError.message
      )}`
    );
  }

  if (!article.pdf_path) {
    await db.from("articles").update({ pdf_path: pdfPath }).eq("id", articleId);
  }

  await db.from("manuscript_files").insert({
    article_id: articleId,
    file_type: "final_pdf",
    file_path: pdfPath,
    version: 99,
    uploaded_by: user.id,
  });

  revalidatePath(`/articles/${article.slug}`);
  revalidatePath(`/editorial/submissions/${articleId}`);

  redirect(`/editorial/submissions/${articleId}?pdf_regenerated=1`);
}

export async function publishArticleAction(formData: FormData) {
  const { db } = await requireEditor();

  const articleId = String(formData.get("article_id") ?? "").trim();

  const { data: article } = await db
    .from("articles")
    .select("title, slug, pdf_path, status, issue_id, doi")
    .eq("id", articleId)
    .single();

  if (!article) {
    redirect(`/editorial/submissions/${articleId}?error=Article+not+found`);
  }

  if (!article.pdf_path) {
    redirect(
      `/editorial/submissions/${articleId}?error=Upload+the+final+PDF+before+publishing`
    );
  }

  const publishedAt = new Date().toISOString();
  const publicationDate = publishedAt.split("T")[0];

  await db
    .from("articles")
    .update({
      status: "published",
      published_at: publishedAt,
      publication_date: publicationDate,
      updated_at: publishedAt,
    })
    .eq("id", articleId);

  const { data: issue } = article.issue_id
    ? await db
        .from("issues")
        .select("number, volume_id")
        .eq("id", article.issue_id)
        .maybeSingle()
    : { data: null };

  const { data: volume } = issue?.volume_id
    ? await db
        .from("volumes")
        .select("number")
        .eq("id", issue.volume_id)
        .maybeSingle()
    : { data: null };

  const { data: storedPdf } = await db.storage
    .from("published-pdfs")
    .download(article.pdf_path);

  if (storedPdf) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimasrepub.com.ng";
    const finalPdf = await brandPublishedPdf(
      await storedPdf.arrayBuffer(),
      article.title,
      {
        volume: volume?.number ?? null,
        issue: issue?.number ?? null,
        websiteUrl: siteUrl,
        articleUrl: `${siteUrl}/articles/${article.slug}`,
        doi: article.doi,
        publicationDate,
      }
    );

    await db.storage
      .from("published-pdfs")
      .upload(article.pdf_path, finalPdf, {
        contentType: "application/pdf",
        upsert: true,
      });
  }

  await db.from("manuscript_files").insert({
    article_id: articleId,
    file_type: "final_pdf",
    file_path: article.pdf_path,
    version: 99,
  });

  const { data: correspondingAuthor } = await db
    .from("article_authors")
    .select("display_name, email")
    .eq("article_id", articleId)
    .eq("is_corresponding", true)
    .maybeSingle();

  if (correspondingAuthor?.email) {
    try {
      await sendPublicationEmail({
        toEmail: correspondingAuthor.email,
        toName: correspondingAuthor.display_name,
        articleTitle: article.title,
        articleSlug: article.slug,
        articleId,
      });
    } catch {
      // Email failure is non-fatal. Article is published regardless.
    }
  }

  revalidatePath("/");
  revalidatePath("/articles");
  revalidatePath(`/articles/${article.slug}`);
  revalidatePath("/issues");
  if (article.issue_id) {
    revalidatePath(`/issues/${article.issue_id}`);
    revalidatePath(`/issues/${article.issue_id}/cover`);
  }
  revalidatePath("/sitemap.xml");
  revalidatePath(`/editorial/submissions/${articleId}`);

  redirect(`/editorial/submissions/${articleId}?published=1`);
}

export async function getVolumesAndIssues() {
  const db = createServiceRoleClient();

  const { data: volumes } = await db
    .from("volumes")
    .select("id, number, year")
    .order("number", { ascending: false });

  const { data: issues } = await db
    .from("issues")
    .select("id, volume_id, number, title, published_at")
    .order("number", { ascending: false });

  return { volumes: volumes ?? [], issues: issues ?? [] };
}
