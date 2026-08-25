import { Users, DollarSign, TrendingUp, Scale } from "lucide-react";
import RostersClient from "@/components/admin/rosters/RostersClient";
import { buildRosterData, getServiceClient } from "@/lib/rosters/data";
import { loadKpis, formatDollars } from "@/lib/admin-kpis";

export const dynamic = "force-dynamic";

/**
 * THE COMMAND CENTER. One page, one address: /admin.
 *
 * Until 2026-08-25 this address served a 244-line landing page — four KPI cards
 * and an "Add a Player" button — while the actual working instrument lived at
 * /admin/rosters. Two surfaces, two levels of finish, and no signpost between
 * them: you could land on the front door and never learn the house was behind
 * it. That split is gone. /admin IS the roster now, and /admin/rosters
 * permanently redirects here so no old link or bookmark breaks.
 *
 * The KPI numbers survived the merge — they sit as a strip above the roster
 * rather than occupying a page of their own, and their arithmetic is unchanged
 * (see src/lib/admin-kpis.ts).
 *
 * Everything the club runs on gets added HERE, to this page or as a section of
 * it. Resist adding a new top-level admin route: that is exactly how the split
 * this replaced came about.
 */
export default async function AdminHomePage() {
  const supabase = getServiceClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
        Server is missing its database keys — the roster can&apos;t load.
      </div>
    );
  }

  // The roster is the page, so it loads first and its failure is the page's
  // failure. KPIs are a garnish: if they throw, the roster still renders.
  let data: Awaited<ReturnType<typeof buildRosterData>> | null = null;
  let message = "Unknown error.";
  try {
    data = await buildRosterData(supabase);
  } catch (e) {
    if (e instanceof Error) message = e.message;
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
        Couldn&apos;t load the roster: {message}
      </div>
    );
  }

  const kpis = await loadKpis().catch(() => null);
  const net = kpis ? kpis.revenueCollectedCents - kpis.totalExpensesCents : 0;

  return (
    <div className="space-y-6">
      {kpis?.envOk && (
        <section
          aria-label="Season snapshot"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <Kpi
            label="Active Players"
            value={kpis.activePlayers.toLocaleString("en-US")}
            icon={<Users className="w-3.5 h-3.5" />}
          />
          <Kpi
            label="Billed"
            value={kpis.season ? formatDollars(kpis.totalBilledCents) : "—"}
            icon={<DollarSign className="w-3.5 h-3.5" />}
            sub={kpis.season ?? undefined}
          />
          <Kpi
            label="Collected"
            value={kpis.season ? formatDollars(kpis.totalCollectedCents) : "—"}
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            sub={kpis.season ?? undefined}
          />
          <Kpi
            label="Net Position"
            value={kpis.season ? formatDollars(net) : "—"}
            icon={<Scale className="w-3.5 h-3.5" />}
            sub={kpis.season ? "revenue − expenses" : undefined}
            accent={net >= 0 ? "#34D399" : "#EF4444"}
          />
        </section>
      )}

      <RostersClient initial={data} />
    </div>
  );
}

/** Compact KPI tile. Deliberately smaller than the roster it sits above. */
function Kpi({
  label,
  value,
  icon,
  sub,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl bg-white shadow-[0_1px_6px_rgba(0,0,0,0.05)] px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#6B7280]">
        {icon}
        {label}
      </div>
      <div
        className="mt-1 text-[20px] font-bold tracking-tight tabular-nums"
        style={{ color: accent ?? "#0A0A0B" }}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-[#9CA3AF]">{sub}</div>}
    </div>
  );
}
