"use client";

import { useState } from "react";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export interface PlayerProfileData {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number;
  jersey_number: string | null;
  team_name: string | null;
  shirt_size: string | null;
  short_size: string | null;
  sweatshirt_size: string | null;
  shooting_shirt_size: string | null;
}

interface SizeState {
  shirtSize: string;
  shortSize: string;
  sweatshirtSize: string;
  shootingShirtSize: string;
}

function toSizeState(p: PlayerProfileData): SizeState {
  return {
    shirtSize: p.shirt_size ?? "",
    shortSize: p.short_size ?? "",
    sweatshirtSize: p.sweatshirt_size ?? "",
    shootingShirtSize: p.shooting_shirt_size ?? "",
  };
}

const SIZE_FIELDS: Array<{
  key: keyof SizeState;
  label: string;
  dbKey: keyof Pick<
    PlayerProfileData,
    "shirt_size" | "short_size" | "sweatshirt_size" | "shooting_shirt_size"
  >;
}> = [
  { key: "shirtSize", label: "Shirt", dbKey: "shirt_size" },
  { key: "shortSize", label: "Short", dbKey: "short_size" },
  { key: "sweatshirtSize", label: "Sweatshirt", dbKey: "sweatshirt_size" },
  { key: "shootingShirtSize", label: "Shooting Shirt", dbKey: "shooting_shirt_size" },
];

export default function PlayerProfileCard({
  player,
  onUpdated,
}: {
  player: PlayerProfileData;
  onUpdated: (next: PlayerProfileData) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [sizes, setSizes] = useState<SizeState>(() => toSizeState(player));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function startEdit() {
    setSizes(toSizeState(player));
    setError("");
    setSavedAt(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError("");
    setSizes(toSizeState(player));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/portal/update-player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.id,
          shirtSize: sizes.shirtSize,
          shortSize: sizes.shortSize,
          sweatshirtSize: sizes.sweatshirtSize,
          shootingShirtSize: sizes.shootingShirtSize,
        }),
      });

      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        setError(result.error || "Couldn't save. Please try again.");
        setSaving(false);
        return;
      }

      onUpdated({
        ...player,
        shirt_size: sizes.shirtSize || null,
        short_size: sizes.shortSize || null,
        sweatshirt_size: sizes.sweatshirtSize || null,
        shooting_shirt_size: sizes.shootingShirtSize || null,
      });
      setEditing(false);
      setSavedAt(Date.now());
      setSaving(false);
      // Auto-clear the "Saved" indicator after a few seconds
      setTimeout(() => {
        setSavedAt((current) => (current && Date.now() - current >= 2800 ? null : current));
      }, 3000);
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto mt-6 rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="section-label mb-2">Player Profile</p>
            <h3 className="text-lg font-bold text-[#1A1A1A] tracking-tight">
              {player.first_name} {player.last_name}
              {player.jersey_number && (
                <span className="ml-2 text-[#9CA3AF] font-semibold">#{player.jersey_number}</span>
              )}
            </h3>
            <p className="text-sm text-[#6B7280] mt-0.5">
              {player.team_name ? `${player.team_name} · ` : ""}Class of {player.graduation_year}
            </p>
          </div>
          {!editing ? (
            <button
              type="button"
              onClick={startEdit}
              className="min-h-[44px] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-blue rounded-lg border border-accent-blue/30 hover:bg-accent-blue/5 transition-all duration-200"
            >
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="min-h-[44px] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B7280] rounded-lg border border-[#E5E7EB] hover:bg-[#F8F9FA] transition-all duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="min-h-[44px] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white bg-accent-blue rounded-lg shadow-[0_2px_8px_rgba(74,144,217,0.35)] hover:shadow-[0_2px_12px_rgba(74,144,217,0.5)] transition-all duration-200 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </div>

        {/* Sizes */}
        <div className="rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9CA3AF]">
              Gear Sizing
            </p>
            {savedAt && !editing && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-accent-green">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {SIZE_FIELDS.map((field) => (
              <div key={field.key} className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wide text-[#9CA3AF] mb-1">
                  {field.label}
                </span>
                {editing ? (
                  <select
                    value={sizes[field.key]}
                    onChange={(e) =>
                      setSizes((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 bg-white"
                  >
                    <option value="">—</option>
                    {SIZE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm font-semibold text-[#1A1A1A]">
                    {player[field.dbKey] || <span className="text-[#9CA3AF] font-normal">Not set</span>}
                  </span>
                )}
              </div>
            ))}
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-500">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
