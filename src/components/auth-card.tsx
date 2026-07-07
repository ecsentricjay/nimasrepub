import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted px-6 py-16">
      <Link href="/" className="mb-8">
        <Image
          src="/images/logo.png"
          alt="Nigerian Medical and Allied Sciences Research Publication"
          width={200}
          height={100}
          priority
          className="h-12 w-auto"
        />
      </Link>

      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-8 shadow-sm">
        <h1 className="font-serif text-2xl font-semibold text-brand-navy">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        )}

        <div className="mt-6">{children}</div>
      </div>

      {footer && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {footer}
        </p>
      )}
    </main>
  );
}
