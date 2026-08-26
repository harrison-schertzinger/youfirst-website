"use client";

import { useState } from "react";
import { PLAYER_STATUS_LABELS } from "@/lib/player-status";

/**
 * The first thing a family completes.
 *
 * Was two tiles: a name banner across the top and a separate "Player Profile"
 * card stranded at the bottom of the page repeating the same four facts. They
 * are one thing now — the identity band IS the form, and it opens.
 *
 * It carries a completion state because "go to the portal and finish your
 * profile" has to be a checkable instruction. A parent can see what is missing
 * without opening anything, and the club can see who has not finished.
 *
 * WHOSE DETAILS THESE ARE: the signed-in parent's own, and only hers. The portal
 * never returns a co-guardian's email, phone or address, and the save endpoint
 * writes session.guardianId rather than any id from the browser. A second parent
 * fills in her own by signing in herself.
 */

export interface ProfilePlayer {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number;
  position: string | null;
  jersey_number: string | null;
  photo_url: string | null;
  team_name: string | null;
  status: string;
  shirt_size: string | null;
  short_size: string | null;
  sweatshirt_size: string | null;
  shooting_shirt_size: string | null;
}

export interface ProfileGuardian {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  relationship: string | null;
}

const SIZES = ["YS", "YM", "YL", "XS", "S", "M", "L", "XL", "XXL"];

const SIZE_FIELDS = [
  ["shirt_size", "Shirt"],
  ["short_size", "Shorts"],
  ["sweatshirt_size", "Sweatshirt"],
  ["shooting_shirt_size", "Shooting shirt"],
] as const;

/** What still has to be filled in. Empty array means the profile is done. */
function missingItems(
  player: ProfilePlayer,
  guardian: ProfileGuardian | null,
): string[] {
  const missing: string[] = [];
  for (const [field, label] of SIZE_FIELDS) {
    if (!player[field]) missing.push(label.toLowerCase() + " size");
  }
  if (!guardian?.first_name || !guardian?.last_name) missing.push("your name");
  if (!guardian?.phone) missing.push("your phone number");
  return missing;
}

export interface CoGuardian {
  id: string;
  first_name: string;
  last_name: string;
  relationship: string | null;
}

