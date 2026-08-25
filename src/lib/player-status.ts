/**
 * What a player's status means — in one place, because two different questions
 * were being asked with the same string comparison.
 *
 *   "Is she ON THE ROSTER?"  → active, injured, or hold. She has a spot.
 *   "Is she PLAYING?"        → active only.
 *
 * Until 2026-08-25 there were only three values (active / inactive / alumni)
 * and every caller wrote `status === 'active'`, which answered both questions
 * at once and was right by accident. Adding `injured` and `hold` split them
 * apart: an injured athlete is on the team, is owed her spot, and must not be
 * swept in with athletes who left the club.
 *
 * Use isOnRoster() for anything about membership — rosters, portal linking,
 * player detail, send lists. Reserve a bare 'active' check for the narrow case
 * where you genuinely mean "available to play right now", e.g. tournament
 * selection.
 */

/** On the team. Has a spot. Appears on the roster. */
export const ROSTER_STATUSES = ["active", "injured", "hold"] as const;

/** No longer with the club. */
export const DEPARTED_STATUSES = ["inactive", "alumni"] as const;

export const ALL_PLAYER_STATUSES = [
  ...ROSTER_STATUSES,
  ...DEPARTED_STATUSES,
] as const;

export type PlayerStatus = (typeof ALL_PLAYER_STATUSES)[number];

/** True when the athlete is on the roster — playing, injured, or on hold. */
export function isOnRoster(status: string | null | undefined): boolean {
  return !!status && (ROSTER_STATUSES as readonly string[]).includes(status);
}

/** True only when she is available to play right now. */
export function isPlaying(status: string | null | undefined): boolean {
  return status === "active";
}

export const PLAYER_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  injured: "Injured",
  hold: "On Hold",
  inactive: "Inactive",
  alumni: "Alumni",
};
