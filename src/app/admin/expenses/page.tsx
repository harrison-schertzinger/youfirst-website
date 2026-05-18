import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Plus, Check } from "lucide-react";
import {
  expenseCategoryMeta,
  type ExpenseCategory,
} from "@/lib/expense-categories";
import ExpensesFilters from "@/components/admin/ExpensesFilters";

export const dynamic = "force-dynamic";

interface ExpenseRow {
  id: string;
  expense_date: string;
  category: ExpenseCategory;
  description: string;
  amount_cents: number;
  vendor: string | null;
  tournament_id: string | null;
  player_id: string | null;
  status: string;
}

interface TournamentLite {
  id: string;
  name: string;
}

interface PlayerLite {
  id: string;
  first_name: string;
  last_name: string;
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
  });
}

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const season =
    typeof params.season === "string" ? params.season : "2025-26";
  const statusParam =
    typeof params.status === "string" ? params.status : "active";
  const category =
    typeof params.category === "string" ? params.category : null;
  const tournamentId =
    typeof params.tournament_id === "string" ? params.tournament_id : null;
  const logged = typeof params.logged === "string" ? params.logged : null;
  const archivedBanner =
    typeof params.archived === "string" ? params.archived : null;

  const admin = getAdmin();
  if (!admin) {
    return (
      <ShellShellEmpty
        message="Supabase service-role env vars not configured."
      />
    );
  }

  // Fetch expenses (filtered) + tournaments + a lite player set to render
  // joins in the table cell. Three parallel queries.
  let exQ = admin
    .from("expenses")
    .select(
      "id, expense_date, category, description, amount_cents, vendor, tournament_id, player_id, status",
    )
    .eq("season", season)
    .eq("status", statusParam)
    .order("expense_date", { ascending: false });
  if (category) exQ = exQ.eq("category", category);
  if (tournamentId) exQ = exQ.eq("tournament_id", tournamentId);

  const [exRes, tourRes, playerRes] = await Promise.all([
    exQ,
    admin
      .from("tournaments")
      .select("id, name")
      .eq("status", "active")
      .order("start_date", { ascending: true, nullsFirst: false }),
    admin
      .from("players")
      .select("id, first_name, last_name")
      .eq("status", "active"),
  ]);

  const expenses = (exRes.data ?? []) as ExpenseRow[];
  const tournaments = (tourRes.data ?? []) as TournamentLite[];
  const players = (playerRes.data ?? []) as PlayerLite[];

  const tournamentById = new Map<string, string>();
  for (const t of tournaments) tournamentById.set(t.id, t.name);
  const playerById = new Map<string, PlayerLite>();
  for (const p of players) playerById.set(p.id, p);

  const totalCents = expenses.reduce(
    (sum, e) => sum + (e.amount_cents ?? 0),
    0,
  );

  return (
    <div className="space-y-8">
      {logged && (
        <Banner
          tone="success"
          text={`Expense logged: ${logged}`}
        />
      )}
      {archivedBanner && (
        <Banner
          tone="success"
          text={`Archived: ${archivedBanner}`}
        />
      )}

      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
            Season {season}
          </div>
          <h1 className="mt-1 text-[26px] md:text-[28px] font-bold tracking-tight text-[#0A0A0B]">
            Expenses
          </h1>
        </div>
        <Link
          href="/admin/expenses/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </Link>
      </header>

      <ExpensesFilters tournaments={tournaments} />

      {/* Table */}
      <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB]">
                <Th>Date</Th>
                <Th>Category</Th>
                <Th>Description</Th>
                <Th>Vendor</Th>
                <Th className="text-right">Amount</Th>
                <Th>Tournament / Player</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-[#6B7280]"
                  >
                    No expenses match this filter. Click Add Expense to log
                    the first one.
                  </td>
                </tr>
              )}
              {expenses.map((e) => {
                const meta = expenseCategoryMeta[e.category];
                const tournamentName = e.tournament_id
                  ? (tournamentById.get(e.tournament_id) ?? "—")
                  : null;
                const player = e.player_id ? playerById.get(e.player_id) : null;
                return (
                  <tr
                    key={e.id}
                    className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F8F9FA] transition-colors"
                  >
                    <td className="px-5 py-3 text-[#6B7280] tabular-nums whitespace-nowrap">
                      <Link
                        href={`/admin/expenses/${e.id}`}
                        className="hover:text-[#4A90D9]"
                      >
                        {formatDate(e.expense_date)}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.08em] text-white whitespace-nowrap"
                        style={{ backgroundColor: meta.color }}
                      >
                        {meta.text}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#0A0A0B]">
                      <Link
                        href={`/admin/expenses/${e.id}`}
                        className="hover:text-[#4A90D9]"
                      >
                        {e.description}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-[#6B7280]">
                      {e.vendor ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-[#0A0A0B] font-medium">
                      {formatDollars(e.amount_cents)}
                    </td>
                    <td className="px-5 py-3 text-[#6B7280]">
                      {tournamentName && (
                        <div className="text-[#4A90D9]">{tournamentName}</div>
                      )}
                      {player && (
                        <div className="text-[12px]">
                          {player.first_name} {player.last_name}
                        </div>
                      )}
                      {!tournamentName && !player && "—"}
                    </td>
                    <td className="px-5 py-3 text-[#6B7280]">
                      {e.status === "archived" ? (
                        <span className="text-[11px] uppercase tracking-[0.08em] text-[#F59E0B]">
                          Archived
                        </span>
                      ) : (
                        <span className="text-[11px] uppercase tracking-[0.08em] text-[#34D399]">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 md:px-7 py-3 bg-[#F8F9FA] border-t border-[#E5E7EB] flex items-center justify-between text-[12px]">
          <span className="text-[#6B7280]">
            {expenses.length} expense{expenses.length === 1 ? "" : "s"}
          </span>
          <span className="font-semibold text-[#0A0A0B] tabular-nums">
            Total: {formatDollars(totalCents)}
          </span>
        </div>
      </section>
    </div>
  );
}

function Banner({
  tone,
  text,
}: {
  tone: "success" | "warning";
  text: string;
}) {
  const color = tone === "success" ? "#34D399" : "#F59E0B";
  return (
    <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-5 py-4 flex items-center gap-3">
      <span
        className="inline-flex w-6 h-6 rounded-full items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}1A`, color }}
        aria-hidden
      >
        <Check className="w-3.5 h-3.5" />
      </span>
      <div className="text-sm text-[#0A0A0B]">{text}</div>
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

function ShellShellEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
      {message}
    </div>
  );
}
