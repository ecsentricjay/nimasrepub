import { redirect } from "next/navigation";
import Link from "next/link";
import { signInAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/auth-card";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const { error } = await searchParams;

  return (
    <AuthCard
      title="Sign in"
      description="Welcome back to NIMASREPUB."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-brand-blue">
            Create one
          </Link>
        </>
      }
    >
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <form action={signInAction} className="space-y-4">
        <FormField
          id="email"
          name="email"
          label="Email"
          type="email"
          required
          autoComplete="email"
        />
        <FormField
          id="password"
          name="password"
          label="Password"
          type="password"
          required
          autoComplete="current-password"
        />

        <SubmitButton pendingText="Signing in...">Sign in</SubmitButton>
      </form>
    </AuthCard>
  );
}
