import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET(request: Request) {
  // Verify the caller is an authenticated editorial user
  const cookieClient = await createClient();
  const {
    data: { user },
  } = await cookieClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceRoleClient();
  const { data: roles } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const editorialRoles = ["admin", "editor_in_chief", "section_editor"];
  if (!roles?.some((r) => editorialRoles.includes(r.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const { data } = await db
    .from("profiles")
    .select("id, full_name, email, affiliation")
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    .eq("is_active", true)
    .neq("id", user.id) // don't suggest yourself
    .limit(10);

  return NextResponse.json(data ?? []);
}
