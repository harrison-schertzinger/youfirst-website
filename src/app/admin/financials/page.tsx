import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  ArrowDownLeft,
} from "lucide-react";
import {
  expenseCategoryMeta,
  isExpenseCategory,
  type ExpenseCategory,
} from "@/lib/expense-categories";
import SeasonSelector from "@/components/admin/SeasonSelector";
import CsvDownloadButton from "@/components/admin/CsvDownloadButton";
import FinancialsChart, {
  type ChartPoint,
} from "@/components/admin/FinancialsChart";

export const dynamic = "force-dynamic";

const DEFAULT_SEASON = "2025-26";

interface PaymentLite {
  amount_cents: number | null;
  status: string | null;
  season: string | null;
}

interface PlanLite {
  total_amount_cents: number | null;
  amount_paid_cents: number | null;
  season: string | null;
  created_at: string | null;
}

interface ExpenseLite {
  id: string;
  expense_date: string;
  category: string;
  description: string;
  amount_cents: number;
  tournament_id: string | null;
  season: string;
}

interface TournamentLite {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  season: string;
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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDateRange(
  start: string | null,
  end: string | null,
): string {
  if (!start && !end) return "Date TBD";
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt((start ?? end)!);
}

export default async function FinancialsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const seasonParam =
    typeof params.season === "string" ? params.season : null;

  const admin = getAdmin();
  if (!admin) {
    return (
      <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
        Supabase service-role env vars not configured.
      </div>
    );
  }

  // Build the season selector options from every table that owns season values.
  const [planSeasonsRes, paySeasonsRes, expSeasonsRes, tourSeasonsRes] =
    await Promise.all([
      admin.from("payment_plans").select("season"),
      admin.from("payments").select("season"),
      admin.from("expenses").select("season"),
      admin.from("tournaments").select("season"),
    ]);
  const seasonsSet = new Set<string>([DEFAULT_SEASON]);
  for (const r of planSeasonsRes.data ?? []) if (r.season) seasonsSet.add(r.season);
  for (const r of paySeasonsRes.data ?? []) if (r.season) seasonsSet.add(r.season);
  for (const r of expSeasonsRes.data ?? []) if (r.season) seasonsSet.add(r.season);
  for (const r of tourSeasonsRes.data ?? []) if (r.season) seasonsSet.add(r.season);
  const seasons = [...seasonsSet].sort();
  const season = seasonParam && seasonsSet.has(seasonParam) ? seasonParam : DEFAULT_SEASON;

  // Build the trailing-12-month window for the chart. Cuts off at the
  // first day of the month 11 calendar months ago so we always show a
  // complete 12-bucket strip (the current month is the rightmost).
  const now = new Date();
  const chartStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const chartStartIso = `${chartStart.getFullYear()}-${String(
    chartStart.getMonth() + 1,
  ).padStart(2, "0")}-01`;

  // P&L queries.
  // Per audit rule (h): sum payments.amount_cents (NOT payment_plans.amount_paid_cents)
  // to avoid double-counting pending Stripe sessions.
  const [
    paymentsRes,
    plansRes,
    expensesRes,
    tournamentsRes,
    chartPaymentsRes,
    chartExpensesRes,
  ] = await Promise.all([
    admin
      .from("payments")
      .select("amount_cents, status, season")
      .eq("season", season)
      .eq("status", "completed"),
    admin
      .from("payment_plans")
      .select("total_amount_cents, amount_paid_cents, season, created_at")
      .eq("season", season),
    admin
      .from("expenses")
      .select(
        "id, expense_date, category, description, amount_cents, tournament_id, season",
      )
      .eq("season", season)
      .eq("status", "active")
      .order("expense_date", { ascending: false }),
    admin
      .from("tournaments")
      .select("id, name, start_date, end_date, season")
      .eq("season", season),
    // Chart: cross-season, trailing 12 months. Filter on the column the
    // user cares about (payment_date / expense_date), not season.
    admin
      .from("payments")
      .select("amount_cents, payment_date")
      .eq("status", "completed")
      .gte("payment_date", chartStartIso),
    admin
      .from("expenses")
      .select("amount_cents, expense_date")
      .eq("status", "active")
      .gte("expense_date", chartStartIso),
  ]);

