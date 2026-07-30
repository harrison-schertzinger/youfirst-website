"use client";

import { formatCents, type PlayerBalanceRow } from "@/lib/portal-balance";

export interface SwitcherPlayer {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number;
  balance: PlayerBalanceRow | null;
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
          const balance = player.balance;
          const owes = (balance?.remaining_cents ?? 0) > 0;
          const overpaid = (balance?.overpaid_cents ?? 0) > 0;

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

              {/* The payment state, visible without clicking. */}
              <div className="mt-1.5">
                {!balance ? (
                  <span className="text-[12px] text-[#9CA3AF]">
                    No season plan
                  </span>
                ) : owes ? (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-bold tabular-nums text-[#1A1A1A]">
                    <span
                      aria-hidden="true"
                      className="inline-block w-1.5 h-1.5 rounded-full bg-[#EF4444]"
                    />
                    {formatCents(balance.remaining_cents)} due
                  </span>
                ) : overpaid ? (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#4A90D9]">
                    Overpaid {formatCents(balance.overpaid_cents)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#34D399]">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Settled
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
