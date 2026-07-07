import { AuthCard } from "@/components/auth-card";

export default function CheckEmailPage() {
  return (
    <AuthCard title="Check your email">
      <p className="text-sm leading-relaxed text-muted-foreground">
        We sent a confirmation link to the email address you signed up
        with. Click it to activate your account and finish signing in.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Don&apos;t see it? Check your spam folder, or make sure the
        address you entered was correct.
      </p>
    </AuthCard>
  );
}