  const payments = (paymentsRes.data ?? []) as PaymentLite[];
  const plans = (plansRes.data ?? []) as PlanLite[];
  const expenses = (expensesRes.data ?? []) as ExpenseLite[];
  const tournaments = (tournamentsRes.data ?? []) as TournamentLite[];

  const revenueCollectedCents = payments.reduce(
    (s, p) => s + (p.amount_cents ?? 0),
    0,
  );
  const totalBilledCents = plans.reduce(
    (s, p) => s + (p.total_amount_cents ?? 0),
    0,
  );
  const outstandingCents = Math.max(0, totalBilledCents - revenueCollectedCents);
  const collectionRate =
    totalBilledCents > 0
      ? (revenueCollectedCents / totalBilledCents) * 100
      : 0;
  const totalExpensesCents = expenses.reduce(
    (s, e) => s + (e.amount_cents ?? 0),
    0,
  );
  const netCents = revenueCollectedCents - totalExpensesCents;

  // Group expenses by category.
  const byCategory = new Map<
    string,
    { cents: number; count: number }
  >();
  for (const e of expenses) {
    const prev = byCategory.get(e.category) ?? { cents: 0, count: 0 };
    prev.cents += e.amount_cents ?? 0;
    prev.count += 1;
    byCategory.set(e.category, prev);
  }
  const categoryRows = [...byCategory.entries()]
    .map(([cat, v]) => ({
      key: cat,
      cents: v.cents,
      count: v.count,
      meta: isExpenseCategory(cat)
        ? expenseCategoryMeta[cat as ExpenseCategory]
        : { text: cat, color: "#6B7280" },
    }))
    .sort((a, b) => b.cents - a.cents);

  // Group expenses by tournament (plus a "club-wide" bucket).
  const tournamentById = new Map<string, TournamentLite>();
  for (const t of tournaments) tournamentById.set(t.id, t);
  const byTournament = new Map<
    string,
    { cents: number; count: number; tournament: TournamentLite | null }
  >();
  byTournament.set("__club__", { cents: 0, count: 0, tournament: null });
  for (const e of expenses) {
    const key = e.tournament_id ?? "__club__";
    const cur = byTournament.get(key) ?? {
      cents: 0,
      count: 0,
      tournament: e.tournament_id ? (tournamentById.get(e.tournament_id) ?? null) : null,
    };
    cur.cents += e.amount_cents ?? 0;
    cur.count += 1;
    byTournament.set(key, cur);
  }
  const tournamentRows = [...byTournament.entries()]
    .filter(([key, v]) => key !== "__club__" || v.count > 0)
    .sort((a, b) => {
      if (a[0] === "__club__") return 1;
      if (b[0] === "__club__") return -1;
      return b[1].cents - a[1].cents;
    });

  const recent = expenses.slice(0, 10);

  // ── 12-month chart aggregation ─────────────────────────────────────────
  // Build 12 ChartPoints in chronological order (oldest → newest). Bucket
  // payments by month(payment_date), expenses by month(expense_date).
  const chartPayments = (chartPaymentsRes.data ?? []) as Array<{
    amount_cents: number | null;
    payment_date: string | null;
  }>;
  const chartExpenses = (chartExpensesRes.data ?? []) as Array<{
    amount_cents: number;
    expense_date: string;
  }>;

