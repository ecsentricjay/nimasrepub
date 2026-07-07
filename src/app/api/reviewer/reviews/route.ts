import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { ReviewRecommendation } from "@/lib/supabase/types";

function redirectAfterPost(url: URL) {
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const articleId = String(formData.get("article_id") ?? "").trim();
  const recommendation = String(
    formData.get("recommendation") ?? ""
  ) as ReviewRecommendation;
  const commentsToAuthor = String(
    formData.get("comments_to_author") ?? ""
  ).trim();
  const commentsToEditor = String(
    formData.get("comments_to_editor") ?? ""
  ).trim();

  // Auth check
  const cookieClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await cookieClient.auth.getUser();

  if (authError || !user) {
    return redirectAfterPost(
      new URL("/login?next=/reviewer/dashboard", request.url)
    );
  }

  if (!articleId || !recommendation || !commentsToAuthor) {
    return redirectAfterPost(
      new URL(
        `/reviewer/submissions/${articleId}?error=Recommendation+and+author+comments+are+required`,
        request.url
      )
    );
  }

  const validRecs: ReviewRecommendation[] = [
    "accept",
    "minor_revisions",
    "major_revisions",
    "reject",
  ];
  if (!validRecs.includes(recommendation)) {
    return redirectAfterPost(
      new URL(
        `/reviewer/submissions/${articleId}?error=Invalid+recommendation`,
        request.url
      )
    );
  }

  const db = createServiceRoleClient();

  // Verify the reviewer has an accepted invitation for this article
  const { data: invitation } = await db
    .from("review_invitations")
    .select("id")
    .eq("article_id", articleId)
    .eq("reviewer_id", user.id)
    .eq("status", "accepted")
    .maybeSingle();

  if (!invitation) {
    return redirectAfterPost(
      new URL(
        "/reviewer/dashboard?error=No+accepted+invitation+found",
        request.url
      )
    );
  }

  // Determine current round from existing decisions
  const { data: decisions } = await db
    .from("editorial_decisions")
    .select("round")
    .eq("article_id", articleId)
    .order("round", { ascending: false })
    .limit(1);

  const currentRound = (decisions?.[0]?.round ?? 0) + 1;

  const { error: reviewErr } = await db.from("reviews").upsert(
    {
      article_id: articleId,
      reviewer_id: user.id,
      round: currentRound,
      recommendation,
      comments_to_author: commentsToAuthor,
      comments_to_editor: commentsToEditor || null,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "article_id,reviewer_id,round" }
  );

  if (reviewErr) {
    return redirectAfterPost(
      new URL(
        `/reviewer/submissions/${articleId}?error=${encodeURIComponent(
          reviewErr.message
        )}`,
        request.url
      )
    );
  }

  return redirectAfterPost(
    new URL(
      `/reviewer/submissions/${articleId}?submitted=1`,
      request.url
    )
  );
}
