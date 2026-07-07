import type { Metadata } from "next";
import { getApcRateHistory } from "@/lib/admin/queries";
import { setApcRateAction } from "@/lib/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { formatNaira } from "@/lib/payments/queries";

export const metadata: Metadata = { title: "APC Pricing" };

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-NG", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default async function ApcPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; rate_set?: string }>;
}) {
  const { error, rate_set } = await searchParams;
  const rates = await getApcRateHistory();
  const current = rates.find((r) => r.is_active && r.section_id === null);

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl font-semibold text-brand-navy">
        APC pricing
      </h1>
      <p className="mt-1 text-muted-foreground">
        The Article Processing Charge shown to authors. Setting a new rate
        deactivates the previous one — existing payment records are
        unaffected.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {rate_set && (
        <p className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          New APC rate saved and is now active.
        </p>
      )}

      {/* Current rate */}
      <div className="mt-8 rounded-md border border-border bg-muted p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Current rate
        </p>
        {current ? (
          <>
            <p className="mt-2 font-serif text-4xl font-semibold text-brand-navy">
              {formatNaira(current.amount)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Active since {formatDate(current.effective_from)}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-amber-700">
            No active rate set. Authors cannot pay until a rate is configured.
          </p>
        )}
      </div>

      {/* Set new rate */}
      <div className="mt-8 rounded-md border border-border p-6">
        <h2 className="font-serif text-lg font-semibold text-brand-navy">
          Set new rate
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The new rate takes effect immediately for all future payments.
        </p>
        <form action={setApcRateAction} className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">
              Amount (₦) <span className="text-red-500">*</span>
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">₦</span>
              <input
                type="number"
                name="amount"
                required
                min={0}
                step={500}
                defaultValue={current?.amount ?? ""}
                placeholder="e.g. 15000"
                className="w-48 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-blue"
              />
            </div>
          </div>
          <SubmitButton pendingText="Saving...">
            Set new rate
          </SubmitButton>
        </form>
      </div>

      {/* Rate history */}
      {rates.length > 0 && (
        <div className="mt-8">
          <h2 className="font-serif text-lg font-semibold text-brand-navy">
            Rate history
          </h2>
          <ul className="mt-4 divide-y divide-border rounded-md border border-border text-sm">
            {rates.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <span className="font-medium">
                    {formatNaira(r.amount)}
                  </span>
                  <span className="ml-3 text-xs text-muted-foreground">
                    {r.section_id ? "Section-specific" : "Global"} · Effective{" "}
                    {formatDate(r.effective_from)}
                  </span>
                </div>
                {r.is_active ? (
                  <span className="rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-xs text-green-700">
                    Active
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Superseded
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
