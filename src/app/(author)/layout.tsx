import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default async function AuthorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/author/dashboard");
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