  const monthFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
  });
  const chartBuckets = new Map<
    string,
    { monthKey: string; monthLabel: string; revenue: number; expenses: number }
  >();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    // "Jun '25" — apostrophe form keeps the axis tick narrow.
    const label = monthFmt.format(d).replace(" ", " '");
    chartBuckets.set(key, {
      monthKey: key,
      monthLabel: label,
      revenue: 0,
      expenses: 0,
    });
  }
  function bucketKeyFromIso(iso: string): string | null {
    // Accepts both "YYYY-MM-DD" (expense_date) and full ISO timestamps
    // (payment_date). We need the first 7 chars in either case.
    if (typeof iso !== "string" || iso.length < 7) return null;
    return iso.slice(0, 7);
  }
  for (const p of chartPayments) {
    if (!p.payment_date) continue;
    const k = bucketKeyFromIso(p.payment_date);
    if (!k) continue;
    const b = chartBuckets.get(k);
    if (!b) continue;
    b.revenue += (p.amount_cents ?? 0) / 100;
  }
  for (const e of chartExpenses) {
    const k = bucketKeyFromIso(e.expense_date);
    if (!k) continue;
    const b = chartBuckets.get(k);
    if (!b) continue;
    b.expenses += (e.amount_cents ?? 0) / 100;
  }
  const chartData: ChartPoint[] = [...chartBuckets.values()];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
            P&amp;L · Season {season}
          </div>
          <h1 className="mt-1 text-[28px] md:text-[32px] font-bold tracking-tight text-[#0A0A0B]">
            Financials
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Revenue, expenses, net — live from the database.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CsvDownloadButton
            href={`/api/admin/financials/export?season=${encodeURIComponent(season)}`}
          />
          <SeasonSelector seasons={seasons} current={season} />
        </div>
      </header>

      {/* Section A — Top line */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BigStat
          label="Revenue Collected"
          value={formatDollars(revenueCollectedCents)}
          icon={<TrendingUp className="w-4 h-4" />}
          color="#34D399"
        />
        <BigStat
          label="Total Expenses"
          value={formatDollars(totalExpensesCents)}
          icon={<ArrowDownLeft className="w-4 h-4" />}
          color="#F59E0B"
        />
        <BigStat
          label="Net"
          value={formatDollars(netCents)}
          icon={<DollarSign className="w-4 h-4" />}
          color={netCents >= 0 ? "#34D399" : "#EF4444"}
        />
      </section>

      {/* 12-month trend chart — cross-season, sourced from payment_date /
          expense_date so it tells the story of the calendar year. */}
      <FinancialsChart data={chartData} />

      {/* Section B — Revenue detail */}
      <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 md:p-7">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
          Revenue Detail
        </div>
        <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-[#0A0A0B]">
          Billed vs collected
        </h2>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SmallStat label="Total Billed" value={formatDollars(totalBilledCents)} />
          <SmallStat label="Total Collected" value={formatDollars(revenueCollectedCents)} />
          <SmallStat
            label="Outstanding"
            value={formatDollars(outstandingCents)}
            tone={outstandingCents > 0 ? "negative" : "neutral"}
          />
          <SmallStat
            label="Collection Rate"
            value={formatPercent(collectionRate)}
          />
        </div>
      </section>

      {/* Section C — Expense breakdown by category */}
      <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-6 md:px-7 py-5 border-b border-[#E5E7EB]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
            Expenses by Category
          </div>
          <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-[#0A0A0B]">
            Where the money went
          </h2>
        </div>
        {categoryRows.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[#6B7280]">
            No expenses logged this season.
          </div>
        ) : (
          <ul className="divide-y divide-[#E5E7EB]">
            {categoryRows.map((r) => {
              const pct =
                totalExpensesCents > 0
                  ? (r.cents / totalExpensesCents) * 100
                  : 0;
              return (
                <li
                  key={r.key}
                  className="px-6 md:px-7 py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.08em] text-white shrink-0"
                      style={{ backgroundColor: r.meta.color }}
                    >
                      {r.meta.text}
                    </span>
                    <span className="text-[12px] text-[#6B7280] tabular-nums">
                      {r.count} {r.count === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <span className="text-[12px] text-[#6B7280] tabular-nums">
                      {pct.toFixed(1)}%
                    </span>
                    <span className="text-[#0A0A0B] font-semibold tabular-nums w-24 inline-block text-right">
                      {formatDollars(r.cents)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="px-6 md:px-7 py-3 bg-[#F8F9FA] border-t border-[#E5E7EB] flex items-center justify-between text-[12px]">
          <span className="text-[#6B7280]">Total expenses</span>
          <span className="font-semibold text-[#0A0A0B] tabular-nums">
            {formatDollars(totalExpensesCents)}
          </span>
        </div>
      </section>

      {/* Section D — Expense breakdown by tournament */}
      <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-6 md:px-7 py-5 border-b border-[#E5E7EB]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
            Expenses by Tournament
          </div>
          <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-[#0A0A0B]">
            Per-event spend
          </h2>
        </div>
        {tournamentRows.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[#6B7280]">
            No tournaments with logged expenses yet.
          </div>
        ) : (
          <ul className="divide-y divide-[#E5E7EB]">
            {tournamentRows.map(([key, v]) => {
              const isClub = key === "__club__";
              const t = v.tournament;
              return (
                <li
                  key={key}
                  className="px-6 md:px-7 py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    {isClub ? (
                      <span className="text-[14px] font-medium text-[#0A0A0B]">
                        Club-wide (no tournament)
                      </span>
                    ) : t ? (
                      <Link
                        href={`/admin/tournaments/${t.id}`}
                        className="text-[14px] font-medium text-[#0A0A0B] hover:text-[#4A90D9]"
                      >
                        {t.name}
                      </Link>
                    ) : (
                      <span className="text-[14px] font-medium text-[#6B7280]">
                        Unknown tournament
                      </span>
                    )}
                    {t && (
                      <div className="text-[11px] text-[#6B7280] mt-0.5">
                        {formatDateRange(t.start_date, t.end_date)}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[#0A0A0B] font-semibold tabular-nums">
                      {formatDollars(v.cents)}
                    </div>
                    <div className="text-[10px] text-[#6B7280] uppercase tracking-[0.08em]">
                      {v.count} {v.count === 1 ? "item" : "items"}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Section E — Recent activity */}
      <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-6 md:px-7 py-5 border-b border-[#E5E7EB]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
            Recent Activity
          </div>
          <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-[#0A0A0B]">
            Last {recent.length} expense{recent.length === 1 ? "" : "s"} logged
          </h2>
        </div>
        {recent.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[#6B7280]">
            Nothing logged yet.
          </div>
        ) : (
          <ul className="divide-y divide-[#E5E7EB]">
            {recent.map((e) => {
              const meta = isExpenseCategory(e.category)
                ? expenseCategoryMeta[e.category as ExpenseCategory]
                : { text: e.category, color: "#6B7280" };
              return (
                <li
                  key={e.id}
                  className="px-6 md:px-7 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/expenses/${e.id}`}
                      className="text-[13px] text-[#0A0A0B] hover:text-[#4A90D9] truncate block"
                    >
                      {e.description}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-[0.08em] text-white"
                        style={{ backgroundColor: meta.color }}
                      >
                        {meta.text}
                      </span>
                      <span className="text-[11px] text-[#6B7280] tabular-nums">
                        {new Date(`${e.expense_date}T12:00:00`).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" },
                        )}
                      </span>
                    </div>
                  </div>
                  <span className="text-[13px] text-[#0A0A0B] font-semibold tabular-nums">
                    {formatDollars(e.amount_cents)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function BigStat({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
      <div className="flex items-center justify-between text-[#6B7280]">
        <span className="text-sm">{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div
        className="mt-3 text-[32px] font-bold tabular-nums tracking-tight"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

function SmallStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "negative";
}) {
  const color = tone === "negative" ? "#EF4444" : "#0A0A0B";
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#6B7280]">
        {label}
      </div>
      <div
        className="mt-1 text-[18px] font-bold tabular-nums tracking-tight inline-flex items-center gap-1"
        style={{ color }}
      >
        {tone === "negative" && <AlertCircle className="w-3.5 h-3.5" />}
        {value}
      </div>
    </div>
  );
}
