import type { InputHTMLAttributes } from "react";

export function FormField({
  label,
  ...inputProps
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label
        htmlFor={inputProps.id}
        className="text-sm font-medium text-foreground"
      >
        {label}
      </label>
      <input
        {...inputProps}
        className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
      />
    </div>
  );
}
