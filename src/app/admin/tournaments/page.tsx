import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

interface TournamentRow {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
}

interface ExpenseLite {
  tournament_id: string | null;
  amount_cents: number;
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

function formatDateRange(
  start: string | null,
  end: string | null,
): string {
  if (!start && !end) return "Date TBD";
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt((start ?? end)!);
}

const STATUS_COLOR: Record<string, string> = {
  active: "#4A90D9",
  cancelled: "#EF4444",
  completed: "#34D399",
};

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const showAll = params.status === "all";

  const admin = getAdmin();
  if (!admin) {
    return (
      <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
        Supabase service-role env vars not configured.
      </div>
    );
  }

  let tQ = admin
    .from("tournaments")
    .select("id, name, location, start_date, end_date, status")
    .order("start_date", { ascending: true, nullsFirst: false });
  if (!showAll) tQ = tQ.eq("status", "active");

  const [tRes, eRes] = await Promise.all([
    tQ,
    admin
      .from("expenses")
      .select("tournament_id, amount_cents")
      .eq("status", "active")
      .not("tournament_id", "is", null),
  ]);

  const tournaments = (tRes.data ?? []) as TournamentRow[];
  const expenses = (eRes.data ?? []) as ExpenseLite[];

  // Sum expenses per tournament.
  const totalsByTournament = new Map<string, { cents: number; count: number }>();
  for (const e of expenses) {
    if (!e.tournament_id) continue;
    const prev = totalsByTournament.get(e.tournament_id) ?? {
      cents: 0,
      count: 0,
    };
    prev.cents += e.amount_cents ?? 0;
    prev.count += 1;
    totalsByTournament.set(e.tournament_id, prev);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
            Tournaments
          </div>
          <h1 className="mt-1 text-[26px] md:text-[28px] font-bold tracking-tight text-[#0A0A0B]">
            {tournaments.length} {tournaments.length === 1 ? "tournament" : "tournaments"}
            {!showAll && " (active)"}
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Click any tournament to log expenses against it.
          </p>
        </div>
        <Link
          href="/admin/tournaments/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Tournament
        </Link>
      </header>

      <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        {tournaments.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-[#6B7280]">
            No tournaments yet. Click Add Tournament to create the first.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB]">
                  <Th>Name</Th>
                  <Th>Dates</Th>
                  <Th>Location</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Expenses</Th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map((t) => {
                  const totals = totalsByTournament.get(t.id);
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F8F9FA] transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/tournaments/${t.id}`}
                          className="font-medium text-[#0A0A0B] hover:text-[#4A90D9]"
                        >
                          {t.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-[#6B7280] tabular-nums">
                        {formatDateRange(t.start_date, t.end_date)}
                      </td>
                      <td className="px-5 py-3.5 text-[#6B7280]">
                        {t.location ?? "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.08em] text-white"
                          style={{
                            backgroundColor:
                              STATUS_COLOR[t.status] ?? "#6B7280",
                          }}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        <div className="text-[#0A0A0B] font-semibold">
                          {formatDollars(totals?.cents ?? 0)}
                        </div>
                        <div className="text-[10px] text-[#6B7280] uppercase tracking-[0.08em]">
                          {totals?.count ?? 0}{" "}
                          {(totals?.count ?? 0) === 1 ? "item" : "items"}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="text-[12px] text-[#6B7280]">
        {showAll ? (
          <Link href="/admin/tournaments" className="hover:text-[#0A0A0B]">
            Show active only
          </Link>
        ) : (
          <Link
            href="/admin/tournaments?status=all"
            className="hover:text-[#0A0A0B]"
          >
            Show all (incl. cancelled / completed)
          </Link>
        )}
      </div>
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
