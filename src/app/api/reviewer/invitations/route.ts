import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { InvitationStatus } from "@/lib/supabase/types";

function redirectAfterPost(url: URL) {
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const invitationId = String(formData.get("invitation_id") ?? "").trim();
  const response = String(formData.get("response") ?? "").trim();
  const status =
    response === "accepted" || response === "declined"
      ? (response as InvitationStatus)
      : null;

  const cookieClient = await createClient();
  const {
    data: { user },
    error,
  } = await cookieClient.auth.getUser();

  if (error || !user) {
    return redirectAfterPost(
      new URL("/login?next=/reviewer/dashboard", request.url)
    );
  }

  if (!invitationId || !status) {
    return redirectAfterPost(
      new URL("/reviewer/dashboard?error=Invalid+response", request.url)
    );
  }

  const db = createServiceRoleClient();

  const { data: invitation, error: invErr } = await db
    .from("review_invitations")
    .select("id, article_id, reviewer_id")
    .eq("id", invitationId)
    .eq("reviewer_id", user.id)
    .maybeSingle();

  if (invErr) {
    return redirectAfterPost(
      new URL(
        `/reviewer/dashboard?error=${encodeURIComponent(invErr.message)}`,
        request.url
      )
    );
  }

  if (!invitation) {
    return redirectAfterPost(
      new URL("/reviewer/dashboard?error=Invitation+not+found", request.url)
    );
  }

  const { error: updateErr } = await db
    .from("review_invitations")
    .update({
      status,
      responded_at: new Date().toISOString(),
    })
    .eq("id", invitationId);

  if (updateErr) {
    return redirectAfterPost(
      new URL(
        `/reviewer/dashboard?error=${encodeURIComponent(updateErr.message)}`,
        request.url
      )
    );
  }

  if (response === "accepted") {
    return redirectAfterPost(
      new URL(
        `/reviewer/submissions/${invitation.article_id}?accepted=1`,
        request.url
      )
    );
  }

  return redirectAfterPost(
    new URL("/reviewer/dashboard?declined=1", request.url)
  );
}
