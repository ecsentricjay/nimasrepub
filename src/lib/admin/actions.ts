"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { brandPublishedPdf, generateGhostPublishedPdf } from "@/lib/pdf/published";
import type { AppRole, ArticleStatus } from "@/lib/supabase/types";

// ─── helpers ─────────────────────────────────────────────────────────────────

async function requireAdmin() {
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

  if (!roles?.some((r) => r.role === "admin")) {
    redirect("/author/dashboard");
  }
  return { db, user };
}

async function requireAdminOrEic() {
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

  const ok = roles?.some((r) =>
    ["admin", "editor_in_chief"].includes(r.role)
  );
  if (!ok) redirect("/author/dashboard");
  return { db, user };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

// ─── User management (admin only) ────────────────────────────────────────────

export async function grantRoleAction(formData: FormData) {
  const { db } = await requireAdmin();

  const userId = String(formData.get("user_id") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() as AppRole;

  const validRoles: AppRole[] = [
    "admin",
    "editor_in_chief",
    "section_editor",
    "reviewer",
    "author",
  ];
  if (!userId || !validRoles.includes(role)) {
    redirect("/admin/users?error=Invalid+role+or+user");
  }

  await db
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id,role,section_id" });

  redirect("/admin/users?role_updated=1");
}

export async function revokeRoleAction(formData: FormData) {
  const { db } = await requireAdmin();

  const userId = String(formData.get("user_id") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() as AppRole;

  if (!userId || !role) redirect("/admin/users?error=Missing+parameters");

  await db
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", role);

  redirect("/admin/users?role_updated=1");
}

export async function toggleUserActiveAction(formData: FormData) {
  const { db } = await requireAdmin();

  const userId = String(formData.get("user_id") ?? "").trim();
  const isActive = formData.get("is_active") === "true";

  if (!userId) redirect("/admin/users?error=Missing+user");

  await db
    .from("profiles")
    .update({ is_active: !isActive })
    .eq("id", userId);

  redirect("/admin/users?updated=1");
}

// ─── APC rate management (admin only) ────────────────────────────────────────

export async function setApcRateAction(formData: FormData) {
  const { db, user } = await requireAdmin();

  const amountStr = String(formData.get("amount") ?? "").trim();
  const amount = parseFloat(amountStr);

  if (isNaN(amount) || amount < 0) {
    redirect("/admin/apc?error=Invalid+amount");
  }

  // Deactivate all existing global rates
  await db
    .from("apc_rates")
    .update({ is_active: false })
    .is("section_id", null);

  // Insert new active rate
  await db.from("apc_rates").insert({
    amount,
    currency: "NGN",
    section_id: null,
    is_active: true,
    effective_from: new Date().toISOString(),
    created_by: user.id,
  });

  redirect("/admin/apc?rate_set=1");
}

// ─── Announcements ────────────────────────────────────────────────────────────

export async function createAnnouncementAction(formData: FormData) {
  const { db, user } = await requireAdminOrEic();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const publishNow = formData.get("publish_now") === "on";

  if (!title || !body) {
    redirect("/admin/announcements?error=Title+and+body+are+required");
  }

  await db.from("announcements").insert({
    title,
    body,
    published_at: publishNow ? new Date().toISOString() : null,
    created_by: user.id,
  });

  redirect("/admin/announcements?created=1");
}

export async function updateAnnouncementAction(formData: FormData) {
  const { db } = await requireAdminOrEic();

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const publishNow = formData.get("publish_now") === "on";

  if (!id || !title || !body) {
    redirect("/admin/announcements?error=All+fields+required");
  }

  await db
    .from("announcements")
    .update({
      title,
      body,
      published_at: publishNow ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  redirect("/admin/announcements?updated=1");
}

export async function deleteAnnouncementAction(formData: FormData) {
  const { db } = await requireAdminOrEic();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/announcements?error=Missing+id");

  await db.from("announcements").delete().eq("id", id);
  redirect("/admin/announcements?deleted=1");
}

// ─── Ghost publishing (admin and editor_in_chief only) ───────────────────────

export async function ghostPublishAction(formData: FormData) {
  const { db, user } = await requireAdminOrEic();

  const title = String(formData.get("title") ?? "").trim();
  const abstract = String(formData.get("abstract") ?? "").trim();
  const manuscriptBody = String(formData.get("manuscript_body") ?? "").trim();
  const sectionId = String(formData.get("section_id") ?? "").trim();
  const keywordsRaw = String(formData.get("keywords") ?? "");
  const authorsJson = String(formData.get("authors_json") ?? "[]");
  const skipReview = formData.get("skip_review") === "on";
  const finalPdf = formData.get("final_pdf") as File | null;

  if (!title || !abstract || !sectionId) {
    redirect("/admin/ghost-publish?error=Title+abstract+and+section+are+required");
  }

  if (finalPdf && finalPdf.size > 0) {
    if (!finalPdf.name.toLowerCase().endsWith(".pdf")) {
      redirect("/admin/ghost-publish?error=Final+file+must+be+a+PDF");
    }

    if (finalPdf.size > 50 * 1024 * 1024) {
      redirect("/admin/ghost-publish?error=Final+PDF+must+be+under+50+MB");
    }
  }

  const keywords = keywordsRaw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const authors: {
    display_name: string;
    email: string;
    affiliation: string;
    orcid: string;
    is_corresponding: boolean;
  }[] = (() => {
    try {
      return JSON.parse(authorsJson);
    } catch {
      return [];
    }
  })();

  const baseSlug = slugify(title);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

  const initialStatus: ArticleStatus = skipReview ? "accepted" : "submitted";

  const { data: article, error: articleError } = await db
    .from("articles")
    .insert({
      title,
      slug,
      abstract,
      keywords,
      section_id: sectionId,
      status: initialStatus,
      submitted_via: "admin_proxy",
      created_by: user.id,
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (articleError || !article) {
    redirect(
      `/admin/ghost-publish?error=${encodeURIComponent(
        articleError?.message ?? "Failed to create article"
      )}`
    );
  }

  const articleId = article.id;

  // Insert authors (all without user accounts — ghost publishing)
  if (authors.length > 0) {
    await db.from("article_authors").insert(
      authors.map((a, i) => ({
        article_id: articleId,
        user_id: null, // no account — ghost published
        display_name: a.display_name,
        email: a.email || null,
        affiliation: a.affiliation || null,
        orcid: a.orcid || null,
        author_order: i + 1,
        is_corresponding: a.is_corresponding,
      }))
    );
  }

  // Audit log — every proxy-published article gets a durable record
  const { data: section } = await db
    .from("sections")
    .select("name")
    .eq("id", sectionId)
    .maybeSingle();

  const pdfPath = `${articleId}/${slug}.pdf`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimasrepub.com.ng";
  const articleUrl = `${siteUrl}/articles/${slug}`;
  try {
    const generatedPdf =
      finalPdf && finalPdf.size > 0
        ? await brandPublishedPdf(await finalPdf.arrayBuffer(), title, {
            websiteUrl: siteUrl,
            articleUrl,
          })
        : await generateGhostPublishedPdf({
            title,
            abstract,
            manuscriptBody,
            authors: authors.map((a) => ({
              display_name: a.display_name,
              affiliation: a.affiliation || null,
            })),
            keywords,
            sectionName: section?.name ?? null,
            publicationDate: null,
            websiteUrl: siteUrl,
            articleUrl,
          });

    const { error: uploadError } = await db.storage
      .from("published-pdfs")
      .upload(pdfPath, generatedPdf, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { error: pdfPathError } = await db
      .from("articles")
      .update({ pdf_path: pdfPath })
      .eq("id", articleId);

    if (pdfPathError) {
      throw pdfPathError;
    }

    await db.from("manuscript_files").insert({
      article_id: articleId,
      file_type: "final_pdf",
      file_path: pdfPath,
      version: 99,
      uploaded_by: user.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF generation failed";
    redirect(
      `/editorial/submissions/${articleId}?ghost=1&error=${encodeURIComponent(
        message
      )}`
    );
  }

  await db.from("audit_log").insert({
    actor_id: user.id,
    action: "ghost_publish",
    entity_type: "articles",
    entity_id: articleId,
    metadata: {
      title,
      skip_review: skipReview,
      author_count: authors.length,
      pdf_path: pdfPath,
    },
  });

  redirect(`/editorial/submissions/${articleId}?ghost=1`);
}
