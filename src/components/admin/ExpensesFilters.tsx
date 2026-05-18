"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
// `useEffect` is still needed below for the popover's outside-click handler.
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Check, ChevronDown, X } from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  expenseCategoryMeta,
  type ExpenseCategory,
  isExpenseCategory,
} from "@/lib/expense-categories";

interface TournamentOption {
  id: string;
  name: string;
}

interface Props {
  tournaments: TournamentOption[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseCategoriesParam(raw: string | null): ExpenseCategory[] {
  if (!raw) return [];
  const seen = new Set<ExpenseCategory>();
  for (const piece of raw.split(",")) {
    const trimmed = piece.trim();
    if (isExpenseCategory(trimmed)) seen.add(trimmed);
  }
  return [...seen];
}

export default function ExpensesFilters({ tournaments }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const selectedCategories = useMemo(
    () => parseCategoriesParam(params.get("categories")),
    [params],
  );
  // Legacy single-category param falls back into the same model so old
  // bookmarks keep working.
  const legacyCategory = params.get("category");
  const effectiveCategories = useMemo(() => {
    if (selectedCategories.length > 0) return selectedCategories;
    if (legacyCategory && isExpenseCategory(legacyCategory)) {
      return [legacyCategory];
    }
    return [];
  }, [selectedCategories, legacyCategory]);

  const tournamentId = params.get("tournament_id") ?? "";
  const showArchived = params.get("status") === "archived";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  // Local draft state for the date inputs lets us validate before pushing.
  const [fromDraft, setFromDraft] = useState(from);
  const [toDraft, setToDraft] = useState(to);
  const [dateError, setDateError] = useState<string | null>(null);
  // Detect-change-during-render keeps the drafts synced when the URL is
  // changed from outside this component (browser back/forward, clear-all)
  // without triggering a setState-in-effect cascade.
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
    // Always strip the legacy single-category key when we touch params —
    // categories[] is now canonical.
    next.delete("category");
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function toggleCategory(cat: ExpenseCategory) {
    const set = new Set(effectiveCategories);
    if (set.has(cat)) set.delete(cat);
    else set.add(cat);
    applyParams((next) => {
      if (set.size === 0) next.delete("categories");
      else next.set("categories", [...set].join(","));
    });
  }

  function clearCategories() {
    applyParams((next) => next.delete("categories"));
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
    // Empty + empty = clear both. Otherwise both must be valid dates and
    // from ≤ to.
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
      next.delete("categories");
      next.delete("tournament_id");
      next.delete("from");
      next.delete("to");
      // Intentionally leave `status` and `season` alone — those are
      // higher-level scopes, not filters.
    });
    setFromDraft("");
    setToDraft("");
    setDateError(null);
  }

  const hasAnyFilter =
    effectiveCategories.length > 0 ||
    !!tournamentId ||
    !!from ||
    !!to;

  return (
    <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 md:p-5 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <CategoryMultiSelect
          selected={effectiveCategories}
          onToggle={toggleCategory}
          onClear={clearCategories}
        />

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

function CategoryMultiSelect({
  selected,
  onToggle,
  onClear,
}: {
  selected: ExpenseCategory[];
  onToggle: (cat: ExpenseCategory) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  let triggerLabel: string;
  if (selected.length === 0) triggerLabel = "All categories";
  else if (selected.length === 1) {
    triggerLabel = expenseCategoryMeta[selected[0]].text;
  } else {
    triggerLabel = `${expenseCategoryMeta[selected[0]].text} +${selected.length - 1}`;
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 text-[13px] bg-white border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-[#0A0A0B] hover:bg-[#F8F9FA] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9]"
      >
        {selected.length === 1 && (
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: expenseCategoryMeta[selected[0]].color }}
            aria-hidden
          />
        )}
        <span>{triggerLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-20 mt-2 w-64 rounded-xl bg-white border border-[#E5E7EB] shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-1.5"
        >
          <ul className="max-h-72 overflow-y-auto">
            {EXPENSE_CATEGORIES.map((c) => {
              const isSel = selected.includes(c);
              const meta = expenseCategoryMeta[c];
              return (
                <li key={c}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    onClick={() => onToggle(c)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-[#F8F9FA] focus:outline-none focus:bg-[#F8F9FA]"
                  >
                    <span
                      className={[
                        "inline-flex items-center justify-center w-4 h-4 rounded border",
                        isSel
                          ? "border-[#4A90D9] bg-[#4A90D9]"
                          : "border-[#E5E7EB] bg-white",
                      ].join(" ")}
                      aria-hidden
                    >
                      {isSel && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.08em] text-white"
                      style={{ backgroundColor: meta.color }}
                    >
                      {meta.text}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {selected.length > 0 && (
            <div className="border-t border-[#E5E7EB] mt-1.5 pt-1.5 px-1">
              <button
                type="button"
                onClick={onClear}
                className="w-full text-left text-[12px] text-[#4A90D9] hover:text-[#3A7BC8] font-medium px-1.5 py-1"
              >
                Clear categories
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