export default function PlayerProfileTile({
  player,
  guardian,
  coGuardians = [],
  onPlayerUpdated,
  onGuardianUpdated,
  onCoGuardianAdded,
  preview = false,
}: {
  player: ProfilePlayer;
  guardian: ProfileGuardian | null;
  /** Everyone attached to this athlete, by name only. Never contact details. */
  coGuardians?: CoGuardian[];
  onPlayerUpdated: (next: ProfilePlayer) => void;
  onGuardianUpdated: (next: ProfileGuardian) => void;
  onCoGuardianAdded?: () => void;
  preview?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [sizes, setSizes] = useState({
    shirt_size: player.shirt_size ?? "",
    short_size: player.short_size ?? "",
    sweatshirt_size: player.sweatshirt_size ?? "",
    shooting_shirt_size: player.shooting_shirt_size ?? "",
  });
  const [contact, setContact] = useState({
    firstName: guardian?.first_name ?? "",
    lastName: guardian?.last_name ?? "",
    phone: guardian?.phone ?? "",
    relationship: guardian?.relationship ?? "",
  });

  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [newParent, setNewParent] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    relationship: "",
  });

  async function addParent() {
    if (preview) {
      setAddError("Preview only — adding is disabled on this screen.");
      return;
    }
    setAddBusy(true);
    setAddError("");
    try {
      const res = await fetch("/api/portal/add-guardian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: player.id, ...newParent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddError(
          typeof data.error === "string" ? data.error : "Couldn’t add that.",
        );
        setAddBusy(false);
        return;
      }
      setNewParent({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        relationship: "",
      });
      setAdding(false);
      onCoGuardianAdded?.();
    } catch {
      setAddError("Network error. Please try again.");
    }
    setAddBusy(false);
  }

  const missing = missingItems(player, guardian);
  const complete = missing.length === 0;

  const initials =
    `${player.first_name.charAt(0)}${player.last_name.charAt(0)}`.toUpperCase();

  const statusTone =
    player.status === "active"
      ? "bg-[#34D399]/12 text-[#0F9D6E]"
      : player.status === "injured" || player.status === "hold"
      ? "bg-[#F59E0B]/12 text-[#B45309]"
      : "bg-[#F0F1F3] text-[#6B7280]";

  const meta = [
    `Class of ${player.graduation_year}`,
    player.position,
    player.team_name,
  ].filter(Boolean);

  async function save() {
    if (preview) {
      setError("Preview only — saving is disabled on this screen.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const [playerRes, guardianRes] = await Promise.all([
        fetch("/api/portal/update-player", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: player.id, ...sizes }),
        }),
        fetch("/api/portal/update-guardian", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contact),
        }),
      ]);

      if (!playerRes.ok || !guardianRes.ok) {
        const which = !playerRes.ok ? playerRes : guardianRes;
        const data = await which.json().catch(() => ({}));
        setError(
          typeof data.error === "string" ? data.error : "Couldn’t save that.",
        );
        setSaving(false);
        return;
      }

      const gData = await guardianRes.json().catch(() => ({}));
      onPlayerUpdated({ ...player, ...sizes });
      if (gData.guardian) onGuardianUpdated(gData.guardian);
      setSavedAt(Date.now());
      setOpen(false);
    } catch {
      setError("Network error. Please try again.");
    }
    setSaving(false);
  }

  return (
    <section className="rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full text-left px-6 py-5 flex items-center gap-5 hover:bg-[#FAFBFC] transition-colors"
      >
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#EDF5FB] to-[#D8E9F5] flex items-center justify-center">
            {player.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={player.photo_url}
                alt=""
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <span className="text-[19px] font-bold tracking-tight text-[#4B9CD3]">
                {initials}
              </span>
            )}
          </div>
          {player.jersey_number && (
            <span className="absolute -bottom-1.5 -right-1.5 min-w-[24px] h-[24px] px-1.5 rounded-lg bg-[#0A0A0B] text-white text-[11px] font-bold tabular-nums flex items-center justify-center">
              {player.jersey_number}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-[20px] sm:text-[24px] font-bold tracking-tight leading-tight text-[#1A1A1A] truncate">
            {player.first_name} {player.last_name}
          </h1>
          <p className="mt-0.5 text-[13px] text-[#6B7280] truncate">
            {meta.join(" · ")}
          </p>

          <p className="mt-1.5 flex items-center gap-1.5 text-[12px]">
            {complete ? (
              <>
                <span className="text-[#0F9D6E]">✓</span>
                <span className="font-medium text-[#0F9D6E]">
                  Profile complete
                </span>
              </>
            ) : (
              <>
                <span
                  aria-hidden
                  className="inline-block w-[7px] h-[7px] rounded-full bg-[#F59E0B]"
                />
                <span className="font-medium text-[#B45309]">
                  {missing.length} to finish
                </span>
                <span className="text-[#9CA3AF] truncate">
                  — {missing.join(", ")}
                </span>
              </>
            )}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${statusTone}`}
        >
          {PLAYER_STATUS_LABELS[player.status] ?? player.status}
        </span>

        <span
          aria-hidden
          className={`shrink-0 text-[#9CA3AF] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="border-t border-[#F0F1F3] px-6 py-5 space-y-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF] mb-3">
              Gear sizing
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SIZE_FIELDS.map(([field, label]) => (
                <label key={field} className="block">
                  <span className="block text-[11px] text-[#6B7280] mb-1">
                    {label}
                  </span>
                  <select
                    value={sizes[field]}
                    onChange={(e) =>
                      setSizes((s) => ({ ...s, [field]: e.target.value }))
                    }
                    className="w-full rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]/20 focus:border-[#4B9CD3]"
                  >
                    <option value="">—</option>
                    {SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF] mb-3">
              Your contact details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="First name">
                <input
                  value={contact.firstName}
                  onChange={(e) =>
                    setContact((c) => ({ ...c, firstName: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]/20 focus:border-[#4B9CD3]"
                />
              </Field>
              <Field label="Last name">
                <input
                  value={contact.lastName}
                  onChange={(e) =>
                    setContact((c) => ({ ...c, lastName: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]/20 focus:border-[#4B9CD3]"
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  value={contact.phone}
                  onChange={(e) =>
                    setContact((c) => ({ ...c, phone: e.target.value }))
                  }
                  placeholder="(513) 555-0123"
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]/20 focus:border-[#4B9CD3]"
                />
              </Field>
              <Field label="Relationship">
                <input
                  value={contact.relationship}
                  onChange={(e) =>
                    setContact((c) => ({ ...c, relationship: e.target.value }))
                  }
                  placeholder="Mother, Father, Guardian"
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]/20 focus:border-[#4B9CD3]"
                />
              </Field>
            </div>
            <p className="mt-2 text-[12px] text-[#9CA3AF]">
              Signed in as {guardian?.email ?? "—"}.
            </p>
          </div>

          {/* Parents and guardians attached to this athlete. Names only — the
              portal has never shown one parent another's contact details, and
              adding someone does not open a window onto their record. */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF] mb-3">
              Parents &amp; guardians
            </p>

            {coGuardians.length > 0 && (
              <ul className="mb-3 space-y-1.5">
                {coGuardians.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-center justify-between rounded-lg bg-[#FAFBFC] px-3 py-2"
                  >
                    <span className="text-[13px] text-[#1A1A1A]">
                      {g.first_name} {g.last_name}
                    </span>
                    {g.relationship && (
                      <span className="text-[12px] text-[#9CA3AF]">
                        {g.relationship}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {adding ? (
              <div className="rounded-xl border border-[#E5E7EB] p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="First name">
                    <input
                      value={newParent.firstName}
                      onChange={(e) =>
                        setNewParent((n) => ({ ...n, firstName: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]/20 focus:border-[#4B9CD3]"
                    />
                  </Field>
                  <Field label="Last name">
                    <input
                      value={newParent.lastName}
                      onChange={(e) =>
                        setNewParent((n) => ({ ...n, lastName: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]/20 focus:border-[#4B9CD3]"
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      value={newParent.email}
                      onChange={(e) =>
                        setNewParent((n) => ({ ...n, email: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]/20 focus:border-[#4B9CD3]"
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      type="tel"
                      value={newParent.phone}
                      onChange={(e) =>
                        setNewParent((n) => ({ ...n, phone: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]/20 focus:border-[#4B9CD3]"
                    />
                  </Field>
                  <Field label="Relationship">
                    <input
                      value={newParent.relationship}
                      onChange={(e) =>
                        setNewParent((n) => ({ ...n, relationship: e.target.value }))
                      }
                      placeholder="Father, Guardian"
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]/20 focus:border-[#4B9CD3]"
                    />
                  </Field>
                </div>

                {addError && (
                  <p role="alert" className="text-[12px] text-[#EF4444]">
                    {addError}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={addParent}
                    disabled={addBusy}
                    className="px-3.5 py-2 rounded-lg bg-[#1A1A1A] text-white text-[12px] font-semibold hover:bg-black disabled:opacity-60 transition-colors"
                  >
                    {addBusy ? "Adding…" : "Add"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(false);
                      setAddError("");
                    }}
                    className="text-[12px] text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-[12px] text-[#9CA3AF]">
                  They will be able to sign in with this email and see the same
                  portal.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="text-[13px] font-medium text-[#4B9CD3] hover:text-[#3D87BC] transition-colors"
              >
                + Add a parent or guardian
              </button>
            )}
          </div>

          {error && (
            <p role="alert" className="text-[12px] text-[#EF4444]">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-[#4B9CD3] text-white text-[13px] font-semibold hover:bg-[#3D87BC] disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {savedAt && !saving && (
              <span className="text-[12px] text-[#0F9D6E]">Saved</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] text-[#6B7280] mb-1">{label}</span>
      {children}
    </label>
  );
}
