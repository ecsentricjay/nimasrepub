import type { Metadata } from "next";
import Link from "next/link";
import { getAllPaymentsAdmin } from "@/lib/admin/queries";
import { formatNaira } from "@/lib/payments/queries";

export const metadata: Metadata = { title: "Payments" };

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  paid: "bg-green-50 text-green-700 border border-green-200",
  waived: "bg-blue-50 text-blue-700 border border-blue-200",
  failed: "bg-red-50 text-red-700 border border-red-200",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-NG", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function PaymentsPage() {
  const payments = await getAllPaymentsAdmin();

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.amount_charged ?? 0), 0);

  const totalWaived = payments.filter((p) => p.status === "waived").length;
  const totalPending = payments.filter((p) => p.status === "pending").length;

  return (
    <div className="max-w-4xl">
      <h1 className="font-serif text-3xl font-semibold text-brand-navy">
        Payments
      </h1>

      {/* Summary */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total confirmed", value: formatNaira(totalPaid) },
          { label: "Waivers granted", value: totalWaived },
          { label: "Pending", value: totalPending },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-md border border-border bg-background p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-1 font-serif text-2xl font-semibold text-brand-navy">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Payment ledger */}
      {payments.length === 0 ? (
        <p className="mt-10 text-muted-foreground">No payment records yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                {["Article", "Amount", "Method", "Status", "Reference", "Date"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-muted/40">
                  <td className="max-w-[200px] px-4 py-3">
                    {p.article ? (
                      <Link
                        href={`/editorial/submissions/${p.article_id}`}
                        className="line-clamp-2 font-medium text-brand-navy hover:underline"
                      >
                        {p.article.title}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatNaira(p.amount_charged)}
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">
                    {p.payment_method.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        STATUS_COLORS[p.status] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {p.paystack_reference?.slice(-12) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(p.paid_at ?? p.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
