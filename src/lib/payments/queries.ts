import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "@/lib/supabase/types";

type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type ApcRateRow = Database["public"]["Tables"]["apc_rates"]["Row"];

export type PaymentInfo = {
  payment: PaymentRow | null;
  apcRate: ApcRateRow | null;
};

export async function getPaymentInfo(articleId: string): Promise<PaymentInfo> {
  const db = createServiceRoleClient();

  const { data: article } = await db
    .from("articles")
    .select("section_id")
    .eq("id", articleId)
    .maybeSingle();

  const [{ data: payment }, sectionRateRes, globalRateRes] = await Promise.all([
    db
      .from("payments")
      .select("*")
      .eq("article_id", articleId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    article?.section_id
      ? db
          .from("apc_rates")
          .select("*")
          .eq("section_id", article.section_id)
          .eq("is_active", true)
          .order("effective_from", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    db
      .from("apc_rates")
      .select("*")
      .is("section_id", null)
      .eq("is_active", true)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const apcRate = sectionRateRes.data ?? globalRateRes.data ?? null;

  return { payment: payment ?? null, apcRate };
}

export async function getAllPayments() {
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

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
}
