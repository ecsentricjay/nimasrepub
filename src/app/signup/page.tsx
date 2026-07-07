import { redirect } from "next/navigation";
import Link from "next/link";
import { signUpAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/auth-card";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";

export default async function SignupPage({
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
      title="Create an account"
      description="Set up an author account to start a submission."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-blue">
            Sign in
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

      <form action={signUpAction} className="space-y-4">
        <FormField
          id="full_name"
          name="full_name"
          label="Full name"
          type="text"
          required
          autoComplete="name"
        />
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
          minLength={8}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">
          At least 8 characters.
        </p>

        <SubmitButton pendingText="Creating account...">
          Create account
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
