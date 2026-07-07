"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendDecisionEmail, sendReviewerInvitationEmail } from "@/lib/email";
import type { EditorialDecisionType, ArticleStatus } from "@/lib/supabase/types";

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

  return { db, user };
}

export async function inviteReviewerAction(formData: FormData) {
  const { db, user } = await requireEditor();

  const articleId = String(formData.get("article_id") ?? "").trim();
  const reviewerId = String(formData.get("reviewer_id") ?? "").trim();
  const deadlineRaw = formData.get("deadline") as string | null;

  if (!articleId || !reviewerId) {
    redirect(
      `/editorial/submissions/${articleId}?error=Missing+reviewer+or+article`
    );
  }

  const { error } = await db.from("review_invitations").upsert(
    {
      article_id: articleId,
      reviewer_id: reviewerId,
      invited_by: user.id,
      status: "invited",
      deadline: deadlineRaw || null,
    },
    { onConflict: "article_id,reviewer_id" }
  );

  if (error) {
    redirect(
      `/editorial/submissions/${articleId}?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  await db
    .from("articles")
    .update({ status: "under_review" })
    .eq("id", articleId)
    .eq("status", "submitted");

  const [{ data: reviewer }, { data: article }] = await Promise.all([
    db.from("profiles").select("full_name, email").eq("id", reviewerId).single(),
    db.from("articles").select("title").eq("id", articleId).single(),
  ]);

  if (reviewer?.email && article?.title) {
    try {
      await sendReviewerInvitationEmail({
        toEmail: reviewer.email,
        toName: reviewer.full_name ?? reviewer.email,
        articleTitle: article.title,
        deadline: deadlineRaw,
      });
    } catch {
      // Email failure is non-fatal.
    }
  }

  redirect(`/editorial/submissions/${articleId}?invited=1`);
}

export async function recordDecisionAction(formData: FormData) {
  const { db, user } = await requireEditor();

  const articleId = String(formData.get("article_id") ?? "").trim();
  const decision = String(
    formData.get("decision") ?? ""
  ) as EditorialDecisionType;
  const decisionLetter = String(formData.get("decision_letter") ?? "").trim();
  const round = parseInt(String(formData.get("round") ?? "1"), 10);

  if (!articleId || !decision || !decisionLetter) {
    redirect(
      `/editorial/submissions/${articleId}?error=Decision+and+letter+are+required`
    );
  }

  const validDecisions: EditorialDecisionType[] = [
    "accept",
    "minor_revisions",
    "major_revisions",
    "reject",
  ];
  if (!validDecisions.includes(decision)) {
    redirect(`/editorial/submissions/${articleId}?error=Invalid+decision`);
  }

  await db.from("editorial_decisions").insert({
    article_id: articleId,
    decided_by: user.id,
    decision,
    round,
    decision_letter: decisionLetter,
  });

  const statusMap: Record<EditorialDecisionType, ArticleStatus> = {
    accept: "awaiting_payment",
    minor_revisions: "revisions_requested",
    major_revisions: "revisions_requested",
    reject: "rejected",
  };

  await db
    .from("articles")
    .update({ status: statusMap[decision] })
    .eq("id", articleId);

  const { data: article } = await db
    .from("articles")
    .select("title")
    .eq("id", articleId)
    .single();

  const { data: correspondingAuthor } = await db
    .from("article_authors")
    .select("display_name, email")
    .eq("article_id", articleId)
    .eq("is_corresponding", true)
    .maybeSingle();

  if (correspondingAuthor?.email && article?.title) {
    try {
      await sendDecisionEmail({
        toEmail: correspondingAuthor.email,
        toName: correspondingAuthor.display_name,
        articleTitle: article.title,
        articleId,
        decision,
        decisionLetter,
      });
    } catch {
      // Email failure is non-fatal.
    }
  }

  redirect(`/editorial/submissions/${articleId}?decision=1`);
}

export async function updateArticleStatusAction(formData: FormData) {
  const { db } = await requireEditor();

  const articleId = String(formData.get("article_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  const allowedStatuses = [
    "submitted",
    "under_review",
    "revisions_requested",
    "accepted",
    "awaiting_payment",
    "in_production",
    "published",
    "rejected",
    "withdrawn",
  ];

  if (!articleId || !allowedStatuses.includes(status)) {
    redirect(`/editorial/submissions/${articleId}?error=Invalid+status`);
  }

  const { data: article } = await db
    .from("articles")
    .select("slug, issue_id")
    .eq("id", articleId)
    .maybeSingle();

  if (status === "published") {
    await db
      .from("articles")
      .update({
        status: status as ArticleStatus,
        updated_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        publication_date: new Date().toISOString().split("T")[0],
      })
      .eq("id", articleId);
  } else {
    await db
      .from("articles")
      .update({
        status: status as ArticleStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", articleId);
  }

  revalidatePath("/");
  revalidatePath("/articles");
  revalidatePath("/issues");
  revalidatePath("/sitemap.xml");
  revalidatePath(`/editorial/submissions/${articleId}`);
  if (article?.slug) {
    revalidatePath(`/articles/${article.slug}`);
  }
  if (article?.issue_id) {
    revalidatePath(`/issues/${article.issue_id}`);
    revalidatePath(`/issues/${article.issue_id}/cover`);
  }

  redirect(`/editorial/submissions/${articleId}?status_updated=1`);
}
