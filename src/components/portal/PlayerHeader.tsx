import { PLAYER_STATUS_LABELS } from "@/lib/player-status";

interface HeaderPlayer {
  first_name: string;
  last_name: string;
  graduation_year: number;
  position: string | null;
  jersey_number: string | null;
  photo_url: string | null;
  team_name: string | null;
  status: string;
}

/**
 * The identity band.
 *
 * Replaces two stacked full-width tiles — a photo card and a profile card that
 * repeated the same name, class, team and number directly beneath it. Neither
 * earned a screen's worth of height, and together they pushed the thing a
 * parent actually came for (what she owes) below the fold. One horizontal row
 * now, and the money starts immediately under it.
 */
export default function PlayerHeader({ player }: { player: HeaderPlayer }) {
  const initials =
    `${player.first_name.charAt(0)}${player.last_name.charAt(0)}`.toUpperCase();

  const onRoster = player.status === "active";
  const statusTone = onRoster
    ? "bg-[#34D399]/12 text-[#0F9D6E]"
    : player.status === "injured" || player.status === "hold"
    ? "bg-[#F59E0B]/12 text-[#B45309]"
    : "bg-[#F0F1F3] text-[#6B7280]";

  const meta = [
    `Class of ${player.graduation_year}`,
    player.position,
    player.team_name,
  ].filter(Boolean);

  return (
    <header className="rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-6 py-5 sm:px-8 sm:py-6">
      <div className="flex items-center gap-5 sm:gap-6">
        {/* Avatar / jersey */}
        <div className="relative shrink-0">
          <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl bg-gradient-to-br from-[#EDF5FB] to-[#D8E9F5] flex items-center justify-center">
            {player.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={player.photo_url}
                alt=""
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <span className="text-[22px] sm:text-[24px] font-bold tracking-tight text-[#4B9CD3]">
                {initials}
              </span>
            )}
          </div>
          {player.jersey_number && (
            <span className="absolute -bottom-1.5 -right-1.5 min-w-[26px] h-[26px] px-1.5 rounded-lg bg-[#0A0A0B] text-white text-[12px] font-bold tabular-nums flex items-center justify-center shadow-sm">
              {player.jersey_number}
            </span>
          )}
        </div>

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] sm:text-[28px] font-bold tracking-tight leading-tight text-[#1A1A1A] truncate">
            {player.first_name} {player.last_name}
          </h1>
          <p className="mt-0.5 text-[13px] sm:text-[14px] text-[#6B7280] truncate">
            {meta.join(" · ")}
          </p>
        </div>

        {/* Status */}
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${statusTone}`}
        >
          {PLAYER_STATUS_LABELS[player.status] ?? player.status}
        </span>
      </div>
    </header>
  );
}
