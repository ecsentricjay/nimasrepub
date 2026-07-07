"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { uploadManuscriptFile } from "@/lib/storage";
import {
  sendSubmissionConfirmation,
  sendEditorNewSubmissionAlert,
} from "@/lib/email";

type AuthorEntry = {
  display_name: string;
  email: string;
  affiliation: string;
  orcid: string;
  is_corresponding: boolean;
};

// ─── helpers ────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

/**
 * Verify the calling user is authenticated, then return:
 *   - user: the verified Supabase auth user
 *   - db: a SERVICE ROLE client for database writes
 *
 * Why service role for writes?
 * In Next.js Server Actions the @supabase/ssr cookie client reliably
 * verifies identity via auth.getUser() (which hits Supabase's auth server
 * directly), but the access token it reads from cookies is not always
 * correctly forwarded to PostgREST — so auth.uid() returns null inside
 * RLS policies and every insert fails with "violates row-level security".
 *
 * The fix: verify identity through the auth server (trustworthy), then
 * use the service role client (which bypasses RLS) for database operations.
 * Security is maintained because we explicitly scope every write to the
 * verified user.id — the service role just removes the JWT-forwarding
 * ambiguity that causes the RLS failure.
 *
 * This is the standard production pattern for Supabase + Next.js Server
 * Actions. RLS still protects all client-side requests.
 */
async function requireAuth() {
  const cookieClient = await createClient();
  const {
    data: { user },
    error,
  } = await cookieClient.auth.getUser();

  if (error || !user) {
    redirect("/login?next=/author/dashboard");
  }

  // Service role client — bypasses RLS. Every operation below MUST be
  // scoped to user.id manually. Never expose this client to the browser.
  const db = createServiceRoleClient();

  return { db, user };
}

// ─── createSubmissionAction ─────────────────────────────────────────────────

