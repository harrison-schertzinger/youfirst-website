/**
 * YOU. FIRST Elite Lacrosse — Roster Confirmation
 * Single source of truth for the roster-confirmation flow: the grad-year →
 * team mapping, uniform size scale, and phone normalization. Referenced by
 * the /roster page, the confirmation form, and the /api/roster/confirm route.
 *
 * A family lands on /roster after their daughter is told she's in (July 25
 * tryout or a free morning evaluation). The page captures everything needed
 * to lock her onto a roster — NO payment at this step (2026-07-13). The
 * payment columns on roster_confirmations sit dormant until the separate
 * gear charge flow populates them later.
 */

/** Grad years with a team to confirm onto — 2028 (oldest) through 2034. */
export const ROSTER_GRAD_YEAR_MIN = 2028;
export const ROSTER_GRAD_YEAR_MAX = 2034;
export const ROSTER_GRAD_YEAR_OPTIONS: number[] = Array.from(
  { length: ROSTER_GRAD_YEAR_MAX - ROSTER_GRAD_YEAR_MIN + 1 },
  (_, i) => ROSTER_GRAD_YEAR_MIN + i,
);

export function isRosterGradYear(year: number | null | undefined): boolean {
  return (
    year != null &&
    !Number.isNaN(year) &&
    year >= ROSTER_GRAD_YEAR_MIN &&
    year <= ROSTER_GRAD_YEAR_MAX
  );
}

// ── Teams ────────────────────────────────────────────────────────────────
export const ROSTER_TEAMS = ["development", "elite"] as const;
export type RosterTeam = (typeof ROSTER_TEAMS)[number];

export function isRosterTeam(v: unknown): v is RosterTeam {
  return typeof v === "string" && (ROSTER_TEAMS as readonly string[]).includes(v);
}

/**
 * Grad year → team. 2032/2033 = Development (2033 is the youngest team),
 * 2034 = Development playing up, 2028–2031 = Elite. The form pre-selects
 * this and lets the family confirm.
 */
export function teamForGradYear(year: number): RosterTeam {
  return year >= 2032 ? "development" : "elite";
}

export interface RosterTeamInfo {
  key: RosterTeam;
  name: string;
  /** Who the team is for — matches the Teams page. */
  classes: string;
  /** "What happens next" line for the success screen. */
  nextLine: string;
}

export const ROSTER_TEAM_INFO: Record<RosterTeam, RosterTeamInfo> = {
  development: {
    key: "development",
    name: "Development",
    classes: "Classes 2032 & 2033 · 2034s who are ready play up",
    nextLine:
      "The Development team debuts at its first tournaments next June — optional training starts this September at the Cincinnati Lacrosse Academy.",
  },
  elite: {
    key: "elite",
    name: "Elite",
    classes: "Classes 2028–2031",
    nextLine: "The Elite team competes this year — season details are on the way.",
  },
};

/** The mapping note shown under the team confirm, per grad year. */
export function teamNoteForGradYear(year: number): string {
  if (year === 2034) return "Class of 2034 plays up on the Development team.";
  if (year >= 2032) return `Class of ${year} plays on the Development team.`;
  return `Class of ${year} plays on the Elite team.`;
}

// ── Uniform sizes ────────────────────────────────────────────────────────
// PENDING HARRISON: standard youth + adult scale for now — swap in the
// supplier's exact size scale here (values are CHECK-constrained in the DB;
// see scripts/roster-confirmations-migration.sql).
export const UNIFORM_SIZES = [
  { value: "YS", label: "Youth S" },
  { value: "YM", label: "Youth M" },
  { value: "YL", label: "Youth L" },
  { value: "AXS", label: "Adult XS" },
  { value: "AS", label: "Adult S" },
  { value: "AM", label: "Adult M" },
  { value: "AL", label: "Adult L" },
  { value: "AXL", label: "Adult XL" },
  { value: "AXXL", label: "Adult XXL" },
] as const;

export type UniformSize = (typeof UNIFORM_SIZES)[number]["value"];

const SIZE_VALUES: ReadonlySet<string> = new Set(UNIFORM_SIZES.map((s) => s.value));

export function isUniformSize(v: unknown): v is UniformSize {
  return typeof v === "string" && SIZE_VALUES.has(v);
}

// ── Phone normalization ──────────────────────────────────────────────────
/**
 * Normalize a US phone number to E.164 (+1XXXXXXXXXX) for clean storage.
 * Accepts "(513) 575-6174", "513-575-6174", "1 513 575 6174", "+15135756174".
 * Returns null when it isn't a valid 10-digit US number.
 */
export function normalizeUsPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
