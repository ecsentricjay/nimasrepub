import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";

function redirectAfterPost(url: URL | string) {
  return NextResponse.redirect(url, { status: 303 });
}

async function getApcAmount(
  db: ReturnType<typeof createServiceRoleClient>,
  sectionId: string
): Promise<number> {
  const { data: sectionRate } = await db
    .from("apc_rates")
    .select("amount")
    .eq("section_id", sectionId)
    .eq("is_active", true)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sectionRate) return sectionRate.amount;

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

export async function POST(request: Request) {
  const formData = await request.formData();
  const articleId = String(formData.get("article_id") ?? "").trim();

  const cookieClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await cookieClient.auth.getUser();

  if (authError || !user) {
    return redirectAfterPost(new URL("/login", request.url));
  }

  if (!articleId) {
    return redirectAfterPost(new URL("/author/dashboard", request.url));
  }

  const db = createServiceRoleClient();

  // Verify the user is an author of this article
  const { data: authorship } = await db
    .from("article_authors")
    .select("article_id")
    .eq("article_id", articleId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!authorship) {
    return redirectAfterPost(
      new URL("/author/dashboard?error=Not+authorised", request.url)
    );
  }

  const { data: article } = await db
    .from("articles")
    .select("title, section_id, status")
    .eq("id", articleId)
    .single();

  if (!article || article.status !== "awaiting_payment") {
    return redirectAfterPost(
      new URL(
        `/author/submissions/${articleId}?error=This+article+is+not+awaiting+payment`,
        request.url
      )
    );
  }

  const amount = await getApcAmount(db, article.section_id);
  if (amount <= 0) {
    return redirectAfterPost(
      new URL(
        `/author/submissions/${articleId}?error=APC+rate+not+configured.+Contact+the+editorial+office.`,
        request.url
      )
    );
  }

  const { data: profile } = await db
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const email = profile?.email ?? user.email ?? "";
  const reference = `NIMAS-${articleId.slice(0, 8).toUpperCase()}-${Date.now()}`;

  // Use the real incoming request's origin (correct for both
  // localhost during dev and the real domain in production) rather
  // than a hardcoded env var — this is what fixes Paystack redirecting
  // back to a domain that isn't running anything during local testing.
  const siteOrigin = new URL(request.url).origin;

  // Create a pending payment row — amount snapshotted now so future
  // rate changes don't retroactively alter historical records.
  await db.from("payments").insert({
    article_id: articleId,
    amount_charged: amount,
    currency: "NGN",
    status: "pending",
    payment_method: "paystack",
    paystack_reference: reference,
  });

  const paystackRes = await fetch(
    "https://api.paystack.co/transaction/initialize",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // kobo
        reference,
        currency: "NGN",
        callback_url: `${siteOrigin}/api/paystack/callback?article_id=${articleId}`,
        metadata: {
          article_id: articleId,
          article_title: article.title,
          user_id: user.id,
          custom_fields: [
            {
              display_name: "Article",
              variable_name: "article_title",
              value: article.title,
            },
          ],
        },
      }),
    }
  );

  if (!paystackRes.ok) {
    return redirectAfterPost(
      new URL(
        `/author/submissions/${articleId}?error=${encodeURIComponent(
          "Could not initialize payment. Please try again."
        )}`,
        request.url
      )
    );
  }

  const paystackData = await paystackRes.json();
  const authorizationUrl: string | undefined =
    paystackData?.data?.authorization_url;

  if (!authorizationUrl) {
    return redirectAfterPost(
      new URL(
        `/author/submissions/${articleId}?error=${encodeURIComponent(
          "Payment gateway error. Please try again later."
        )}`,
        request.url
      )
    );
  }

  return redirectAfterPost(authorizationUrl);
}
