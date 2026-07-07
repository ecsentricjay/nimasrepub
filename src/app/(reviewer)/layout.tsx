import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// Roles that are always allowed to access the reviewer area regardless
// of whether they have a specific invitation. Section editors, EIC, and
// admins regularly take on review assignments in addition to their
// editorial duties — restricting them to only the reviewer role would
// mean creating a redundant role grant for every editor who reviews.
const REVIEWER_ELIGIBLE_ROLES = [
  "reviewer",
  "section_editor",
  "editor_in_chief",
  "admin",
];

export default async function ReviewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieClient = await createClient();
  const {
    data: { user },
  } = await cookieClient.auth.getUser();

  if (!user) redirect("/login?next=/reviewer/dashboard");

  const db = createServiceRoleClient();

  const [{ data: roles }, { data: invitations }] = await Promise.all([
    db.from("user_roles").select("role").eq("user_id", user.id),
    db
      .from("review_invitations")
      .select("id")
      .eq("reviewer_id", user.id)
      .limit(1),
  ]);

  const hasEligibleRole = roles?.some((r) =>
    REVIEWER_ELIGIBLE_ROLES.includes(r.role)
  );
  const hasInvitations = (invitations?.length ?? 0) > 0;

  // Grant access if the user holds any eligible role OR has been
  // invited to review (which implicitly makes them a reviewer for
  // that article regardless of their other roles).
  if (!hasEligibleRole && !hasInvitations) {
    redirect("/author/dashboard");
  }

  return (
    <>
      <SiteHeader />
      <div className="mx-auto min-h-screen w-full max-w-5xl px-6 py-12">
        {children}
      </div>
      <SiteFooter />
    </>
  );
}
