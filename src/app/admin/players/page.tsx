import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Plus, Check } from "lucide-react";
import {
  inferPlayerSource,
  sourceLabels,
  type SourceLabel,
} from "@/lib/player-source";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerRow {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  position: string | null;
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

interface CardRow {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  source: SourceLabel;
  billed_cents: number;
  collected_cents: number;
  balance_cents: number;
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

function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

async function loadRoster(): Promise<{
  byYear: Array<{ year: number | null; rows: CardRow[] }>;
  totalPlayers: number;
  classCount: number;
  envOk: boolean;
}> {
  const admin = getAdminClient();
  if (!admin) {
    return { byYear: [], totalPlayers: 0, classCount: 0, envOk: false };
  }

  const [playersRes, plansRes, paymentsRes] = await Promise.all([
    admin
      .from("players")
      .select(
        "id, first_name, last_name, graduation_year, position, status, photo_url, created_at",
      )
      .eq("status", "active"),
    admin
      .from("payment_plans")
      .select("player_id, total_amount_cents, amount_paid_cents, created_at"),
    admin
      .from("payments")
      .select("player_id, payment_method, created_at"),
  ]);

  if (playersRes.error || !playersRes.data) {
    console.error("[admin/players] fetch failed:", playersRes.error);
    return { byYear: [], totalPlayers: 0, classCount: 0, envOk: true };
  }

  // Most-recent plan per player (matches the portal's order-by-created_at desc).
  const latestPlanByPlayer = new Map<string, PlanRow>();
  for (const plan of (plansRes.data ?? []) as PlanRow[]) {
    const prev = latestPlanByPlayer.get(plan.player_id);
    if (!prev || (plan.created_at ?? "") > (prev.created_at ?? "")) {
      latestPlanByPlayer.set(plan.player_id, plan);
    }
  }

  // Payments per player (small dataset; one pass is fine).
  const paymentsByPlayer = new Map<string, PaymentRow[]>();
  for (const pay of (paymentsRes.data ?? []) as PaymentRow[]) {
    const list = paymentsByPlayer.get(pay.player_id) ?? [];
    list.push(pay);
    paymentsByPlayer.set(pay.player_id, list);
  }

  const rows: CardRow[] = (playersRes.data as PlayerRow[]).map((p) => {
    const plan = latestPlanByPlayer.get(p.id);
    const billed = plan?.total_amount_cents ?? 0;
    const collected = plan?.amount_paid_cents ?? 0;
    const balance = Math.max(0, billed - collected);
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
      position: p.position,
      source,
      billed_cents: billed,
      collected_cents: collected,
      balance_cents: balance,
    };
  });

  // Group by grad year, sort years ascending; "unknown" goes last.
  const byYearMap = new Map<string, CardRow[]>();
  const yearByKey = new Map<string, number | null>();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const grad = (playersRes.data as PlayerRow[])[i].graduation_year;
    const key = grad != null ? String(grad) : "unknown";
    yearByKey.set(key, grad);
    const bucket = byYearMap.get(key) ?? [];
    bucket.push(r);
    byYearMap.set(key, bucket);
  }
  // Sort each bucket by last name asc.
  for (const bucket of byYearMap.values()) {
    bucket.sort((a, b) => a.last_name.localeCompare(b.last_name));
  }
  const keys = [...byYearMap.keys()].sort((a, b) => {
    if (a === "unknown") return 1;
    if (b === "unknown") return -1;
    return Number(a) - Number(b);
  });

  const byYear = keys.map((k) => ({
    year: yearByKey.get(k) ?? null,
    rows: byYearMap.get(k) ?? [],
  }));

  return {
    byYear,
    totalPlayers: rows.length,
    classCount: byYear.length,
    envOk: true,
  };
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

  const { byYear, totalPlayers, classCount, envOk } = await loadRoster();

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
        <Link
          href="/admin/players/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Player
        </Link>
      </header>

      {/* Team blocks */}
      {byYear.length === 0 && envOk && (
        <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-10 text-center text-sm text-[#6B7280]">
          No active players yet. Click Add Player to create the first roster entry.
        </div>
      )}

      {byYear.map((block) => (
        <section
          key={block.year ?? "unknown"}
          className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden"
        >
          <header className="flex items-center justify-between px-6 md:px-7 py-5 border-b border-[#E5E7EB]">
            <h2 className="text-[17px] font-semibold tracking-tight text-[#0A0A0B]">
              {block.year != null ? `Class of ${block.year}` : "Class — Unknown"}
            </h2>
            <span className="text-[11px] uppercase tracking-[0.12em] text-[#6B7280] tabular-nums">
              {block.rows.length} player{block.rows.length === 1 ? "" : "s"}
            </span>
          </header>
          <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {block.rows.map((p) => (
              <PlayerTile key={p.id} player={p} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── Player tile ──────────────────────────────────────────────────────────────

function PlayerTile({ player }: { player: CardRow }) {
  const source = sourceLabels[player.source];
  const outstanding = player.balance_cents > 0;
  return (
    <Link
      href={`/admin/players/${player.id}`}
      className="block rounded-xl border border-[#E5E7EB] bg-white p-4 hover:border-[#4A90D9]/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-medium text-[#0A0A0B] truncate">
            {player.first_name} {player.last_name}
          </div>
          <div className="mt-0.5 text-[12px] text-[#6B7280]">
            {player.position ?? "—"}
          </div>
        </div>
        <SourceBadge color={source.color} text={source.text} />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
        <BalanceCell label="Billed" value={formatDollars(player.billed_cents)} />
        <BalanceCell label="Collected" value={formatDollars(player.collected_cents)} />
        <BalanceCell
          label="Balance"
          value={formatDollars(player.balance_cents)}
          tone={outstanding ? "negative" : "positive"}
        />
      </dl>
    </Link>
  );
}

function SourceBadge({ color, text }: { color: string; text: string }) {
  return (
    <span
      className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em]"
      style={{ color }}
      title={text}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="hidden sm:inline">{text}</span>
    </span>
  );
}

function BalanceCell({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const color =
    tone === "negative"
      ? "#EF4444"
      : tone === "positive"
        ? "#34D399"
        : "#0A0A0B";
  return (
    <div>
      <dt className="text-[#6B7280] uppercase tracking-[0.08em]">{label}</dt>
      <dd
        className="mt-0.5 font-semibold tabular-nums"
        style={{ color }}
      >
        {value}
      </dd>
    </div>
  );
}
