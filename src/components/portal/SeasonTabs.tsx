"use client";

import { formatCents } from "@/lib/portal-balance";
import type { SeasonBalance } from "./PortalContent";

/**
 * Which season's money is on screen.
 *
 * A family that still owes for last season must be able to find and pay it —
 * showing only the newest season is how a balance quietly disappears from the
 * portal while it is still very much owed. Each tab carries its own state, so a
 * parent can see at a glance which years are settled without clicking through
 * them.
 *
 * Renders only when there is more than one season. A first-year family sees no
 * chrome and loses nothing.
 */
export default function SeasonTabs({
  seasons,
  activeSeason,
  onSelect,
}: {
  seasons: SeasonBalance[];
  activeSeason: string | null;
  onSelect: (season: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Season"
      className="flex flex-wrap gap-2"
    >
      {seasons.map((s) => {
        const active = s.season === activeSeason;
        const owes = s.remaining_cents > 0;
        return (
          <button
            key={s.season}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(s.season)}
            className={`rounded-xl border px-3.5 py-2 text-left transition-colors ${
              active
                ? "border-[#4B9CD3] bg-[#EDF5FB]"
                : "border-[#E5E7EB] bg-white hover:border-[#C9D3DC]"
            }`}
          >
            <span className="block text-[13px] font-semibold text-[#1A1A1A]">
              {s.season}
            </span>
            <span
              className={`block text-[11.5px] tabular-nums ${
                owes ? "text-[#B45309]" : "text-[#0F9D6E]"
              }`}
            >
              {owes ? `${formatCents(s.remaining_cents)} due` : "Settled"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
