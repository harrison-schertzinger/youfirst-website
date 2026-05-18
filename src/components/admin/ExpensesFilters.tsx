"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  EXPENSE_CATEGORIES,
  expenseCategoryMeta,
} from "@/lib/expense-categories";

interface TournamentOption {
  id: string;
  name: string;
}

interface Props {
  tournaments: TournamentOption[];
}

export default function ExpensesFilters({ tournaments }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const category = params.get("category") ?? "";
  const tournamentId = params.get("tournament_id") ?? "";
  const showArchived = params.get("status") === "archived";

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  return (
    <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 md:p-5 flex flex-wrap items-center gap-3">
      <select
        value={category}
        onChange={(e) => setParam("category", e.target.value || null)}
        className="text-[13px] bg-white border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-[#0A0A0B] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9]"
        aria-label="Category filter"
      >
        <option value="">All categories</option>
        {EXPENSE_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {expenseCategoryMeta[c].text}
          </option>
        ))}
      </select>
      <select
        value={tournamentId}
        onChange={(e) => setParam("tournament_id", e.target.value || null)}
        className="text-[13px] bg-white border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-[#0A0A0B] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9]"
        aria-label="Tournament filter"
      >
        <option value="">All tournaments</option>
        {tournaments.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <label className="ml-auto inline-flex items-center gap-2 text-[12px] text-[#6B7280]">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) =>
            setParam("status", e.target.checked ? "archived" : null)
          }
          className="w-4 h-4 rounded border-[#E5E7EB] text-[#4A90D9]"
        />
        Show archived
      </label>
    </div>
  );
}
