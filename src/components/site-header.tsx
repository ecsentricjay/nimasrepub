import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { signOutAction } from "@/lib/auth/actions";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) || user?.email;

  let isEditorial = false;
  let isReviewer = false;
  let isAdmin = false;

  if (user) {
    const db = createServiceRoleClient();
    const { data: roles } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roleSet = new Set(roles?.map((r) => r.role) ?? []);
    isEditorial =
      roleSet.has("admin") ||
      roleSet.has("editor_in_chief") ||
      roleSet.has("section_editor");
    isReviewer =
      roleSet.has("reviewer") ||
      roleSet.has("section_editor") ||
      roleSet.has("editor_in_chief") ||
      roleSet.has("admin");
    isAdmin = roleSet.has("admin") || roleSet.has("editor_in_chief");
  }

  return (
    <header className="border-b border-border bg-background/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="NIMASREPUB"
            width={118}
            height={48}
            priority
            className="h-8 w-auto"
          />
          <span className="text-xl font-extrabold tracking-tight text-brand-navy">
            NIMASREPUB
          </span>
        </Link>

        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link href="/issues" className="hidden hover:underline sm:inline">
            Browse
          </Link>
          <Link href="/#about" className="hidden hover:underline sm:inline">
            About
          </Link>
          <Link href="/policies/author-guidelines" className="hidden hover:underline md:inline">
            Guidelines
          </Link>
          <Link href="/policies" className="hidden hover:underline lg:inline">
            Policies
          </Link>

          {user ? (
            <>
              <Link
                href="/author/dashboard"
                className="hidden text-foreground/80 hover:text-brand-blue md:inline"
              >
                My manuscripts
              </Link>
              {isReviewer && (
                <Link
                  href="/reviewer/dashboard"
                  className="hidden text-foreground/80 hover:text-brand-blue lg:inline"
                >
                  Reviews
                </Link>
              )}
              {isEditorial && (
                <Link
                  href="/editorial/dashboard"
                  className="hidden text-foreground/80 hover:text-brand-blue lg:inline"
                >
                  Editorial
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/admin/dashboard"
                  className="hidden text-foreground/80 hover:text-brand-blue lg:inline"
                >
                  Admin
                </Link>
              )}
              <span className="hidden max-w-36 truncate text-xs text-muted-foreground sm:inline">
                {displayName}
              </span>
              <form action={signOutAction}>
                <button type="submit" className="hover:text-brand-blue">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-brand-blue">
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-sm border border-brand-green px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-green-light"
              >
                Join
              </Link>
              <Link
                href="/signup"
                className="hidden rounded-sm bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue sm:inline-block"
              >
                Submit Manuscript
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
