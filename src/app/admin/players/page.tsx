import Link from "next/link";
import { CURRENT_SEASON } from "@/lib/fee-schedule";
import { ROSTER_STATUSES } from "@/lib/player-status";
import { createClient } from "@supabase/supabase-js";
import { Plus, Check } from "lucide-react";
import {
  inferPlayerSource,
  type SourceLabel,
} from "@/lib/player-source";
import PlayerRosterTiles, {
  type TileYearBlock,
} from "@/components/admin/PlayerRosterTiles";
import PlayerRosterSpreadsheet, {
  type SpreadsheetRow,
} from "@/components/admin/PlayerRosterSpreadsheet";
import PlayersViewToggle from "@/components/admin/PlayersViewToggle";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerRow {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  position: string | null;
  jersey_number: string | null;
  school: string | null;
  status: string;
  photo_url: string | null;
  created_at: string | null;
}

interface PlanRow {
  player_id: string;
  total_amount_cents: number | null;
  amount_paid_cents: number | null;
  created_at: string | null;
}

interface PaymentRow {
  player_id: string;
  payment_method: string | null;
  created_at: string | null;
}

interface ComputedRow {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  position: string | null;
  jersey_number: string | null;
  school: string | null;
  source: SourceLabel;
  billed_cents: number;
  collected_cents: number;
  balance_cents: number;
  /** Still owed for any season that is not the current one. */
  prior_balance_cents: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function loadRoster(): Promise<{
  rows: ComputedRow[];
  totalPlayers: number;
  classCount: number;
  envOk: boolean;
}> {
  const admin = getAdminClient();
  if (!admin) {
    return { rows: [], totalPlayers: 0, classCount: 0, envOk: false };
  }

  const [playersRes, seasonBalancesRes, paymentsRes] = await Promise.all([
    admin
      .from("players")
      .select(
        "id, first_name, last_name, graduation_year, position, jersey_number, school, status, photo_url, created_at",
      )
      .in("status", ROSTER_STATUSES as unknown as string[]),
    admin.rpc("player_season_balances"),
    admin
      .from("payments")
      .select("player_id, payment_method, created_at"),
  ]);

  if (playersRes.error || !playersRes.data) {
    console.error("[admin/players] fetch failed:", playersRes.error);
    return { rows: [], totalPlayers: 0, classCount: 0, envOk: true };
  }

  // Money comes from player_season_balances(), keyed by season.
  //
  // It used to come from the most recent plan row and plan.amount_paid_cents.
  // Both were wrong once two seasons existed: "most recent" silently became
  // 2026-27 with no label, so a column headed "Balance" showed this season for
  // some athletes and last season for others. And amount_paid_cents is the
  // column the April 2026 import set to a flat value — truth is money received,
  // never a counter on the plan.
  type SeasonRow = {
    player_id: string;
    season: string;
    charged_cents: number;
    paid_cents: number;
    adjustment_cents: number;
    remaining_cents: number;
  };
  const bySeason = new Map<string, Map<string, SeasonRow>>();
  for (const row of (seasonBalancesRes.data ?? []) as SeasonRow[]) {
    const forPlayer = bySeason.get(row.player_id) ?? new Map<string, SeasonRow>();
    forPlayer.set(row.season, row);
    bySeason.set(row.player_id, forPlayer);
  }

  const paymentsByPlayer = new Map<string, PaymentRow[]>();
  for (const pay of (paymentsRes.data ?? []) as PaymentRow[]) {
    const list = paymentsByPlayer.get(pay.player_id) ?? [];
    list.push(pay);
    paymentsByPlayer.set(pay.player_id, list);
  }

  const rows: ComputedRow[] = (playersRes.data as PlayerRow[]).map((p) => {
    const seasons = bySeason.get(p.id);
    const current = seasons?.get(CURRENT_SEASON);
    const billed = current?.charged_cents ?? 0;
    const collected = current?.paid_cents ?? 0;
    const balance = current?.remaining_cents ?? 0;
    // Anything still owed for a season that is not the current one. Shown in
    // its own column so last year's debt is never mistaken for this year's.
    let priorBalance = 0;
    for (const [season, row] of seasons ?? []) {
      if (season !== CURRENT_SEASON) priorBalance += row.remaining_cents ?? 0;
    }
    const source = inferPlayerSource(
      { created_at: p.created_at, photo_url: p.photo_url, status: p.status },
      (paymentsByPlayer.get(p.id) ?? []).map((pay) => ({
        payment_method: pay.payment_method,
        created_at: pay.created_at,
      })),
    );
    return {
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      graduation_year: p.graduation_year,
      position: p.position,
      jersey_number: p.jersey_number,
      school: p.school,
      source,
      billed_cents: billed,
      collected_cents: collected,
      balance_cents: balance,
      prior_balance_cents: priorBalance,
    };
  });

  const distinctYears = new Set(rows.map((r) => r.graduation_year ?? "unknown"));

  return {
    rows,
    totalPlayers: rows.length,
    classCount: distinctYears.size,
    envOk: true,
  };
}

function groupByYear(rows: ComputedRow[]): TileYearBlock[] {
  const byYearMap = new Map<string, ComputedRow[]>();
  const yearByKey = new Map<string, number | null>();
  for (const r of rows) {
    const key = r.graduation_year != null ? String(r.graduation_year) : "unknown";
    yearByKey.set(key, r.graduation_year);
    const bucket = byYearMap.get(key) ?? [];
    bucket.push(r);
    byYearMap.set(key, bucket);
  }
  for (const bucket of byYearMap.values()) {
    bucket.sort((a, b) => a.last_name.localeCompare(b.last_name));
  }
  const keys = [...byYearMap.keys()].sort((a, b) => {
    if (a === "unknown") return 1;
    if (b === "unknown") return -1;
    return Number(a) - Number(b);
  });
  return keys.map((k) => ({
    year: yearByKey.get(k) ?? null,
    rows: byYearMap.get(k) ?? [],
  }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PlayersRosterPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const archived =
    typeof params.archived === "string" ? params.archived : null;
  const viewParam =
    typeof params.view === "string" ? params.view : null;
  const view: "tiles" | "spreadsheet" =
    viewParam === "spreadsheet" ? "spreadsheet" : "tiles";

  const { rows, totalPlayers, classCount, envOk } = await loadRoster();

  return (
    <div className="space-y-8">
      {archived && (
        <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-5 py-4 flex items-start gap-3">
          <span
            className="mt-0.5 inline-flex w-6 h-6 rounded-full items-center justify-center bg-[#34D399]/10 text-[#34D399] shrink-0"
            aria-hidden
          >
            <Check className="w-3.5 h-3.5" />
          </span>
          <div className="text-sm text-[#0A0A0B]">
            <span className="font-semibold">{archived}</span> archived. They no
            longer appear in the active roster.
          </div>
        </div>
      )}

      {/* Page header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
            You. First Elite Lacrosse
          </div>
          <h1 className="mt-1 text-[26px] md:text-[28px] font-bold tracking-tight text-[#0A0A0B]">
            Player Roster
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            {envOk
              ? `${totalPlayers} active player${totalPlayers === 1 ? "" : "s"} across ${classCount} class${classCount === 1 ? "" : "es"}`
              : "Roster unavailable — Supabase service-role env vars missing."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PlayersViewToggle current={view} />
          <Link
            href="/admin/players/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Player
          </Link>
        </div>
      </header>

      {!envOk ? null : rows.length === 0 ? (
        <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-10 text-center text-sm text-[#6B7280]">
          No active players yet. Click Add Player to create the first roster entry.
        </div>
      ) : view === "tiles" ? (
        <PlayerRosterTiles byYear={groupByYear(rows)} />
      ) : (
        <PlayerRosterSpreadsheet rows={rows as SpreadsheetRow[]} />
      )}
    </div>
  );
}
