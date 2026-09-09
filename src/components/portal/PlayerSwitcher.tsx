"use client";

import { formatCents } from "@/lib/portal-balance";
import { CURRENT_SEASON, seasonsEqual } from "@/lib/season";
import type { SeasonBalance } from "./PortalContent";

export interface SwitcherPlayer {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number;
  seasons?: SeasonBalance[];
}

/**
 * Sibling household switcher.
 *
 * Rendered ONLY when a session links to more than one player. Single-player
 * families — the overwhelming majority — see nothing at all and their page is
 * visually unchanged.
 *
 * THE POINT OF THIS COMPONENT is the money beside each name. A parent must be
 * able to see, without tapping anything, that one child is square and another
 * is not. If discovering an unpaid balance required a click, this would just be
 * the hiding bug in a new shape.
 */
export default function PlayerSwitcher({
  players,
  selectedId,
  onSelect,
}: {
  players: SwitcherPlayer[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (players.length < 2) return null;

  return (
    // Width matches the payment dashboard below so the page reads as one column.
    <div className="max-w-2xl mx-auto mb-10">
      <p className="section-label mb-3">Your Athletes</p>
      <div
        role="tablist"
        aria-label="Choose an athlete"
        className="flex flex-col sm:flex-row gap-3"
      >
        {players.map((player) => {
          const selected = player.id === selectedId;
          const seasons = player.seasons ?? [];
          const current =
            seasons.find((s) => seasonsEqual(s.season, CURRENT_SEASON)) ?? null;
          const priorUnpaid = seasons.filter(
            (s) =>
              !seasonsEqual(s.season, CURRENT_SEASON) && s.remaining_cents > 0,
          );
          const currentOwes = (current?.remaining_cents ?? 0) > 0;

          return (
            <button
              key={player.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(player.id)}
              className={[
                "flex-1 min-w-0 text-left rounded-xl border px-4 py-3.5 transition-all",
                "focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/30",
                selected
                  ? "border-[#4A90D9] bg-[#4A90D9]/5 shadow-[0_2px_10px_rgba(74,144,217,0.12)]"
                  : "border-[#E5E7EB] bg-white hover:border-[#4A90D9]/40 hover:bg-[#4A90D9]/[0.02]",
              ].join(" ")}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={`truncate text-[15px] font-bold ${
                    selected ? "text-[#1A1A1A]" : "text-[#374151]"
                  }`}
                >
                  {player.first_name} {player.last_name}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-[#9CA3AF]">
                  {player.graduation_year}
                </span>
              </div>

              {/* Per-season money, never a combined total. */}
              <div className="mt-1.5 space-y-0.5">
                {currentOwes && current ? (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-bold tabular-nums text-[#1A1A1A]">
                    <span
                      aria-hidden="true"
                      className="inline-block w-1.5 h-1.5 rounded-full bg-[#EF4444]"
                    />
                    {formatCents(current.remaining_cents)} due for {CURRENT_SEASON}
                  </span>
                ) : current ? (
                  <span className="text-[13px] font-semibold text-[#34D399]">
                    {CURRENT_SEASON} settled
                  </span>
                ) : (
                  <span className="text-[12px] text-[#9CA3AF]">
                    No {CURRENT_SEASON} plan yet
                  </span>
                )}
                {priorUnpaid.map((s) => (
                  <span
                    key={s.season}
                    className="block text-[12px] tabular-nums text-[#B45309]"
                  >
                    {formatCents(s.remaining_cents)} still due for {s.season}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
