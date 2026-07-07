"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText,
}: {
  children: React.ReactNode;
  pendingText: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-brand-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? pendingText : children}
    </button>
  );
}
