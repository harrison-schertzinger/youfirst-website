import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Plus, Check } from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  isExpenseCategory,
  type ExpenseCategory,
} from "@/lib/expense-categories";
import ExpensesFilters from "@/components/admin/ExpensesFilters";
import CsvDownloadButton from "@/components/admin/CsvDownloadButton";
import ExpenseCategoryBlock, {
  type BlockExpense,
} from "@/components/admin/ExpenseCategoryBlock";

export const dynamic = "force-dynamic";

interface ExpenseRow {
  id: string;
  expense_date: string;
  category: string;
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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
  const tournamentId =
    typeof params.tournament_id === "string" ? params.tournament_id : null;
  const fromParam =
    typeof params.from === "string" && DATE_RE.test(params.from)
      ? params.from
      : null;
  const toParam =
    typeof params.to === "string" && DATE_RE.test(params.to)
      ? params.to
      : null;
  // Guard against from > to from URL-typed users — drop both if inverted.
  const dateRangeValid =
    !fromParam || !toParam || fromParam <= toParam;
  const fromDate = dateRangeValid ? fromParam : null;
  const toDate = dateRangeValid ? toParam : null;
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

  // Three parallel queries: filtered expenses + active tournaments + a lite
  // player set for the "linked" column lookup.
  let exQ = admin
    .from("expenses")
    .select(
      "id, expense_date, category, description, amount_cents, vendor, tournament_id, player_id, status",
    )
    .eq("season", season)
    .eq("status", statusParam)
    .order("expense_date", { ascending: false });
  if (tournamentId) exQ = exQ.eq("tournament_id", tournamentId);
  if (fromDate) exQ = exQ.gte("expense_date", fromDate);
  if (toDate) exQ = exQ.lte("expense_date", toDate);

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

  const tournamentNameById = new Map<string, string>();
  for (const t of tournaments) tournamentNameById.set(t.id, t.name);
  const playerNameById = new Map<string, string>();
  for (const p of players) {
    playerNameById.set(p.id, `${p.first_name} ${p.last_name}`);
  }

  const totalCents = expenses.reduce(
    (sum, e) => sum + (e.amount_cents ?? 0),
    0,
  );

  // Bucket by category in canonical order. Empty categories still render —
  // their absence would let underused categories hide unnoticed.
  const byCategory = new Map<ExpenseCategory, BlockExpense[]>();
  for (const c of EXPENSE_CATEGORIES) byCategory.set(c, []);
  for (const e of expenses) {
    if (!isExpenseCategory(e.category)) continue;
    byCategory.get(e.category)!.push({
      id: e.id,
      expense_date: e.expense_date,
      description: e.description,
      amount_cents: e.amount_cents,
      vendor: e.vendor,
      tournament_id: e.tournament_id,
      player_id: e.player_id,
    });
  }

  return (
    <div className="space-y-8">
      {logged && (
        <Banner tone="success" text={`Expense logged: ${logged}`} />
      )}
      {archivedBanner && (
        <Banner tone="success" text={`Archived: ${archivedBanner}`} />
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
          <p className="mt-1 text-sm text-[#6B7280]">
            {expenses.length} expense{expenses.length === 1 ? "" : "s"} logged ·{" "}
            <span className="text-[#0A0A0B] font-medium">
              {formatDollars(totalCents)}
            </span>{" "}
            this season
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/expenses/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </Link>
          <CsvDownloadButton
            href={buildExportHref({
              season,
              statusParam,
              tournamentId,
              fromDate,
              toDate,
            })}
          />
        </div>
      </header>

      <ExpensesFilters tournaments={tournaments} />

      {/* One block per canonical category — empty blocks still render. */}
      <div className="space-y-6">
        {EXPENSE_CATEGORIES.map((cat) => (
          <ExpenseCategoryBlock
            key={cat}
            category={cat}
            expenses={byCategory.get(cat) ?? []}
            tournamentNameById={tournamentNameById}
            playerNameById={playerNameById}
          />
        ))}
      </div>
    </div>
  );
}

function buildExportHref(args: {
  season: string;
  statusParam: string;
  tournamentId: string | null;
  fromDate: string | null;
  toDate: string | null;
}): string {
  const qs = new URLSearchParams();
  qs.set("season", args.season);
  qs.set("status", args.statusParam);
  if (args.tournamentId) qs.set("tournament_id", args.tournamentId);
  if (args.fromDate) qs.set("from", args.fromDate);
  if (args.toDate) qs.set("to", args.toDate);
  return `/api/admin/expenses/export?${qs.toString()}`;
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

function ShellShellEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
      {message}
    </div>
  );
}
