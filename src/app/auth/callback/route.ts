import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email";

// Supabase redirects here after email confirmation, magic link login,
// password reset, and OAuth sign-in.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email, welcome_email_sent_at")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile?.welcome_email_sent_at) {
          try {
            await sendWelcomeEmail({
              toEmail: profile?.email ?? user.email,
              toName:
                profile?.full_name ??
                (user.user_metadata?.full_name as string | undefined) ??
                user.email,
            });

            await supabase
              .from("profiles")
              .update({ welcome_email_sent_at: new Date().toISOString() })
              .eq("id", user.id);
          } catch (err) {
            console.error("[auth callback] welcome email failed:", err);
          }
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = origin.includes("localhost");
      const redirectBase = isLocal || !forwardedHost ? origin : `https://${forwardedHost}`;
      return NextResponse.redirect(`${redirectBase}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
