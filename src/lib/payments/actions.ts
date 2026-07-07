"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Payment initialization moved to /api/payments/initialize (a POST route
// handler) for the same reliability reasons reviewer actions were moved
// to route handlers — see that file for the Paystack initialize logic
// and the request-origin resolution that fixes local-dev callback URLs.

// ─── helpers ────────────────────────────────────────────────────────────────

async function requireUser() {
  const cookieClient = await createClient();
  const { data: { user }, error } = await cookieClient.auth.getUser();
  if (error || !user) redirect("/login");
  return { db: createServiceRoleClient(), user };
}

async function requireEditor() {
  const { db, user } = await requireUser();
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

/**
 * Fetch the active APC rate for a given article's section.
 * Falls back to the global rate (section_id IS NULL) if no
 * section-specific rate exists.
 */
async function getApcAmount(
  db: ReturnType<typeof createServiceRoleClient>,
  sectionId: string
): Promise<number> {
  // Try section-specific rate first
  const { data: sectionRate } = await db
    .from("apc_rates")
    .select("amount")
    .eq("section_id", sectionId)
    .eq("is_active", true)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sectionRate) return sectionRate.amount;

  // Fall back to global rate
  const { data: globalRate } = await db
    .from("apc_rates")
    .select("amount")
    .is("section_id", null)
    .eq("is_active", true)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  return globalRate?.amount ?? 0;
}

// ─── waivePaymentAction ──────────────────────────────────────────────────────

export async function waivePaymentAction(formData: FormData) {
  const { db, user } = await requireEditor();

  const articleId = String(formData.get("article_id") ?? "").trim();
  const reason = String(formData.get("waived_reason") ?? "").trim();

  if (!articleId || !reason) {
    redirect(
      `/editorial/submissions/${articleId}?error=A+reason+is+required+to+waive+payment`
    );
  }

  const { data: article } = await db
    .from("articles")
    .select("section_id")
    .eq("id", articleId)
    .single();

  if (!article) redirect(`/editorial/submissions/${articleId}?error=Article+not+found`);

  const amount = await getApcAmount(db, article.section_id);

  // Upsert a waived payment record
  await db.from("payments").upsert(
    {
      article_id: articleId,
      amount_charged: amount,
      currency: "NGN",
      status: "waived",
      payment_method: "waived",
      waived_by: user.id,
      waived_reason: reason,
      paid_at: new Date().toISOString(),
    },
    { onConflict: "article_id" }
  );

  // Move article to in_production
  await db
    .from("articles")
    .update({ status: "in_production" })
    .eq("id", articleId);

  redirect(`/editorial/submissions/${articleId}?payment_waived=1`);
}

// ─── recordManualPaymentAction ───────────────────────────────────────────────

export async function recordManualPaymentAction(formData: FormData) {
  const { db, user } = await requireEditor();

  const articleId = String(formData.get("article_id") ?? "").trim();
  const amountStr = String(formData.get("amount") ?? "").trim();
  const reference = String(formData.get("reference") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!articleId || !amountStr) {
    redirect(
      `/editorial/submissions/${articleId}?error=Amount+is+required`
    );
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    redirect(`/editorial/submissions/${articleId}?error=Invalid+amount`);
  }

  await db.from("payments").upsert(
    {
      article_id: articleId,
      amount_charged: amount,
      currency: "NGN",
      status: "paid",
      payment_method: "manual_offline",
      paystack_reference: reference || null,
      waived_reason: note || null,
      recorded_by: user.id,
      paid_at: new Date().toISOString(),
    },
    { onConflict: "article_id" }
  );

  // Move article to in_production
  await db
    .from("articles")
    .update({ status: "in_production" })
    .eq("id", articleId);

  redirect(`/editorial/submissions/${articleId}?payment_recorded=1`);
}
