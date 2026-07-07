import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendPaymentReceiptEmail } from "@/lib/email";

// Paystack sends a POST here whenever a payment event occurs. We verify the
// HMAC-SHA512 signature before updating the database.
export async function POST(request: Request) {
  const rawBody = await request.text();

  const paystackSignature = request.headers.get("x-paystack-signature") ?? "";
  const secret = process.env.PAYSTACK_SECRET_KEY ?? "";

  const expectedSignature = createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== paystackSignature) {
    console.warn("[Paystack webhook] Invalid signature rejected");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const reference: string = event.data?.reference ?? "";
  const amountKobo: number = event.data?.amount ?? 0;

  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  const db = createServiceRoleClient();

  const { data: payment } = await db
    .from("payments")
    .select("id, article_id, amount_charged")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (!payment) {
    console.warn(`[Paystack webhook] No payment found for reference: ${reference}`);
    return NextResponse.json({ received: true });
  }

  await db
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      amount_charged: amountKobo / 100,
    })
    .eq("id", payment.id);

  await db
    .from("articles")
    .update({ status: "in_production" })
    .eq("id", payment.article_id)
    .eq("status", "awaiting_payment");

  const { data: article } = await db
    .from("articles")
    .select("title, slug, issue_id")
    .eq("id", payment.article_id)
    .single();

  const { data: correspondingAuthor } = await db
    .from("article_authors")
    .select("display_name, email")
    .eq("article_id", payment.article_id)
    .eq("is_corresponding", true)
    .maybeSingle();

  if (correspondingAuthor?.email && article?.title) {
    try {
      await sendPaymentReceiptEmail({
        toEmail: correspondingAuthor.email,
        toName: correspondingAuthor.display_name,
        articleTitle: article.title,
        articleId: payment.article_id,
        amount: amountKobo / 100,
        reference,
      });
    } catch (err) {
      console.error("[Paystack webhook] Receipt email failed:", err);
    }
  }

  revalidatePath(`/author/submissions/${payment.article_id}`);
  revalidatePath(`/editorial/submissions/${payment.article_id}`);
  if (article?.slug) {
    revalidatePath(`/articles/${article.slug}`);
  }
  if (article?.issue_id) {
    revalidatePath(`/issues/${article.issue_id}`);
    revalidatePath(`/issues/${article.issue_id}/cover`);
  }

  return NextResponse.json({ received: true });
}
