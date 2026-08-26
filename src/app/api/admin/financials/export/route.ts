import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { rowsToCsv, localDateStamp } from "@/lib/csv";
import {
  expenseCategoryMeta,
  isExpenseCategory,
  type ExpenseCategory,
} from "@/lib/expense-categories";
import type { PlayerBalanceRow } from "@/lib/portal-balance";

export const dynamic = "force-dynamic";

// The season financials opens on. 2026-27 is the live one now; last season is
// still one click away in the selector and its numbers are unchanged.
const DEFAULT_SEASON = "2026-27";

interface PaymentLite {
  amount_cents: number | null;
}
interface ExpenseLite {
  category: string;
  amount_cents: number;
  tournament_id: string | null;
}
interface TournamentLite {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
}

function fmtDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const season = request.nextUrl.searchParams.get("season") ?? DEFAULT_SEASON;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Service-role env vars not configured." },
      { status: 500 },
    );
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Billed/Outstanding/Rate come from player_season_balances() — season-scoped,
  // the portal, checkout and collections email read. This export previously
  // repeated the financials page's lie ($0.00 outstanding) in the CSV
  // Kathleen downloads.
  const [paymentsRes, balancesRes, expensesRes, tournamentsRes] = await Promise.all([
    admin
      .from("payments")
      .select("amount_cents")
      .eq("season", season)
      .eq("status", "completed"),
        // player_season_balances, NOT player_balances: the latter returns only the
    // most recent plan per player, so the moment 2026-27 plans existed a
    // 2025-26 view lost the 49 families who moved on and reported a fraction of
    // what was billed. This returns every season and the filter below picks one.
    admin.rpc("player_season_balances"),
    admin
      .from("expenses")
      .select("category, amount_cents, tournament_id")
      .eq("season", season)
      .eq("status", "active"),
    admin
      .from("tournaments")
      .select("id, name, start_date, end_date")
      .eq("season", season),
  ]);

  const payments = (paymentsRes.data ?? []) as PaymentLite[];
  const balances = ((balancesRes.data ?? []) as PlayerBalanceRow[]).filter(
    (b) => b.season === season,
  );
  const expenses = (expensesRes.data ?? []) as ExpenseLite[];
  const tournaments = (tournamentsRes.data ?? []) as TournamentLite[];

  const revenueCents = payments.reduce(
    (s, p) => s + (p.amount_cents ?? 0),
    0,
  );
  const billedCents = balances.reduce(
    (s, b) => s + (b.charged_cents ?? 0) - (b.adjustment_cents ?? 0),
    0,
  );
  const summerCollectedCents = balances.reduce(
    (s, b) => s + (b.paid_cents ?? 0),
    0,
  );
  const outstandingCents = balances.reduce(
    (s, b) => s + (b.remaining_cents ?? 0),
    0,
  );
  const collectionRate =
    billedCents > 0 ? (summerCollectedCents / billedCents) * 100 : 0;
  const expenseCents = expenses.reduce((s, e) => s + (e.amount_cents ?? 0), 0);
  const netCents = revenueCents - expenseCents;

  // ── By category ─────────────────────────────────────────────────────────
  const byCategory = new Map<string, { cents: number; count: number }>();
  for (const e of expenses) {
    const prev = byCategory.get(e.category) ?? { cents: 0, count: 0 };
    prev.cents += e.amount_cents ?? 0;
    prev.count += 1;
    byCategory.set(e.category, prev);
  }
  const categoryRows = [...byCategory.entries()]
    .map(([cat, v]) => ({
      key: cat,
      label: isExpenseCategory(cat)
        ? expenseCategoryMeta[cat as ExpenseCategory].text
        : cat,
      cents: v.cents,
      count: v.count,
    }))
    .sort((a, b) => b.cents - a.cents);

  // ── By tournament ───────────────────────────────────────────────────────
  const tourById = new Map<string, TournamentLite>();
  for (const t of tournaments) tourById.set(t.id, t);
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
      tournament: e.tournament_id ? (tourById.get(e.tournament_id) ?? null) : null,
    };
    cur.cents += e.amount_cents ?? 0;
    cur.count += 1;
    byTournament.set(key, cur);
  }
  const tournamentRows = [...byTournament.entries()]
    .filter(([k, v]) => k !== "__club__" || v.count > 0)
    .sort((a, b) => {
      if (a[0] === "__club__") return 1;
      if (b[0] === "__club__") return -1;
      return b[1].cents - a[1].cents;
    });

  // ── CSV body ────────────────────────────────────────────────────────────
  const rows: string[][] = [];

  rows.push([`Financials — Season ${season}`]);
  rows.push([`Generated`, new Date().toISOString()]);
  rows.push([]);

  rows.push(["Section 1: Revenue Summary"]);
  rows.push(["Metric", "Value"]);
  rows.push(["Summer Billed (net of adjustments)", `$${fmtDollars(billedCents)}`]);
  rows.push(["Summer Collected", `$${fmtDollars(summerCollectedCents)}`]);
  rows.push(["Revenue Collected (all categories)", `$${fmtDollars(revenueCents)}`]);
  rows.push(["Outstanding", `$${fmtDollars(outstandingCents)}`]);
  rows.push(["Collection Rate", `${collectionRate.toFixed(1)}%`]);
  rows.push([]);

  rows.push(["Section 2: Expenses by Category"]);
  rows.push(["Category", "Total ($)", "Count", "% of Total"]);
  for (const r of categoryRows) {
    const pct = expenseCents > 0 ? (r.cents / expenseCents) * 100 : 0;
    rows.push([
      r.label,
      fmtDollars(r.cents),
      String(r.count),
      pct.toFixed(1) + "%",
    ]);
  }
  rows.push(["Total expenses", fmtDollars(expenseCents), "", ""]);
  rows.push([]);

  rows.push(["Section 3: Expenses by Tournament"]);
  rows.push(["Tournament", "Dates", "Total ($)", "Count"]);
  for (const [key, v] of tournamentRows) {
    const isClub = key === "__club__";
    const name = isClub ? "Club-wide (no tournament)" : (v.tournament?.name ?? "Unknown");
    let dates = "";
    if (v.tournament) {
      const start = v.tournament.start_date ?? "";
      const end = v.tournament.end_date ?? "";
      dates = start && end ? `${start} → ${end}` : start || end || "";
    }
    rows.push([name, dates, fmtDollars(v.cents), String(v.count)]);
  }
  rows.push([]);

  rows.push(["Section 4: Net Position"]);
  rows.push(["Revenue Collected", `$${fmtDollars(revenueCents)}`]);
  rows.push(["Total Expenses", `$${fmtDollars(expenseCents)}`]);
  rows.push(["Net", `$${fmtDollars(netCents)}`]);

  const csv = rowsToCsv(rows);
  const filename = `financials-${season}-${localDateStamp()}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
