import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, AlertCircle } from "lucide-react";
import {
  expenseCategoryMeta,
  isExpenseCategory,
  type ExpenseCategory,
} from "@/lib/expense-categories";
import ExpenseEditable from "@/components/admin/ExpenseEditable";
import ExpenseArchiveButton from "@/components/admin/ExpenseArchiveButton";

export const dynamic = "force-dynamic";

interface ExpenseRow {
  id: string;
  expense_date: string;
  category: string;
  description: string;
  amount_cents: number;
  vendor: string | null;
  season: string;
  tournament_id: string | null;
  player_id: string | null;
  notes: string | null;
  status: string;
  created_by: string | null;
  created_at: string | null;
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function ExpenseDetailPage({
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

  const { data: expense } = await admin
    .from("expenses")
    .select(
      "id, expense_date, category, description, amount_cents, vendor, season, tournament_id, player_id, notes, status, created_by, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!expense) {
    redirect("/admin/expenses");
  }
  const e = expense as ExpenseRow;
  if (!isExpenseCategory(e.category)) {
    // Defensive: a stored category that doesn't match the enum.
    console.error("[expenses/[id]] unknown category:", e.category);
    redirect("/admin/expenses");
  }
  const categoryKey = e.category as ExpenseCategory;
  const archived = e.status === "archived";

  // Tournaments + players for the editable card dropdowns.
  const [tourRes, playerRes] = await Promise.all([
    admin
      .from("tournaments")
      .select("id, name")
      .eq("status", "active"),
    admin
      .from("players")
      .select("id, first_name, last_name, graduation_year")
      .eq("status", "active"),
  ]);
  const tournaments = tourRes.data ?? [];
  const players = playerRes.data ?? [];

  const meta = expenseCategoryMeta[categoryKey];

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-[12px] text-[#6B7280]">
        <Link
          href="/admin/expenses"
          className="inline-flex items-center gap-1 hover:text-[#0A0A0B] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Expenses
        </Link>
        <span className="opacity-50">/</span>
        <span className="text-[#0A0A0B] font-medium truncate max-w-xs">
          {e.description}
        </span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.08em] text-white"
              style={{ backgroundColor: meta.color }}
            >
              {meta.text}
            </span>
            {archived && (
              <span className="text-[11px] uppercase tracking-[0.12em] text-[#F59E0B]">
                Archived
              </span>
            )}
          </div>
          <h1 className="mt-2 text-[26px] md:text-[28px] font-bold tracking-tight text-[#0A0A0B]">
            {e.description}
          </h1>
          <div className="mt-1 text-[13px] text-[#6B7280]">
            ${(e.amount_cents / 100).toFixed(2)} · logged by{" "}
            {e.created_by ?? "—"}
          </div>
        </div>
        {!archived ? (
          <ExpenseArchiveButton
            expenseId={e.id}
            description={e.description}
          />
        ) : (
          <ExpenseArchiveButton
            expenseId={e.id}
            description={e.description}
            restoreMode
          />
        )}
      </header>

      {archived && (
        <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-5 py-4 flex items-start gap-3">
          <span
            className="inline-flex w-6 h-6 rounded-full items-center justify-center shrink-0 bg-[#F59E0B]/10 text-[#F59E0B]"
            aria-hidden
          >
            <AlertCircle className="w-3.5 h-3.5" />
          </span>
          <div className="text-sm text-[#0A0A0B]">
            This expense is archived. Click <strong>Restore</strong> to add it
            back to the active list and financials breakdown.
          </div>
        </div>
      )}

      <ExpenseEditable
        initial={{
          id: e.id,
          expense_date: e.expense_date,
          category: categoryKey,
          description: e.description,
          amount_cents: e.amount_cents,
          vendor: e.vendor,
          tournament_id: e.tournament_id,
          player_id: e.player_id,
          notes: e.notes,
        }}
        tournaments={tournaments}
        players={players}
        archived={archived}
      />
    </div>
  );
}
