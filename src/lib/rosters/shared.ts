/**
 * Roster CRM — vocabulary shared by server and client. Pure data and pure
 * functions only; anything that touches Supabase or env vars lives in
 * ./data.ts so the client bundle never imports it.
 */

// ── Placement vocabulary ──────────────────────────────────────────────────

export const PLACEMENT_TIERS = [
  "elite",
  "blue",
  "elite_youth",
  "elite_training",
  "declined",
] as const;
export type PlacementTier = (typeof PLACEMENT_TIERS)[number];

export function isPlacementTier(v: string): v is PlacementTier {
  return (PLACEMENT_TIERS as readonly string[]).includes(v);
}

/** Display labels, exactly per the naming standard. */
export function tierLabel(tier: string | null, classYear: number | null): string {
  switch (tier) {
    case "elite":
      return classYear != null ? `${classYear} Elite` : "Elite";
    case "blue":
      return classYear != null ? `${classYear} Blue` : "Blue";
    case "elite_youth":
      return "Elite Youth Program";
    case "elite_training":
      return "Elite Training Group";
    case "declined":
      return "Declined";
    default:
      return "Pending";
  }
}

/**
 * "No Tryout" / "No Registration" are decisions with no legal home in
 * placement_tier (five values, fixed) or pipeline_status (six values, fixed),
 * so they live as a machine tag in the registration's notes and map to
 * pipeline_status 'passed' — out of the send path, label round-trips.
 */
export const DECISION_TAGS: Record<string, string> = {
  no_tryout: "[decision:no_tryout]",
  no_registration: "[decision:no_registration]",
};
export type Decision = "no_tryout" | "no_registration";

export function decisionFromNotes(notes: string | null): Decision | null {
  if (!notes) return null;
  if (notes.includes(DECISION_TAGS.no_tryout)) return "no_tryout";
  if (notes.includes(DECISION_TAGS.no_registration)) return "no_registration";
  return null;
}

export function stripDecisionTags(notes: string | null): string | null {
  if (!notes) return notes;
  let out = notes;
  for (const tag of Object.values(DECISION_TAGS)) {
    out = out.split(tag).join("");
  }
  out = out.replace(/\s+\|\s*$/, "").replace(/^\s*\|\s+/, "").trim();
  return out.length > 0 ? out : null;
}

export function decisionLabel(d: Decision): string {
  return d === "no_tryout" ? "No Tryout" : "No Registration";
}

// Mirrors of the live CHECK constraints — placed_team rails per table.
export const REG_PLACED_TEAM_MIN = 2027;
export const REG_PLACED_TEAM_MAX = 2034;
export const PLAYER_PLACED_TEAM_RE = /^20[2-3][0-9]$/;

export function regPlacedTeamOk(year: number): boolean {
  return year >= REG_PLACED_TEAM_MIN && year <= REG_PLACED_TEAM_MAX;
}

/**
 * Whether a class-team year is writable for a given table. Registrations are
 * hard-constrained to 2027–2034 by the DB; players' constraint is looser
 * (20[2-3][0-9]) but nothing moves above the oldest real class — 2026 is a
 * graduation, not a team.
 */
export function placedTeamOk(
  table: "players" | "tryout_registrations",
  year: number,
): boolean {
  if (table === "tryout_registrations") return regPlacedTeamOk(year);
  return PLAYER_PLACED_TEAM_RE.test(String(year)) && year >= REG_PLACED_TEAM_MIN;
}

// ── The unified athlete ───────────────────────────────────────────────────

export type RosterFlag =
  | "no_contact"
  | "no_grad_year"
  | "no_position"
  | "clipboard"
  | "not_registered";

export interface DupCandidate {
  key: string;
  name: string;
  detail: string;
  /** The candidate row that a merge would keep. */
  keepTable: "players" | "tryout_registrations";
  keepId: string;
}

export interface RosterAthlete {
  key: string; // "player:<id>" | "reg:<id>"
  table: "players" | "tryout_registrations";
  id: string;
  band: "returning" | "new";
  name: string;
  gradYear: number | null;
  /** The tab she appears on: placed_team if set, else graduation year. */
  classYear: number | null;
  position: string | null;
  school: string | null;
  jersey: string | null;
  parentName: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
  confirmed: boolean;
  paid: boolean;
  placedTeam: string | null;
  placementTier: string | null;
  decision: Decision | null;
  source: "tryout" | "recruiting" | null;
  /** Returning band: she also registered for tryouts this season. */
  registered: boolean;
  createdAt: string;
  flags: RosterFlag[];
  dupOf: DupCandidate[];
  noteText: string | null;
}

export interface RosterData {
  athletes: RosterAthlete[];
  fetchedAt: string;
}

// ── Class grouping ────────────────────────────────────────────────────────

/**
 * 2033 and 2034 are one group on screen — nine athletes, one tab. Display
 * grouping only; graduation_year stays accurate on every record.
 */
export function groupKeyForYear(year: number): string {
  return year === 2033 || year === 2034 ? "2033/2034" : String(year);
}

export const POSITION_OPTIONS = ["Attack", "Midfield", "Defense", "Goalie"] as const;

// ── Sorting + formatting helpers ──────────────────────────────────────────

/** "Ellie Van Der Berg" → sort by last word, then the rest. */
export function nameSortKey(name: string): string {
  const parts = name.trim().split(/\s+/);
  const last = parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? "";
  return `${last.toLowerCase()} ${name.toLowerCase()}`;
}

export function formatPhone(raw: string | null): string {
  if (!raw) return "—";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

// ── Roster shape targets (construction panel) ─────────────────────────────

export interface PositionTarget {
  position: string;
  min: number;
  max: number;
}

export const ROSTER_SHAPE: PositionTarget[] = [
  { position: "Goalie", min: 1, max: 1 },
  { position: "Attack", min: 4, max: 6 },
  { position: "Midfield", min: 5, max: 6 },
  { position: "Defense", min: 4, max: 4 },
];

export const ROSTER_SIZE_MIN = 14;
export const ROSTER_SIZE_MAX = 17;
