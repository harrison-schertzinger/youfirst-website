import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Users, DollarSign, TrendingUp, ArrowRight, Scale } from "lucide-react";

export const dynamic = "force-dynamic";

function getAdminClient() {
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

interface KpiSnapshot {
  activePlayers: number;
  totalBilledCents: number;
  totalCollectedCents: number;
  totalExpensesCents: number;
  revenueCollectedCents: number;
  season: string | null;
  envOk: boolean;
}

async function loadKpis(): Promise<KpiSnapshot> {
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

export default async function AdminHomePage() {
  const kpis = await loadKpis();

  return (
    <div className="space-y-10">
      {/* Page header */}
      <header>
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
          You. First Elite Lacrosse
        </div>
        <h1 className="mt-1 text-[28px] md:text-[32px] font-bold tracking-tight text-[#0A0A0B]">
          Command Center
        </h1>
        <p className="mt-1 text-sm text-[#6B7280] max-w-xl">
          Roster snapshot, payment health, and admin actions for the{" "}
          {kpis.season ?? "current"} season.
        </p>
      </header>

      {!kpis.envOk && (
        <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-5 py-4 text-sm text-[#EF4444]">
          Supabase service-role env vars not configured. KPIs unavailable.
        </div>
      )}

      {/* KPI cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active Players"
          value={kpis.activePlayers.toLocaleString("en-US")}
          icon={<Users className="w-4 h-4" />}
        />
        <KpiCard
          label="Total Billed"
          value={kpis.season ? formatDollars(kpis.totalBilledCents) : "—"}
          icon={<DollarSign className="w-4 h-4" />}
          sub={kpis.season ? `Season ${kpis.season}` : "No active season"}
        />
        <KpiCard
          label="Total Collected"
          value={kpis.season ? formatDollars(kpis.totalCollectedCents) : "—"}
          icon={<TrendingUp className="w-4 h-4" />}
          sub={kpis.season ? `Season ${kpis.season}` : "No active season"}
        />
        {(() => {
          const net = kpis.revenueCollectedCents - kpis.totalExpensesCents;
          const positive = net >= 0;
          return (
            <KpiCard
              label="Net Position"
              value={kpis.season ? formatDollars(net) : "—"}
              icon={<Scale className="w-4 h-4" />}
              sub={
                kpis.season
                  ? `Season ${kpis.season} · revenue − expenses`
                  : "No active season"
              }
              accent={positive ? "#34D399" : "#EF4444"}
            />
          );
        })()}
      </section>

      {/* CTA: Add a Player */}
      <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div>
          <h2 className="text-[18px] font-semibold tracking-tight text-[#0A0A0B]">
            Add a Player
          </h2>
          <p className="mt-1 text-sm text-[#6B7280] max-w-md">
            Create a player profile and send a parent their invite link.
          </p>
        </div>
        <Link
          href="/admin/players/new"
          className="self-start md:self-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] transition-colors shadow-sm"
        >
          New Player
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  /** Optional override for the headline value color. Defaults to #0A0A0B. */
  accent?: string;
}) {
  return (
    <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
      <div className="flex items-center justify-between text-[#6B7280]">
        <span className="text-sm">{label}</span>
        <span style={{ color: accent ?? "#4A90D9" }}>{icon}</span>
      </div>
      <div
        className="mt-3 text-[28px] font-bold tabular-nums tracking-tight"
        style={{ color: accent ?? "#0A0A0B" }}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#6B7280]">
          {sub}
        </div>
      )}
    </div>
  );
}
