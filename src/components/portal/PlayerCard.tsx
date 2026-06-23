"use client";

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number;
  position: string | null;
  jersey_number: string | null;
  photo_url: string | null;
  team_name: string | null;
  status: string;
}

export default function PlayerCard({ player }: { player: Player }) {
  const statusColor =
    player.status === "active"
      ? "bg-accent-green/10 text-accent-green"
      : player.status === "alumni"
      ? "bg-accent-blue/10 text-accent-blue"
      : "bg-[#F0F1F3] text-[#9CA3AF]";

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="w-full rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* Photo / Placeholder */}
        <div className="relative h-56 bg-gradient-to-br from-[#4A90D9]/10 to-[#4A90D9]/5 flex items-center justify-center overflow-hidden">
          {player.photo_url ? (
            <img
              src={player.photo_url}
              alt={`${player.first_name} ${player.last_name}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <svg
                className="w-20 h-20 text-[#4A90D9]/30"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              {player.jersey_number && (
                <span className="text-5xl font-extrabold text-[#4A90D9]/20 tracking-tight">
                  #{player.jersey_number}
                </span>
              )}
            </div>
          )}

          {/* Status badge */}
          <span
            className={`absolute top-4 right-4 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] rounded-full ${statusColor}`}
          >
            {player.status}
          </span>
        </div>

        {/* Info */}
        <div className="p-6">
          <h2 className="text-2xl font-bold text-[#1A1A1A] tracking-tight mb-1">
            {player.first_name} {player.last_name}
          </h2>

          <div className="flex flex-wrap items-center gap-3 mt-3">
            <span className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] rounded-full bg-accent-blue/10 text-accent-blue">
              Class of {player.graduation_year}
            </span>
            {player.position && (
              <span className="text-sm text-[#6B7280]">{player.position}</span>
            )}
            {player.jersey_number && (
              <span className="text-sm text-[#6B7280]">#{player.jersey_number}</span>
            )}
          </div>

          {player.team_name && (
            <p className="mt-3 text-sm text-[#9CA3AF]">{player.team_name}</p>
          )}
        </div>
      </div>
    </div>
  );
}
