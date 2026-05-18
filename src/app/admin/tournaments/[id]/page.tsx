import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Plus } from "lucide-react";
import {
  expenseCategoryMeta,
  isExpenseCategory,
  type ExpenseCategory,
} from "@/lib/expense-categories";
import TournamentEditable from "@/components/admin/TournamentEditable";

export const dynamic = "force-dynamic";

interface TournamentRow {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  season: string;
  notes: string | null;
  status: string;
}

interface ExpenseRow {
  id: string;
  expense_date: string;
  category: string;
  description: string;
  amount_cents: number;
  vendor: string | null;
  status: string;
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isTournamentStatus(
  s: string,
): s is "active" | "cancelled" | "completed" {
  return s === "active" || s === "cancelled" || s === "completed";
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = getAdmin();
  if (!admin) {
    return (
      <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
        Supabase service-role env vars not configured.
      </div>
    );
  }

  const { data: tournament } = await admin
    .from("tournaments")
    .select(
      "id, name, location, start_date, end_date, season, notes, status",
    )
    .eq("id", id)
    .maybeSingle();

  if (!tournament) redirect("/admin/tournaments");
  const t = tournament as TournamentRow;
  if (!isTournamentStatus(t.status)) {
    console.error("[tournaments/[id]] unknown status:", t.status);
    redirect("/admin/tournaments");
  }

  const { data: expenseData } = await admin
    .from("expenses")
    .select(
      "id, expense_date, category, description, amount_cents, vendor, status",
    )
    .eq("tournament_id", id)
    .eq("status", "active")
    .order("expense_date", { ascending: false });
  const expenses = (expenseData ?? []) as ExpenseRow[];

  const totalCents = expenses.reduce(
    (sum, e) => sum + (e.amount_cents ?? 0),
    0,
  );

  return (
    <div className="space-y-8">
      <nav className="flex items-center gap-1.5 text-[12px] text-[#6B7280]">
        <Link
          href="/admin/tournaments"
          className="inline-flex items-center gap-1 hover:text-[#0A0A0B] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Tournaments
        </Link>
        <span className="opacity-50">/</span>
        <span className="text-[#0A0A0B] font-medium truncate max-w-xs">
          {t.name}
        </span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
            Season {t.season}
          </div>
          <h1 className="mt-1 text-[28px] md:text-[32px] font-bold tracking-tight text-[#0A0A0B]">
            {t.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-[#6B7280]">
            <span>
              {formatDate(t.start_date)}
              {t.end_date && t.end_date !== t.start_date
                ? ` – ${formatDate(t.end_date)}`
                : ""}
            </span>
            {t.location && (
              <>
                <span className="text-[#E5E7EB]">·</span>
                <span>{t.location}</span>
              </>
            )}
          </div>
        </div>
        <Link
          href={`/admin/expenses/new?tournament_id=${t.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Expense to This Tournament
        </Link>
      </header>

      <TournamentEditable
        initial={{
          id: t.id,
          name: t.name,
          location: t.location,
          start_date: t.start_date,
          end_date: t.end_date,
          notes: t.notes,
          status: t.status,
        }}
      />

      <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-6 md:px-7 py-5 border-b border-[#E5E7EB] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
              Expenses
            </div>
            <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-[#0A0A0B]">
              {expenses.length} expense{expenses.length === 1 ? "" : "s"} on file
            </h2>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
              Total
            </div>
            <div className="text-[18px] font-bold tabular-nums text-[#0A0A0B]">
              {formatDollars(totalCents)}
            </div>
          </div>
        </div>
        {expenses.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-[#6B7280]">
            No expenses logged for this tournament yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB]">
                  <Th>Date</Th>
                  <Th>Category</Th>
                  <Th>Description</Th>
                  <Th>Vendor</Th>
                  <Th className="text-right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => {
                  const meta = isExpenseCategory(e.category)
                    ? expenseCategoryMeta[e.category as ExpenseCategory]
                    : { text: e.category, color: "#6B7280" };
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F8F9FA] transition-colors"
                    >
                      <td className="px-5 py-3 text-[#6B7280] tabular-nums whitespace-nowrap">
                        <Link
                          href={`/admin/expenses/${e.id}`}
                          className="hover:text-[#4A90D9]"
                        >
                          {formatDate(e.expense_date)}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.08em] text-white whitespace-nowrap"
                          style={{ backgroundColor: meta.color }}
                        >
                          {meta.text}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[#0A0A0B]">
                        <Link
                          href={`/admin/expenses/${e.id}`}
                          className="hover:text-[#4A90D9]"
                        >
                          {e.description}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-[#6B7280]">
                        {e.vendor ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-[#0A0A0B] font-medium">
                        {formatDollars(e.amount_cents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={[
        "px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B7280] text-left",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </th>
  );
}
