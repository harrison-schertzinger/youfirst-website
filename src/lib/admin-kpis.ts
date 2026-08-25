/**
 * Command Center KPI snapshot.
 *
 * Lifted verbatim out of the old /admin dashboard page on 2026-08-25 when that
 * page was replaced by the roster. The arithmetic is unchanged — including the
 * "current season is whichever plan row was created most recently" rule and the
 * Net Position calculation that /admin/financials mirrors — so the numbers on
 * screen do not move as a side effect of the merge.
 */

import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export interface KpiSnapshot {
  activePlayers: number;
  totalBilledCents: number;
  totalCollectedCents: number;
  totalExpensesCents: number;
  revenueCollectedCents: number;
  season: string | null;
  envOk: boolean;
}

export async function loadKpis(): Promise<KpiSnapshot> {
  const admin = getAdminClient();
  if (!admin) {
    return {
      activePlayers: 0,
      totalBilledCents: 0,
      totalCollectedCents: 0,
      totalExpensesCents: 0,
      revenueCollectedCents: 0,
      season: null,
      envOk: false,
    };
  }

  // Active player count via HEAD + exact count — zero row payload.
  const playersRes = await admin
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  // Pull every plan row's (season, totals, created_at) once. Supabase JS
  // doesn't expose GROUP BY + MAX without an RPC, so we determine the
  // "current season" client-side: the season whose newest row has the
  // most recent created_at wins. With ~60 rows the cost is negligible.
  // Ordering by created_at desc gives us a deterministic tie-break: two
  // rows with identical created_at would otherwise resolve in row-insert
  // order, which Postgres does not guarantee.
  const plansRes = await admin
    .from("payment_plans")
    .select("season, total_amount_cents, amount_paid_cents, created_at")
    .order("created_at", { ascending: false });

  let mostRecentSeason: string | null = null;
  let mostRecentCreatedAt = "";
  for (const row of plansRes.data ?? []) {
    if (!row.season) continue;
    const createdAt = row.created_at ?? "";
    if (createdAt > mostRecentCreatedAt) {
      mostRecentCreatedAt = createdAt;
      mostRecentSeason = row.season;
    }
  }

  let totalBilledCents = 0;
  let totalCollectedCents = 0;
  if (mostRecentSeason) {
    for (const row of plansRes.data ?? []) {
      if (row.season === mostRecentSeason) {
        totalBilledCents += row.total_amount_cents ?? 0;
        totalCollectedCents += row.amount_paid_cents ?? 0;
      }
    }
  }

  // Net Position: revenue collected (from payments, not plans) minus
  // active expenses, both filtered to the current season. Matches the
  // /admin/financials computation so the two surfaces agree.
  let revenueCollectedCents = 0;
  let totalExpensesCents = 0;
  if (mostRecentSeason) {
    const [paymentsRes, expensesRes] = await Promise.all([
      admin
        .from("payments")
        .select("amount_cents")
        .eq("season", mostRecentSeason)
        .eq("status", "completed"),
      admin
        .from("expenses")
        .select("amount_cents")
        .eq("season", mostRecentSeason)
        .eq("status", "active"),
    ]);
    for (const r of paymentsRes.data ?? []) {
      revenueCollectedCents += r.amount_cents ?? 0;
    }
    for (const r of expensesRes.data ?? []) {
      totalExpensesCents += r.amount_cents ?? 0;
    }
  }

  return {
    activePlayers: playersRes.count ?? 0,
    totalBilledCents,
    totalCollectedCents,
    totalExpensesCents,
    revenueCollectedCents,
    season: mostRecentSeason,
    envOk: true,
  };
}
