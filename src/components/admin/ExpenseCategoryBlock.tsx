import Link from "next/link";
import {
  expenseCategoryMeta,
  type ExpenseCategory,
} from "@/lib/expense-categories";
import InlineExpenseAddRow from "@/components/admin/InlineExpenseAddRow";

export interface BlockExpense {
  id: string;
  expense_date: string;
  description: string;
  amount_cents: number;
  vendor: string | null;
  tournament_id: string | null;
  player_id: string | null;
}

interface TournamentOption {
  id: string;
  name: string;
}

interface Props {
  category: ExpenseCategory;
  expenses: BlockExpense[];
  tournamentNameById: Map<string, string>;
  playerNameById: Map<string, string>;
  tournaments: TournamentOption[];
  /** Last in the parent list — suppresses the bottom divider. */
  isLast?: boolean;
}

function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

/**
 * Ledger-style section inside the single big Expenses card. No colored
 * pill, no nested card — just an all-caps header, a 1px divider, a
 * compact table, and an inline "+ Add line" trigger at the bottom.
 */
export default function ExpenseCategoryBlock({
  category,
  expenses,
  tournamentNameById,
  playerNameById,
  tournaments,
  isLast,
}: Props) {
  const meta = expenseCategoryMeta[category];
  const total = expenses.reduce((s, e) => s + (e.amount_cents ?? 0), 0);
  const isEmpty = expenses.length === 0;

  return (
    <section
      className={[
        "px-6 md:px-8 py-6",
        isLast ? "" : "border-b border-[#E5E7EB]",
      ].join(" ")}
    >
      <header className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-xs uppercase tracking-wide font-medium text-[#6B7280]">
          {meta.text}
        </h2>
        <span className="text-xs text-[#6B7280] tabular-nums">
          <span className="text-[#0A0A0B] font-semibold">
            {formatDollars(total)}
          </span>
          {" · "}
          {expenses.length} {expenses.length === 1 ? "line" : "lines"}
        </span>
      </header>

      <div className="border-t border-[#E5E7EB]" />

      {isEmpty ? (
        <div className="py-4 text-[12px] text-[#9CA3AF] italic">
          (No lines yet)
        </div>
      ) : (
        <table className="w-full text-[13px] border-collapse mt-1">
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Description</Th>
              <Th>Vendor</Th>
              <Th className="text-right">Amount</Th>
              <Th>Link</Th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => {
              const tournamentName = e.tournament_id
                ? (tournamentNameById.get(e.tournament_id) ?? null)
                : null;
              const playerName = e.player_id
                ? (playerNameById.get(e.player_id) ?? null)
                : null;
              return (
                <tr
                  key={e.id}
                  className="h-9 border-t border-[#E5E7EB] hover:bg-[#F8F9FA] transition-colors"
                >
                  <td className="py-1.5 pr-3 text-[#6B7280] tabular-nums whitespace-nowrap">
                    <Link
                      href={`/admin/expenses/${e.id}`}
                      className="hover:text-[#4A90D9]"
                    >
                      {formatDate(e.expense_date)}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-3 text-[#0A0A0B]">
                    <Link
                      href={`/admin/expenses/${e.id}`}
                      className="hover:text-[#4A90D9]"
                    >
                      {e.description}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-3 text-[#6B7280]">
                    {e.vendor ?? "—"}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-[#0A0A0B] font-medium">
                    {formatDollars(e.amount_cents)}
                  </td>
                  <td className="py-1.5 text-[#6B7280]">
                    {tournamentName ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] text-[#4A90D9] bg-[#4A90D9]/[0.08]">
                        {tournamentName}
                      </span>
                    ) : playerName ? (
                      <span className="text-[12px]">{playerName}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="mt-3">
        <InlineExpenseAddRow category={category} tournaments={tournaments} />
      </div>
    </section>
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
        "py-2 pr-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF] text-left",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </th>
  );
}
