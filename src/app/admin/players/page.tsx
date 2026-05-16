import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

interface PlayerRow {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  position: string | null;
  status: string;
  total_billed_cents: number;
  total_paid_cents: number;
}

function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function loadRoster(): Promise<{
  rows: PlayerRow[];
  envOk: boolean;
}> {
  const admin = getAdminClient();
  if (!admin) return { rows: [], envOk: false };

  const [playersRes, plansRes] = await Promise.all([
    admin
      .from("players")
      .select("id, first_name, last_name, graduation_year, position, status")
      .eq("status", "active"),
    admin
      .from("payment_plans")
      .select(
        "player_id, total_amount_cents, amount_paid_cents, created_at",
      ),
  ]);

  if (playersRes.error || !playersRes.data) {
    console.error("[admin/players] roster fetch failed:", playersRes.error);
    return { rows: [], envOk: true };
  }

  // Pick the most-recent payment plan per player (mirrors the parent
  // portal's `.limit(1).order(created_at desc)` rule).
  const latestPlanByPlayer = new Map<
    string,
    { total: number; paid: number; createdAt: string }
  >();
  for (const plan of plansRes.data ?? []) {
    const prev = latestPlanByPlayer.get(plan.player_id);
    if (!prev || (plan.created_at ?? "") > prev.createdAt) {
      latestPlanByPlayer.set(plan.player_id, {
        total: plan.total_amount_cents ?? 0,
        paid: plan.amount_paid_cents ?? 0,
        createdAt: plan.created_at ?? "",
      });
    }
  }

  const rows: PlayerRow[] = playersRes.data
    .map((p) => {
      const plan = latestPlanByPlayer.get(p.id);
      return {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        graduation_year: p.graduation_year,
        position: p.position,
        status: p.status,
        total_billed_cents: plan?.total ?? 0,
        total_paid_cents: plan?.paid ?? 0,
      };
    })
    .sort((a, b) => {
      // Grad year ascending (older classes first), then last name.
      const ay = a.graduation_year ?? 9999;
      const by = b.graduation_year ?? 9999;
      if (ay !== by) return ay - by;
      return a.last_name.localeCompare(b.last_name);
    });

  return { rows, envOk: true };
}

export default async function PlayersRosterPage() {
  const { rows, envOk } = await loadRoster();

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
            You. First Elite Lacrosse
          </div>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight text-[#0A0A0B]">
            Player Roster
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            {envOk
              ? `${rows.length} active player${rows.length === 1 ? "" : "s"}`
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

      {/* Roster table */}
      <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA]">
                <Th className="text-left">Player</Th>
                <Th className="text-left hidden sm:table-cell">Class</Th>
                <Th className="text-left hidden md:table-cell">Position</Th>
                <Th className="text-right">Billed</Th>
                <Th className="text-right">Collected</Th>
                <Th className="text-right">Balance</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-[#6B7280]"
                  >
                    {envOk
                      ? "No active players yet. Click Add Player to create the first roster entry."
                      : "Configure Supabase env vars to view the roster."}
                  </td>
                </tr>
              )}
              {rows.map((p) => {
                const balance = Math.max(
                  0,
                  p.total_billed_cents - p.total_paid_cents,
                );
                const outstanding = balance > 0;
                return (
                  <tr
                    key={p.id}
                    className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F8F9FA] transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-[#0A0A0B]">
                        {p.first_name} {p.last_name}
                      </div>
                      <div className="sm:hidden mt-0.5 text-[11px] text-[#6B7280]">
                        {p.graduation_year ?? "—"}
                        {p.position ? ` · ${p.position}` : ""}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-5 py-3.5 text-[#6B7280] tabular-nums">
                      {p.graduation_year ?? "—"}
                    </td>
                    <td className="hidden md:table-cell px-5 py-3.5 text-[#6B7280]">
                      {p.position ?? (
                        <span className="text-[#6B7280]/60">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-[#0A0A0B]">
                      {formatDollars(p.total_billed_cents)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-[#0A0A0B]">
                      {formatDollars(p.total_paid_cents)}
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right tabular-nums font-semibold ${
                        outstanding ? "text-[#EF4444]" : "text-[#6B7280]"
                      }`}
                    >
                      {formatDollars(balance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
        "px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </th>
  );
}
