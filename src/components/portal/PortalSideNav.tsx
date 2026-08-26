"use client";

import { formatCents } from "@/lib/portal-balance";
import type { SeasonBalance } from "./PortalContent";

/**
 * The left rail.
 *
 * The season tabs used to sit between the profile tile and the fees panel,
 * which put a horizontal band of chrome across the middle of the page and broke
 * the two things a parent reads together. Season is a *view* control, not
 * content, so it belongs beside the page rather than inside it — the way any
 * dashboard puts its switcher in a rail.
 *
 * Renders the season list even for a single season, because the label is what
 * makes the numbers on the right unambiguous. A parent should never have to
 * infer which year she is looking at.
 */
export default function PortalSideNav({
  seasons,
  activeSeason,
  onSelectSeason,
  playerName,
}: {
  seasons: SeasonBalance[];
  activeSeason: string | null;
  onSelectSeason: (season: string) => void;
  playerName: string;
}) {
  return (
    <nav className="lg:sticky lg:top-24 space-y-6">
      {/* The page label lives here rather than as a lone eyebrow above the
          content, where it cost a line of vertical space and told the reader
          nothing the nav does not. */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#4B9CD3]">
        Player Portal
      </p>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF] mb-2.5">
          Season
        </p>
        <ul className="space-y-1.5">
          {seasons.map((s) => {
            const active = s.season === activeSeason;
            const owes = s.remaining_cents > 0;
            return (
              <li key={s.season}>
                <button
                  type="button"
                  onClick={() => onSelectSeason(s.season)}
                  aria-current={active ? "true" : undefined}
                  className={`w-full text-left rounded-xl px-3 py-2.5 border transition-colors ${
                    active
                      ? "border-[#4B9CD3] bg-[#EDF5FB]"
                      : "border-transparent hover:bg-[#F0F1F3]"
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
              </li>
            );
          })}
        </ul>
      </div>

      <div className="hidden lg:block">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF] mb-2.5">
          On this page
        </p>
        <ul className="space-y-0.5 text-[13px]">
          {[
            ["#profile", `${playerName}'s profile`],
            ["#fees", "Fees"],
            ["#resources", "Resources"],
          ].map(([href, label]) => (
            <li key={href}>
              <a
                href={href}
                className="block rounded-lg px-3 py-1.5 text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F0F1F3] transition-colors"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
