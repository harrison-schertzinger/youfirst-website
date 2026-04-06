"use client";

interface Payment {
  id: string;
  amount_cents: number;
  payment_method: string | null;
  description: string | null;
  payment_date: string;
  season: string | null;
  status: string;
}

interface PaymentPlan {
  id: string;
  season: string;
  plan_type: string;
  total_amount_cents: number;
  amount_paid_cents: number;
  installments_total: number;
  installments_paid: number;
  next_due_date: string | null;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPlanType(type: string): string {
  switch (type) {
    case "lump_sum":
      return "Full Season";
    case "quarterly":
      return "Quarterly";
    case "monthly":
      return "Monthly";
    default:
      return type;
  }
}

function formatPaymentMethod(method: string | null): string {
  if (!method) return "—";
  switch (method) {
    case "stripe":
      return "Card";
    case "check":
      return "Check";
    case "cash":
      return "Cash";
    case "wix_historical":
      return "Online";
    default:
      return method;
  }
}

const statusBadge: Record<string, string> = {
  completed: "bg-accent-green/10 text-accent-green",
  pending: "bg-yellow-50 text-yellow-600",
  failed: "bg-red-50 text-red-500",
  refunded: "bg-[#F0F1F3] text-[#9CA3AF]",
};

export default function PaymentDashboard({
  payments,
  paymentPlan,
}: {
  payments: Payment[];
  paymentPlan: PaymentPlan | null;
}) {
  const balance = paymentPlan
    ? paymentPlan.total_amount_cents - paymentPlan.amount_paid_cents
    : 0;

  return (
    <div className="max-w-2xl mx-auto mt-12">
      <p className="section-label mb-6">Payment Overview</p>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Balance */}
        <div className="p-5 rounded-xl border border-[#E5E7EB] bg-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9CA3AF] mb-2">
            Balance Due
          </p>
          <p
            className={`text-2xl font-bold tracking-tight ${
              balance > 0 ? "text-[#1A1A1A]" : "text-accent-green"
            }`}
          >
            {paymentPlan ? formatCents(balance) : "—"}
          </p>
        </div>

        {/* Plan */}
        <div className="p-5 rounded-xl border border-[#E5E7EB] bg-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9CA3AF] mb-2">
            Payment Plan
          </p>
          <p className="text-lg font-semibold text-[#1A1A1A]">
            {paymentPlan ? formatPlanType(paymentPlan.plan_type) : "—"}
          </p>
          {paymentPlan && (
            <p className="text-sm text-[#6B7280] mt-1">
              {paymentPlan.installments_paid}/{paymentPlan.installments_total} payments
            </p>
          )}
        </div>

        {/* Next due */}
        <div className="p-5 rounded-xl border border-[#E5E7EB] bg-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9CA3AF] mb-2">
            Next Due Date
          </p>
          <p className="text-lg font-semibold text-[#1A1A1A]">
            {paymentPlan?.next_due_date
              ? formatDate(paymentPlan.next_due_date)
              : "—"}
          </p>
        </div>
      </div>

      {/* Make a payment button */}
      {balance > 0 && (
        <div className="mb-8">
          <a
            href="/fees"
            className="inline-block px-6 py-3.5 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(74,144,217,0.4)] hover:shadow-[0_4px_24px_rgba(74,144,217,0.55)] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            Make a Payment
          </a>
        </div>
      )}

      {/* Payment history */}
      {payments.length > 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
          <div className="p-5 border-b border-[#E5E7EB]">
            <h3 className="text-sm font-semibold text-[#1A1A1A]">Payment History</h3>
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9CA3AF]">
                    Date
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9CA3AF]">
                    Description
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9CA3AF]">
                    Method
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9CA3AF]">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9CA3AF]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-[#E5E7EB] last:border-0">
                    <td className="px-5 py-4 text-sm text-[#6B7280]">
                      {formatDate(p.payment_date)}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#1A1A1A]">
                      {p.description || p.season || "Payment"}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#6B7280]">
                      {formatPaymentMethod(p.payment_method)}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-[#1A1A1A] text-right">
                      {formatCents(p.amount_cents)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full ${
                          statusBadge[p.status] || statusBadge.completed
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="sm:hidden divide-y divide-[#E5E7EB]">
            {payments.map((p) => (
              <div key={p.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[#1A1A1A]">
                    {formatCents(p.amount_cents)}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full ${
                      statusBadge[p.status] || statusBadge.completed
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <p className="text-sm text-[#6B7280]">
                  {p.description || p.season || "Payment"}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-[#9CA3AF]">
                    {formatDate(p.payment_date)}
                  </span>
                  <span className="text-xs text-[#9CA3AF]">
                    {formatPaymentMethod(p.payment_method)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-xl border border-[#E5E7EB] bg-white text-center">
          <p className="text-sm text-[#9CA3AF]">No payments recorded yet.</p>
        </div>
      )}
    </div>
  );
}
