"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, Search } from "lucide-react";

export interface AvailablePlayer {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  position: string | null;
}

interface Props {
  tournamentId: string;
  tournamentName: string;
  tournamentAgeGroup: string | null;
  available: AvailablePlayer[];
  onClose: () => void;
}

/**
 * Parses the tournament's age_group field for a 4-digit graduation
 * year. Returns the year if found (e.g. "2028", "Class of 2028",
 * "U16 / 2028") or null if the string is missing or contains no year
 * (e.g. "All teams").
 */
function parseAgeGroupYear(s: string | null): number | null {
  if (!s) return null;
  const match = /\b(20\d{2})\b/.exec(s);
  if (!match) return null;
  const n = Number(match[1]);
  if (n < 2024 || n > 2040) return null;
  return n;
}

export default function AddPlayersToTournamentModal({
  tournamentId,
  tournamentName,
  tournamentAgeGroup,
  available,
  onClose,
}: Props) {
  const router = useRouter();
  const defaultYear = parseAgeGroupYear(tournamentAgeGroup);
  // When the tournament has a parseable age_group, default to that
  // year's players only. "Show all" toggles to the full list.
  const [showAll, setShowAll] = useState<boolean>(defaultYear === null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escape closes the modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submitting, onClose]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return available.filter((p) => {
      if (!showAll && defaultYear !== null) {
        if (p.graduation_year !== defaultYear) return false;
      }
      if (!term) return true;
      const name = `${p.first_name} ${p.last_name}`.toLowerCase();
      return name.includes(term);
    });
  }, [available, search, showAll, defaultYear]);

  // Group visible players by class year for the list rendering. Unknown
  // year goes last under "No class".
  const grouped = useMemo(() => {
    const map = new Map<string, AvailablePlayer[]>();
    for (const p of visible) {
      const key = p.graduation_year != null ? String(p.graduation_year) : "unknown";
      const bucket = map.get(key) ?? [];
      bucket.push(p);
      map.set(key, bucket);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => a.last_name.localeCompare(b.last_name));
    }
    const keys = [...map.keys()].sort((a, b) => {
      if (a === "unknown") return 1;
      if (b === "unknown") return -1;
      return Number(a) - Number(b);
    });
    return keys.map((k) => ({ key: k, players: map.get(k) ?? [] }));
  }, [visible]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllVisible = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allVisibleSelected = visible.every((p) => next.has(p.id));
      if (allVisibleSelected) {
        for (const p of visible) next.delete(p.id);
      } else {
        for (const p of visible) next.add(p.id);
      }
      return next;
    });
  }, [visible]);

  const submit = useCallback(async () => {
    setError(null);
    if (selected.size === 0) {
      setError("Select at least one player to add.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/tournaments/${tournamentId}/roster`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ player_ids: Array.from(selected) }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Failed to add players.");
        setSubmitting(false);
        return;
      }
      onClose();
      router.refresh();
    } catch (err) {
      console.error("[AddPlayersModal] threw:", err);
      setError("Network error.");
      setSubmitting(false);
    }
  }, [selected, tournamentId, onClose, router]);

  const allVisibleSelected =
    visible.length > 0 && visible.every((p) => selected.has(p.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-players-title"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !submitting && onClose()}
        aria-hidden
      />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
        <header className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#E5E7EB]">
          <div>
            <h3
              id="add-players-title"
              className="text-[17px] font-semibold text-[#0A0A0B]"
            >
              Add Players to {tournamentName}
            </h3>
            <p className="mt-0.5 text-[12px] text-[#6B7280]">
              {defaultYear !== null && !showAll
                ? `Showing Class of ${defaultYear} only`
                : "Showing all active players"}
              {available.length === 0 && " — none available"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="p-1.5 -mr-1.5 rounded-md text-[#6B7280] hover:text-[#0A0A0B] hover:bg-[#F8F9FA] disabled:opacity-60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-6 py-4 border-b border-[#E5E7EB] flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="w-full bg-white border border-[#E5E7EB] rounded-lg pl-9 pr-3 py-2 text-[13px] text-[#0A0A0B] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9]"
            />
          </div>
          {defaultYear !== null && (
            <label className="inline-flex items-center gap-2 text-[12px] text-[#6B7280]">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
                className="w-4 h-4 rounded border-[#E5E7EB]"
              />
              Show all classes
            </label>
          )}
          {visible.length > 0 && (
            <button
              type="button"
              onClick={toggleAllVisible}
              className="text-[11px] text-[#4A90D9] hover:underline"
            >
              {allVisibleSelected ? "Clear visible" : "Select visible"}
            </button>
          )}
        </div>

        <div className="overflow-y-auto px-6 py-4 flex-1">
          {available.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-[#6B7280]">
              All active players are already on this tournament&apos;s roster.
            </div>
          ) : visible.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-[#6B7280]">
              No players match your filters.
            </div>
          ) : (
            <ul className="space-y-4">
              {grouped.map((group) => (
                <li key={group.key}>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280] mb-2">
                    {group.key === "unknown"
                      ? "No class"
                      : `Class of ${group.key}`}
                  </div>
                  <ul className="divide-y divide-[#F1F2F4] border border-[#E5E7EB] rounded-lg overflow-hidden">
                    {group.players.map((p) => {
                      const isSelected = selected.has(p.id);
                      return (
                        <li key={p.id}>
                          <label
                            className={[
                              "flex items-center gap-3 px-3 py-2 cursor-pointer text-[13px] transition-colors",
                              isSelected
                                ? "bg-[#4A90D9]/[0.06]"
                                : "hover:bg-[#F8F9FA]",
                            ].join(" ")}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggle(p.id)}
                              className="w-4 h-4 rounded border-[#E5E7EB]"
                            />
                            <span className="flex-1 text-[#0A0A0B]">
                              {p.first_name} {p.last_name}
                            </span>
                            <span className="text-[11px] text-[#6B7280]">
                              {p.position ?? "—"}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <div className="px-6 py-2 border-t border-[#E5E7EB]">
            <p role="alert" className="text-[12px] text-[#EF4444]">
              {error}
            </p>
          </div>
        )}

        <footer className="px-6 py-4 border-t border-[#E5E7EB] flex items-center justify-between gap-3">
          <span className="text-[12px] text-[#6B7280] tabular-nums">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#6B7280] hover:text-[#0A0A0B] disabled:opacity-60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || selected.size === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {submitting
                ? "Adding…"
                : `Add ${selected.size} Player${selected.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
