import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default async function EditorialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieClient = await createClient();
  const {
    data: { user },
  } = await cookieClient.auth.getUser();

  if (!user) redirect("/login?next=/editorial/dashboard");

  const db = createServiceRoleClient();
  const { data: roles } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const editorialRoles = ["admin", "editor_in_chief", "section_editor"];
  const hasAccess = roles?.some((r) => editorialRoles.includes(r.role));

  if (!hasAccess) redirect("/author/dashboard");

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
