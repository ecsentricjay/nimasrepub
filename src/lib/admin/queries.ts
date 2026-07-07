import { createServiceRoleClient } from "@/lib/supabase/service-role";

// ─── Dashboard stats ─────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const db = createServiceRoleClient();

  const [
    { count: totalSubmissions },
    { count: published },
    { count: underReview },
    { count: accepted },
    { count: rejected },
    { data: recentPayments },
  ] = await Promise.all([
    db
      .from("articles")
      .select("*", { count: "exact", head: true })
      .neq("status", "draft"),
    db
      .from("articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    db
      .from("articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "under_review"),
    db
      .from("articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "accepted"),
    db
      .from("articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "rejected"),
    db
      .from("payments")
      .select("amount_charged")
      .eq("status", "paid"),
  ]);

  const totalRevenue = (recentPayments ?? []).reduce(
    (sum, p) => sum + (p.amount_charged ?? 0),
    0
  );

  const acceptanceRate =
    totalSubmissions && (accepted ?? 0) + (rejected ?? 0) > 0
      ? Math.round(
          ((accepted ?? 0) / ((accepted ?? 0) + (rejected ?? 0))) * 100
        )
      : null;

  return {
    totalSubmissions: totalSubmissions ?? 0,
    published: published ?? 0,
    underReview: underReview ?? 0,
    accepted: accepted ?? 0,
    rejected: rejected ?? 0,
    totalRevenue,
    acceptanceRate,
  };
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getAllUsers() {
  const db = createServiceRoleClient();

  const { data: profiles } = await db
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (!profiles || profiles.length === 0) return [];

  const { data: roles } = await db
    .from("user_roles")
    .select("user_id, role, section_id");

  return profiles.map((p) => ({
    ...p,
    roles: roles?.filter((r) => r.user_id === p.id) ?? [],
  }));
}

// ─── Payments ────────────────────────────────────────────────────────────────

export async function getAllPaymentsAdmin() {
  const db = createServiceRoleClient();

  const { data: payments } = await db
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false });

  if (!payments || payments.length === 0) return [];

  const articleIds = [...new Set(payments.map((p) => p.article_id))];
  const { data: articles } = await db
    .from("articles")
    .select("id, title, slug")
    .in("id", articleIds);

  const articleMap = Object.fromEntries(
    (articles ?? []).map((a) => [a.id, a])
  );

  return payments.map((p) => ({
    ...p,
    article: articleMap[p.article_id] ?? null,
  }));
}

// ─── Announcements ───────────────────────────────────────────────────────────

export async function getAllAnnouncements() {
  const db = createServiceRoleClient();
  const { data } = await db
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ─── APC rates ───────────────────────────────────────────────────────────────

export async function getApcRateHistory() {
  const db = createServiceRoleClient();
  const { data } = await db
    .from("apc_rates")
    .select("*")
    .order("effective_from", { ascending: false });
  return data ?? [];
}
