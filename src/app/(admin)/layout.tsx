import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const NAV = [
  { href: "/admin/dashboard", label: "Overview" },
  { href: "/admin/users", label: "Users & roles" },
  { href: "/admin/apc", label: "APC pricing" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/ghost-publish", label: "Ghost publish" },
  { href: "/admin/discoverability", label: "Discoverability" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieClient = await createClient();
  const {
    data: { user },
  } = await cookieClient.auth.getUser();

  if (!user) redirect("/login?next=/admin/dashboard");

  const db = createServiceRoleClient();
  const { data: roles } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roleSet = new Set(roles?.map((r) => r.role) ?? []);
  const hasAccess =
    roleSet.has("admin") || roleSet.has("editor_in_chief");

  if (!hasAccess) redirect("/author/dashboard");

  return (
    <>
      <SiteHeader />
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        {/* Admin sub-nav */}
        <nav className="mb-10 flex flex-wrap gap-1 rounded-md border border-border bg-muted p-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-3 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-background hover:text-brand-navy"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
      <SiteFooter />
    </>
  );
}
