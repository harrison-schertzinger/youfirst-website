"use client";

import { useState } from "react";

interface Guardian {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  relationship: string | null;
  is_emergency_contact: boolean;
  address_line1: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
}

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

export default function PlayerCard({
  player,
  guardians,
}: {
  player: Player;
  guardians: Guardian[];
}) {
  const [flipped, setFlipped] = useState(false);

  const statusColor =
    player.status === "active"
      ? "bg-accent-green/10 text-accent-green"
      : player.status === "alumni"
      ? "bg-accent-blue/10 text-accent-blue"
      : "bg-[#F0F1F3] text-[#9CA3AF]";

  return (
    <div
      className="w-full max-w-md mx-auto cursor-pointer"
      style={{ perspective: "1200px" }}
      onClick={() => setFlipped(!flipped)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setFlipped(!flipped);
        }
      }}
      aria-label={flipped ? "Show player profile" : "Show contact details"}
    >
      <div
        className="relative w-full transition-transform duration-[600ms]"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ── FRONT ── */}
        <div
          className="w-full rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden"
          style={{ backfaceVisibility: "hidden" }}
        >
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

            <p className="mt-6 text-[11px] text-[#9CA3AF] uppercase tracking-[0.1em]">
              Tap to view contacts →
            </p>
          </div>
        </div>

        {/* ── BACK ── */}
        <div
          className="absolute inset-0 w-full rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="p-6 h-full flex flex-col">
            <p className="section-label mb-4">Contacts & Info</p>

            {/* Guardians */}
            <div className="flex-1 space-y-4">
              {guardians.map((g) => (
                <div
                  key={g.id}
                  className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-[#1A1A1A]">
                      {g.first_name} {g.last_name}
                    </h3>
                    {g.relationship && (
                      <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wide">
                        {g.relationship}
                      </span>
                    )}
                    {g.is_emergency_contact && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-red-50 text-red-500 border border-red-100">
                        Emergency
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-[#6B7280]">{g.email}</p>
                    {g.phone && (
                      <p className="text-sm text-[#6B7280]">{g.phone}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Address (from first guardian with address) */}
              {guardians.find((g) => g.address_line1) && (
                <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9CA3AF] mb-2">
                    Address
                  </p>
                  {(() => {
                    const g = guardians.find((g) => g.address_line1)!;
                    return (
                      <p className="text-sm text-[#6B7280]">
                        {g.address_line1}
                        <br />
                        {g.address_city}, {g.address_state} {g.address_zip}
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>

            <p className="mt-6 text-[11px] text-[#9CA3AF] uppercase tracking-[0.1em]">
              ← Tap to view profile
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
