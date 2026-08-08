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
  "no_tryout",
  "no_registration",
  "declined",
] as const;
export type PlacementTier = (typeof PLACEMENT_TIERS)[number];

/** The tiers that put an athlete ON a class team (and so write placed_team). */
export const TEAM_TIERS = ["elite", "blue", "elite_youth", "elite_training"] as const;

export function isPlacementTier(v: string): v is PlacementTier {
  return (PLACEMENT_TIERS as readonly string[]).includes(v);
}

/**
 * The one Blue team. It spans these classes; an athlete from either lands on
 * the same roster, and its shape is counted across both together.
 */
export const BLUE_CLASSES = [2029, 2030] as const;
export const BLUE_TEAM_NAME = "You First Blue";

export function isBlueClass(year: number | null): boolean {
  return year != null && (BLUE_CLASSES as readonly number[]).includes(year);
}

/**
 * THE ONE PRINCIPLE THIS FILE ENFORCES: every team in this club is an Elite
 * team. There is no development program, no B squad, no lesser tier with a
 * softer name. A girl tried out for a team and she made a team — the 2032
 * Elite team, the 2033/2034 Elite team.
 *
 * "Elite Development Program" is RETIRED as a team name. It is gone from every
 * surface a human being can see.
 *
 * What survives is `elite_youth` as a STORED VALUE, and its only remaining job
 * is to pick which letter a family receives: a 2034 family must never get the
 * 2029 college-recruiting letter. It picks a letter. It never names a team.
 *
 * The class boundary below is where the two letters divide, and it matches the
 * data exactly: every athlete at 2031 and younger already carries elite_youth,
 * every athlete at 2030 and older carries elite or blue.
 */
export const YOUTH_LETTER_MIN_CLASS = 2031;

/**
 * Which letter a class receives — and therefore which value a placement on that
 * class's Elite team stores. THE ONLY REASON THIS FUNCTION EXISTS. Callers that
 * want a name for the team want tierLabel().
 */
export function teamTierForClass(year: number): "elite" | "elite_youth" {
  return year >= YOUTH_LETTER_MIN_CLASS ? "elite_youth" : "elite";
}

/**
 * Display labels, exactly per the naming standard.
 *
 * Both Elite values render the same way — as the class's Elite team — because
 * they ARE the same thing to a family. `elite_youth` renders through
 * groupKeyForYear so 2033 and 2034 land on the single name they share, exactly
 * as Blue does for 2029 and 2030. Two teams span two grad years each; both say
 * so the same way.
 */
export function tierLabel(tier: string | null, classYear: number | null): string {
  switch (tier) {
    case "elite":
      return classYear != null ? `${classYear} Elite` : "Elite";
    case "elite_youth":
      // 2033 + 2034 are ONE team — "2033/2034 Elite", never "2034 Elite".
      return classYear != null ? `${groupKeyForYear(classYear)} Elite` : "Elite";
    case "blue":
      // One team across 2029 and 2030 — never "{class} Blue".
      return BLUE_TEAM_NAME;
    case "elite_training":
      return "Elite Training Group";
    case "no_tryout":
      return "No Tryout";
    case "no_registration":
      return "No Registration";
    case "declined":
      return "Declined";
    default:
      return "Pending";
  }
}

/** One selectable placement: what it stores, and what a human reads. */
export interface TeamOption {
  value: "elite" | "blue" | "elite_youth";
  label: string;
}

/**
 * The teams that actually EXIST for a class — the whole option list a placement
 * dropdown may offer.
 *
 * Exactly one Elite team per class, plus Blue where Blue runs. The screen can no
 * longer offer "2033 Elite" and "Elite Development Program" to the same athlete,
 * because after this there is only ever one of them and they were always the
 * same team.
 *
 * Returns [] when the class is outside the table's placed_team rails, so the
 * caller offers no team rather than one that cannot be written.
 */
export function teamOptionsFor(
  table: "players" | "tryout_registrations",
  classYear: number | null,
): TeamOption[] {
  if (classYear == null || !placedTeamOk(table, classYear)) return [];
  const tier = teamTierForClass(classYear);
  const options: TeamOption[] = [{ value: tier, label: tierLabel(tier, classYear) }];
  if (isBlueClass(classYear)) options.push({ value: "blue", label: BLUE_TEAM_NAME });
  return options;
}

/**
 * Payment state for the current season, resolved through player_id against
 * the payments/payment_plans tables (player_balances). 'unknown' means the
 * athlete has no player link so payment CANNOT be resolved — it is not the
 * same fact as 'none' (a linked player with nothing on file).
 */
export type PaidStatus = "paid" | "partial" | "none" | "unknown";

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
  | "not_registered"
  /** Returning row with no registration, payment, plan, or team on file. */
  | "no_history";

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
  paidStatus: PaidStatus;
  /** Human line behind the pill — amounts, season, or why it's unknown. */
  paidDetail: string | null;
  placedTeam: string | null;
  placementTier: string | null;
  source: "tryout" | "recruiting" | null;
  /** Returning band: she also registered for tryouts this season. */
  registered: boolean;
  /** Registration-backed athletes: the tryout fee actually went through. */
  regPaid: boolean;
  /** Future makeup tryout date (ISO) — registered but not yet evaluated. */
  makeupDate: string | null;
  /** Placement email actually sent (hermes log), with the tier it offered. */
  placementEmail: { at: string; tier: string | null } | null;
  /**
   * The registration row that carries this athlete's notes: her own row for
   * new athletes, the absorbed registration for returning ones, null when a
   * returning player never registered (players has no notes column).
   */
  regId: string | null;
  createdAt: string;
  flags: RosterFlag[];
  dupOf: DupCandidate[];
  noteText: string | null;
}

export interface AutoResolvedEntry {
  keptKey: string;
  keptName: string;
  droppedName: string;
}

export interface RosterData {
  athletes: RosterAthlete[];
  /** Duplicates collapsed on this read — the audit line lives in the
   *  superseded row's notes; reversal is deleting that note. */
  autoResolved: AutoResolvedEntry[];
  fetchedAt: string;
}

/**
 * Which record survives a merge. Canonical beats convenient: a returning
 * player always wins; then a confirmed record, a paid registration, the more
 * complete record, the fuller name, the earlier registration. Used by both
 * the server's auto-resolve and the one-click merge control so they never
 * disagree.
 */
export function pickKeeper(a: RosterAthlete, b: RosterAthlete): [RosterAthlete, RosterAthlete] {
  const completeness = (x: RosterAthlete) =>
    [x.parentEmail, x.parentPhone, x.position, x.school, x.jersey, x.parentName].filter(
      Boolean,
    ).length;
  const nameWeight = (x: RosterAthlete) =>
    x.name.trim().split(/\s+/).length * 100 + x.name.trim().length;
  const rank = (x: RosterAthlete) =>
    (x.band === "returning" ? 1_000_000 : 0) +
    (x.confirmed ? 100_000 : 0) +
    (x.regPaid ? 10_000 : 0) +
    completeness(x) * 1_000 +
    nameWeight(x);
  if (rank(a) === rank(b)) {
    return a.createdAt <= b.createdAt ? [a, b] : [b, a];
  }
  return rank(a) > rank(b) ? [a, b] : [b, a];
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

/** List grouping order — scarce positions first, so gaps surface at the top. */
export const POSITION_ORDER = ["Goalie", "Defense", "Midfield", "Attack"] as const;

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