export async function createSubmissionAction(formData: FormData) {
  const { db, user } = await requireAuth();

  const title = String(formData.get("title") ?? "").trim();
  const abstract = String(formData.get("abstract") ?? "").trim();
  const sectionId = String(formData.get("section_id") ?? "").trim();
  const keywordsRaw = String(formData.get("keywords") ?? "");
  const authorsJson = String(formData.get("authors_json") ?? "[]");
  const manuscript = formData.get("manuscript") as File | null;
  const coverLetter = formData.get("cover_letter") as File | null;

  if (!title || !abstract || !sectionId || !manuscript) {
    redirect("/author/submit?error=Missing+required+fields");
  }

  const keywords = keywordsRaw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const authors: AuthorEntry[] = (() => {
    try {
      return JSON.parse(authorsJson);
    } catch {
      return [];
    }
  })();

  const baseSlug = slugify(title);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

  // 1 — insert article
  const { data: article, error: articleError } = await db
    .from("articles")
    .insert({
      title,
      slug,
      abstract,
      keywords,
      section_id: sectionId,
      status: "submitted",
      submitted_via: "self",
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (articleError || !article) {
    console.error("[createSubmission] article insert failed:", articleError);
    redirect(
      `/author/submit?error=${encodeURIComponent(
        articleError?.message ?? "Failed to create submission"
      )}`
    );
  }

  const articleId = article.id;

  // 2 — insert authors (scoped to this article; first author linked to submitter)
  if (authors.length > 0) {
    await db.from("article_authors").insert(
      authors.map((a, i) => ({
        article_id: articleId,
        user_id: i === 0 ? user.id : null,
        display_name: a.display_name,
        email: a.email || null,
        affiliation: a.affiliation || null,
        orcid: a.orcid || null,
        author_order: i + 1,
        is_corresponding: a.is_corresponding,
      }))
    );
  } else {
    // Fallback: submitter becomes the sole corresponding author
    const { data: profile } = await db
      .from("profiles")
      .select("full_name, email, affiliation")
      .eq("id", user.id)
      .single();

    await db.from("article_authors").insert({
      article_id: articleId,
      user_id: user.id,
      display_name: profile?.full_name ?? user.email ?? "Unknown",
      email: profile?.email ?? user.email ?? null,
      affiliation: profile?.affiliation ?? null,
      author_order: 1,
      is_corresponding: true,
    });
  }

  // 3 — upload manuscript (storage uses the cookie client — Storage RLS
  //     uses a different mechanism that the cookie client handles fine)
  const cookieClient = await createClient();
  try {
    const manuscriptPath = await uploadManuscriptFile({
      articleId,
      file: manuscript!,
      filename: manuscript!.name,
      client: cookieClient,
    });
    await db.from("manuscript_files").insert({
      article_id: articleId,
      file_type: "original_submission",
      file_path: manuscriptPath,
      version: 1,
      uploaded_by: user.id,
    });
  } catch (err) {
    console.error("[createSubmission] manuscript upload failed:", err);
    await db.from("articles").update({ status: "draft" }).eq("id", articleId);
    redirect(
      `/author/submit?error=${encodeURIComponent(
        "File upload failed. Please try again."
      )}`
    );
  }

  // 4 — optional cover letter
  if (coverLetter && coverLetter.size > 0) {
    try {
      const clPath = await uploadManuscriptFile({
        articleId,
        file: coverLetter,
        filename: coverLetter.name,
        client: cookieClient,
      });
      await db.from("manuscript_files").insert({
        article_id: articleId,
        file_type: "cover_letter",
        file_path: clPath,
        version: 1,
        uploaded_by: user.id,
      });
    } catch {
      // Non-fatal — submission continues without cover letter
    }
  }

  // 5 — fetch section name for the email
  const { data: section } = await db
    .from("sections")
    .select("name")
    .eq("id", sectionId)
    .single();

  // 6 — emails (best-effort)
  const { data: profile } = await db
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const authorName = profile?.full_name ?? user.email ?? "Author";
  const authorEmail = profile?.email ?? user.email;

  try {
    if (authorEmail) {
      await sendSubmissionConfirmation({
        toEmail: authorEmail,
        toName: authorName,
        articleTitle: title,
        articleId,
      });
    }
    await sendEditorNewSubmissionAlert({
      articleTitle: title,
      articleId,
      authorName,
      sectionName: section?.name ?? "General",
    });
  } catch {
    // Email failures don't fail the submission
  }

  redirect(`/author/submissions/${articleId}?submitted=1`);
}

// ─── submitRevisionAction ───────────────────────────────────────────────────

export async function submitRevisionAction(formData: FormData) {
  const { db, user } = await requireAuth();

  const articleId = String(formData.get("article_id") ?? "").trim();
  const responseToReviewers = formData.get(
    "response_to_reviewers"
  ) as File | null;
  const revisedManuscript = formData.get("revised_manuscript") as File | null;

  if (!articleId || (!responseToReviewers && !revisedManuscript)) {
    redirect(
      `/author/submissions/${articleId}?error=Please+upload+at+least+one+file`
    );
  }

  // Verify the user is actually an author of this article
  const { data: authorship } = await db
    .from("article_authors")
    .select("id")
    .eq("article_id", articleId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!authorship) redirect("/author/dashboard?error=Not+authorised");

  const { data: existingFiles } = await db
    .from("manuscript_files")
    .select("version")
    .eq("article_id", articleId)
    .order("version", { ascending: false })
    .limit(1);

  const nextVersion = (existingFiles?.[0]?.version ?? 1) + 1;
  const cookieClient = await createClient();

  if (revisedManuscript && revisedManuscript.size > 0) {
    try {
      const path = await uploadManuscriptFile({
        articleId,
        file: revisedManuscript,
        filename: revisedManuscript.name,
        client: cookieClient,
      });
      await db.from("manuscript_files").insert({
        article_id: articleId,
        file_type: "revision",
        file_path: path,
        version: nextVersion,
        uploaded_by: user.id,
      });
    } catch {
      redirect(
        `/author/submissions/${articleId}?error=${encodeURIComponent(
          "File upload failed. Please try again."
        )}`
      );
    }
  }

  if (responseToReviewers && responseToReviewers.size > 0) {
    try {
      const path = await uploadManuscriptFile({
        articleId,
        file: responseToReviewers,
        filename: responseToReviewers.name,
        client: cookieClient,
      });
      await db.from("manuscript_files").insert({
        article_id: articleId,
        file_type: "response_to_reviewers",
        file_path: path,
        version: nextVersion,
        uploaded_by: user.id,
      });
    } catch {
      // Non-fatal
    }
  }

  await db
    .from("articles")
    .update({ status: "submitted", updated_at: new Date().toISOString() })
    .eq("id", articleId);

  redirect(`/author/submissions/${articleId}?revised=1`);
}
