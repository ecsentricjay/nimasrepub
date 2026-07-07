"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function authErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;

  const maybeError = error as {
    message?: unknown;
    code?: unknown;
    status?: unknown;
    name?: unknown;
  };

  const message =
    typeof maybeError.message === "string" ? maybeError.message.trim() : "";

  if (message && message !== "{}") {
    return message;
  }

  const code = typeof maybeError.code === "string" ? maybeError.code : "";
  const status =
    typeof maybeError.status === "number" ? String(maybeError.status) : "";

  if (
    code.toLowerCase().includes("smtp") ||
    code.toLowerCase().includes("email") ||
    status === "500"
  ) {
    return "Supabase could not send the confirmation email. Please check the custom SMTP settings in Supabase and confirm the Resend sender domain is verified.";
  }

  return fallback;
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("[auth] sign in failed:", error);
    redirect(
      `/login?error=${encodeURIComponent(
        authErrorMessage(error, "Could not sign in. Please check your email and password.")
      )}`
    );
  }

  redirect("/");
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimasrepub.com.ng";

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Must point at the callback route for post-confirmation login.
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: { full_name: fullName },
    },
  });

  if (error) {
    console.error("[auth] sign up failed:", error);
    redirect(
      `/signup?error=${encodeURIComponent(
        authErrorMessage(
          error,
          "Could not create the account. Please try again or contact the editorial office."
        )
      )}`
    );
  }

  redirect("/signup/check-email");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
