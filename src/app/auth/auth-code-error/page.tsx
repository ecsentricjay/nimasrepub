import Link from "next/link";
import { AuthCard } from "@/components/auth-card";

export default function AuthCodeErrorPage() {
  return (
    <AuthCard title="That sign-in link didn't work">
      <p className="text-sm leading-relaxed text-muted-foreground">
        The link may have expired or already been used. Try signing in
        again, or request a new confirmation link by creating an account
        again with the same email.
      </p>
      <Link
        href="/login"
        className="mt-6 block w-full rounded-md bg-brand-blue px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-brand-navy"
      >
        Back to sign in
      </Link>
    </AuthCard>
  );
}
