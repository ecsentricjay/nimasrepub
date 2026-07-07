import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Paystack redirects the user's browser to this URL after payment.
// This is a belt-and-braces check — the webhook is the primary
// confirmation. This route verifies independently and handles the
// case where the webhook hasn't fired yet when the user returns.
//
// All internal redirects below use the *actual* request origin
// (request.url) rather than a hardcoded NEXT_PUBLIC_SITE_URL — using
// the env var here would send a locally-testing browser to the
// production domain (which isn't running anything), which is exactly
// why payment confirmation appeared to silently fail during local
// testing even though Paystack reported success.

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const reference = searchParams.get("reference") ?? "";
  const articleId = searchParams.get("article_id") ?? "";
  const trxref = searchParams.get("trxref") ?? reference; // Paystack sends both

  if (!reference && !trxref) {
    return NextResponse.redirect(
      `${origin}/author/dashboard?error=Invalid+payment+callback`
    );
  }

  const resolvedRef = reference || trxref;

  // Verify with Paystack's API
  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(resolvedRef)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY ?? ""}`,
      },
    }
  );

  if (!verifyRes.ok) {
    return NextResponse.redirect(
      `${origin}/author/submissions/${articleId}?error=${encodeURIComponent(
        "Payment verification failed. If you completed the payment, it will be confirmed shortly."
      )}`
    );
  }

  const verifyData = await verifyRes.json();
  const status: string = verifyData?.data?.status ?? "";
  const amountKobo: number = verifyData?.data?.amount ?? 0;

  if (status !== "success") {
    return NextResponse.redirect(
      `${origin}/author/submissions/${articleId}?error=${encodeURIComponent(
        `Payment status: ${status}. Please contact the editorial office if you believe this is an error.`
      )}`
    );
  }

  // Update payment record — idempotent, webhook may have already done this
  const db = createServiceRoleClient();

  const { data: payment } = await db
    .from("payments")
    .select("id, article_id")
    .eq("paystack_reference", resolvedRef)
    .maybeSingle();

  if (payment) {
    await db
      .from("payments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        amount_charged: amountKobo / 100,
      })
      .eq("id", payment.id)
      .neq("status", "paid"); // don't overwrite if webhook already confirmed

    await db
      .from("articles")
      .update({ status: "in_production" })
      .eq("id", payment.article_id)
      .eq("status", "awaiting_payment");

    return NextResponse.redirect(
      `${origin}/author/submissions/${payment.article_id}?payment_success=1`
    );
  }

  // Fallback — payment record not found (shouldn't happen, but handle gracefully)
  const target = articleId
    ? `${origin}/author/submissions/${articleId}?payment_success=1`
    : `${origin}/author/dashboard?payment_success=1`;

  return NextResponse.redirect(target);
}
