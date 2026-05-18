import Link from "next/link";
import {
  expenseCategoryMeta,
  type ExpenseCategory,
} from "@/lib/expense-categories";

export interface BlockExpense {
  id: string;
  expense_date: string;
  description: string;
  amount_cents: number;
  vendor: string | null;
  tournament_id: string | null;
  player_id: string | null;
}

interface Props {
  category: ExpenseCategory;
  expenses: BlockExpense[];
  tournamentNameById: Map<string, string>;
  playerNameById: Map<string, string>;
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
 * One section of the /admin/expenses page: a category header with a
 * colored pill + running total, followed by a table of expenses in that
 * category. Empty categories still render (header + faint "no expenses"
 * line) so Harrison sees at a glance what's underused.
 */
export default function ExpenseCategoryBlock({
  category,
  expenses,
  tournamentNameById,
  playerNameById,
}: Props) {
  const meta = expenseCategoryMeta[category];
  const total = expenses.reduce((s, e) => s + (e.amount_cents ?? 0), 0);
  const isEmpty = expenses.length === 0;

  return (
    <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
      <header className="px-5 md:px-7 py-4 border-b border-[#E5E7EB] flex items-center justify-between gap-3">
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.1em] text-white"
          style={{ backgroundColor: meta.color }}
        >
          {meta.text}
        </span>
        <div className="text-right">
          <span className="text-[#0A0A0B] font-semibold tabular-nums text-[15px]">
            {formatDollars(total)}
          </span>
          <span className="text-[11px] text-[#6B7280] ml-2 uppercase tracking-[0.08em]">
            · {expenses.length} {expenses.length === 1 ? "item" : "items"}
          </span>
        </div>
      </header>

      {isEmpty ? (
        <div className="px-6 py-8 text-center text-[12px] text-[#6B7280] italic">
          No expenses logged in this category.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB]">
                <Th>Date</Th>
                <Th>Description</Th>
                <Th>Vendor</Th>
                <Th className="text-right">Amount</Th>
                <Th>Linked</Th>
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
                      {tournamentName ? (
                        <span className="text-[#4A90D9]">{tournamentName}</span>
                      ) : playerName ? (
                        <span>{playerName}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
        "px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B7280] text-left",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </th>
  );
}
