"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";

interface TournamentOption {
  id: string;
  name: string;
}

interface Props {
  tournaments: TournamentOption[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function ExpensesFilters({ tournaments }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const tournamentId = params.get("tournament_id") ?? "";
  const showArchived = params.get("status") === "archived";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  // Draft date state — validated locally before pushing to the URL.
  const [fromDraft, setFromDraft] = useState(from);
  const [toDraft, setToDraft] = useState(to);
  const [dateError, setDateError] = useState<string | null>(null);
  // Detect-change-during-render keeps drafts synced when URL params change
  // from outside this component (back/forward, clear-all) without
  // tripping the setState-in-effect lint rule.
  const [lastSyncedFrom, setLastSyncedFrom] = useState(from);
  const [lastSyncedTo, setLastSyncedTo] = useState(to);
  if (lastSyncedFrom !== from || lastSyncedTo !== to) {
    setLastSyncedFrom(from);
    setLastSyncedTo(to);
    setFromDraft(from);
    setToDraft(to);
    setDateError(null);
  }

  function applyParams(updater: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(params);
    updater(next);
    // Strip any stale category params from older bookmarks — categories
    // are the page's structure now, not a filter axis.
    next.delete("category");
    next.delete("categories");
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function setTournament(value: string) {
    applyParams((next) => {
      if (!value) next.delete("tournament_id");
      else next.set("tournament_id", value);
    });
  }

  function setShowArchived(value: boolean) {
    applyParams((next) => {
      if (value) next.set("status", "archived");
      else next.delete("status");
    });
  }

  function applyDates() {
    if (fromDraft && !DATE_RE.test(fromDraft)) {
      setDateError("From must be a valid date.");
      return;
    }
    if (toDraft && !DATE_RE.test(toDraft)) {
      setDateError("To must be a valid date.");
      return;
    }
    if (fromDraft && toDraft && fromDraft > toDraft) {
      setDateError("From must be on or before To.");
      return;
    }
    setDateError(null);
    applyParams((next) => {
      if (fromDraft) next.set("from", fromDraft);
      else next.delete("from");
      if (toDraft) next.set("to", toDraft);
      else next.delete("to");
    });
  }

  function clearAll() {
    applyParams((next) => {
      next.delete("tournament_id");
      next.delete("from");
      next.delete("to");
      // Leave `status` and `season` alone — those are higher-level scopes.
    });
    setFromDraft("");
    setToDraft("");
    setDateError(null);
  }

  const hasAnyFilter = !!tournamentId || !!from || !!to;

  return (
    <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 md:p-5 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={tournamentId}
          onChange={(e) => setTournament(e.target.value)}
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

        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
            From
            <input
              type="date"
              value={fromDraft}
              onChange={(e) => setFromDraft(e.target.value)}
              onBlur={applyDates}
              className="text-[13px] bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-[#0A0A0B] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] normal-case tracking-normal"
            />
          </label>
          <label className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
            To
            <input
              type="date"
              value={toDraft}
              onChange={(e) => setToDraft(e.target.value)}
              onBlur={applyDates}
              className="text-[13px] bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-[#0A0A0B] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] normal-case tracking-normal"
            />
          </label>
        </div>

        <label className="ml-auto inline-flex items-center gap-2 text-[12px] text-[#6B7280]">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="w-4 h-4 rounded border-[#E5E7EB] text-[#4A90D9]"
          />
          Show archived
        </label>
      </div>

      {(hasAnyFilter || dateError) && (
        <div className="flex flex-wrap items-center gap-3 text-[12px]">
          {dateError && (
            <span role="alert" className="text-[#EF4444]">
              {dateError}
            </span>
          )}
          {hasAnyFilter && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-[#4A90D9] hover:text-[#3A7BC8] font-medium"
            >
              <X className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
