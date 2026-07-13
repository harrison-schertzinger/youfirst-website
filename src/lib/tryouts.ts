/**
 * YOU. FIRST Elite Lacrosse — 2026 Tryouts
 * Single source of truth for tryout dates, the grad-year → track mapping,
 * positions, and display lines. Referenced by the /tryouts page, the
 * registration form, the register API route, the success page, and the
 * confirmation email. Change a date HERE and it updates everywhere.
 *
 * 2026-07-13: Tryouts are COMPLETELY FREE — the $50 Stripe fee was removed.
 * Two OPTIONS for every grad year (2028–2038), anyone can pick either:
 *   • Free morning evaluations — the PRIMARY path. Every morning through
 *     August 7: evaluated on the spot, hear that day. No fixed date. The form
 *     defaults here.
 *   • Saturday, July 25 — our one set tryout date (5:00–6:30 PM, Academy),
 *     for players who prefer a scheduled tryout or are traveling in.
 * Teams by grad year: 2028–2031 Elite · 2032–2034 Development (2034 plays up)
 * · 2035 and younger Development / Youth.
 */

/**
 * ───────────────────────────────────────────────────────────────────────
 * PHOTO SWAP POINTS — change any filename below to swap that image. These are
 * the ONLY places the /tryouts photos are chosen; no component hardcodes a
 * path. Drop a new file in /public/images/team (or any /public path) and point
 * the key here. No logic changes needed.
 * ───────────────────────────────────────────────────────────────────────
 */
export const TRYOUT_PHOTOS = {
  /** Full-bleed cinematic hero background. */
  hero: "/images/team/tryouts-hero-defender.jpg",
  /** Heavily-darkened backdrop behind the two date cards. */
  datesBackground: "/images/team/DWW07819NEW.jpg",
  /** Mid-page emotional photo band ("build & bring the best"). */
  band: "/images/team/DSC09932_Original.JPG",
  /** Make-up section — warm, big-group / daytime Academy community shot. */
  makeup: "/images/team/IMG_8242.jpg",
  /** Top of the confirmation / success page. */
  success: "/images/team/DWW07763NEW.jpg",
} as const;

/** Venue for all tryouts and evaluations. */
export const TRYOUT_LOCATION = "Cincinnati Lacrosse Academy";

/** Positions offered on the tryout form (distinct from roster positions). */
export const TRYOUT_POSITIONS = [
  "Attack",
  "Midfield",
  "Defense",
  "Goalie",
  "Undecided",
] as const;

export type TryoutPosition = (typeof TRYOUT_POSITIONS)[number];

export function isTryoutPosition(v: unknown): v is TryoutPosition {
  return (
    typeof v === "string" &&
    (TRYOUT_POSITIONS as readonly string[]).includes(v)
  );
}

/**
 * A tryout session. `isoDate` is the canonical machine date stored in the DB;
 * `weekday` + `dateLabel` + `fullLabel` are what parents see on the page and in
 * the email. Keep `isoDate`, `weekday`, and the calendar consistent.
 */
export interface TryoutDate {
  id: "youth" | "older";
  group: string;
  /** Inclusive grad years this session covers. */
  gradYears: number[];
  weekday: string;
  dateLabel: string;
  /** "Saturday, July 25" — used in copy and the email. */
  fullLabel: string;
  /** Machine date stored in tryout_registrations.tryout_date (YYYY-MM-DD). */
  isoDate: string;
  /** Time window, e.g. "5:00–6:30 PM". */
  time: string;
  /** Venue. */
  location: string;
  /** Short blurb describing who belongs at this session. */
  audience: string;
}

export const TRYOUT_DATES: Record<"youth" | "older", TryoutDate> = {
  // LEGACY — the scheduled youth session (July 11) already happened. Kept so
  // historical registrations still render their correct date on the success
  // page and in the admin roster. Not linked from any live page.
  youth: {
    id: "youth",
    group: "Youth",
    gradYears: [2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038],
    weekday: "Saturday",
    dateLabel: "July 11",
    fullLabel: "Saturday, July 11",
    isoDate: "2026-07-11",
    time: "5:00–6:30 PM",
    location: TRYOUT_LOCATION,
    audience: "Grad years 2031, 2032, 2033 & younger",
  },
  older: {
    id: "older",
    group: "The Set Date",
    gradYears: [2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038],
    weekday: "Saturday",
    dateLabel: "July 25",
    fullLabel: "Saturday, July 25",
    isoDate: "2026-07-25",
    time: "5:00–6:30 PM",
    location: TRYOUT_LOCATION,
    audience:
      "Our one set tryout date. Great for older players and families traveling in.",
  },
};

/** The one set-date tryout session (Saturday, July 25). */
export const ELITE_TRYOUT = TRYOUT_DATES.older;

/**
 * Youth & development track — free open evaluations. Come any morning to the
 * Academy, get evaluated on the spot, hear the same day. No fixed date, no
 * charge. `endIso` is the last day of the window.
 */
export const YOUTH_EVALUATION = {
  headline: "Free Evaluations — Any Morning",
  dateLine: "Any morning, now through August 7",
  rangeLabel: "Now through August 7",
  time: "10:00 AM–12:00 PM",
  location: TRYOUT_LOCATION,
  endIso: "2026-08-07",
} as const;

/**
 * Make-up tryouts — for elite players (grad years 2027–2030) who can't make
 * July 25. A fixed 5-day block of mornings at the Academy. The parent picks
 * ONE of the five days below — no free date entry, no dates outside the block.
 */
export const MAKEUP_TRYOUT = {
  rangeLabel: "August 3–7",
  time: "8:00 AM–12:00 PM",
  location: TRYOUT_LOCATION,
} as const;

/** The only valid make-up days. `iso` is stored; `label` is shown in the dropdown. */
export const MAKEUP_DATE_OPTIONS = [
  { iso: "2026-08-03", label: "Monday, August 3, 2026" },
  { iso: "2026-08-04", label: "Tuesday, August 4, 2026" },
  { iso: "2026-08-05", label: "Wednesday, August 5, 2026" },
  { iso: "2026-08-06", label: "Thursday, August 6, 2026" },
  { iso: "2026-08-07", label: "Friday, August 7, 2026" },
] as const;

const MAKEUP_DATE_SET: ReadonlySet<string> = new Set(
  MAKEUP_DATE_OPTIONS.map((o) => o.iso),
);

/** Ordered list of scheduled sessions (incl. the legacy July 11 session). */
export const TRYOUT_DATE_LIST: TryoutDate[] = [
  TRYOUT_DATES.youth,
  TRYOUT_DATES.older,
];

/**
 * Grad-year options for the dropdown — 2028 (oldest) through 2038 (youngest).
 */
export const GRAD_YEAR_MIN = 2028;
export const GRAD_YEAR_MAX = 2038;
export const GRAD_YEAR_OPTIONS: number[] = Array.from(
  { length: GRAD_YEAR_MAX - GRAD_YEAR_MIN + 1 },
  (_, i) => GRAD_YEAR_MIN + i,
);

export function isOfferedGradYear(year: number | null | undefined): boolean {
  return (
    year != null && !Number.isNaN(year) && year >= GRAD_YEAR_MIN && year <= GRAD_YEAR_MAX
  );
}

/**
 * Grad-year → team label. 2028–2031 = Elite · 2032–2033 = Development ·
 * 2034 = Development (plays up with the 2033s) · 2035 and younger =
 * Development / Youth. Anyone can pick either tryout option — this only
 * names the team she's trying out for.
 */
export function teamForGradYear(year: number): string {
  if (year >= 2028 && year <= 2031) return "Elite";
  if (year === 2032 || year === 2033) return "Development";
  if (year === 2034) return "Development (plays up)";
  return "Development / Youth";
}

/** Informational cohort tag stored on the row (2028–2031 older, 2032+ youth). */
export function groupForGradYear(year: number): "older" | "youth" {
  return year <= 2031 ? "older" : "youth";
}

/** Find a tryout session by its stored isoDate (used by the success page). */
export function tryoutByIsoDate(isoDate: string | null | undefined): TryoutDate | null {
  if (!isoDate) return null;
  return TRYOUT_DATE_LIST.find((t) => t.isoDate === isoDate) ?? null;
}

// ── Tryout type (scheduled vs make-up vs open evaluation) ────────────────
export const TRYOUT_TYPES = ["scheduled", "makeup", "evaluation"] as const;
export type TryoutType = (typeof TRYOUT_TYPES)[number];

export function isTryoutType(v: unknown): v is TryoutType {
  return typeof v === "string" && (TRYOUT_TYPES as readonly string[]).includes(v);
}

/** Is `iso` one of the five allowed make-up days? */
export function isValidMakeupDate(iso: string | null | undefined): boolean {
  return !!iso && MAKEUP_DATE_SET.has(iso);
}

/**
 * Format a YYYY-MM-DD as "Saturday, July 11" with no timezone drift
 * (parsed at UTC noon, formatted in UTC). Safe on server and client.
 */
export function formatTryoutDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
  return dt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** A resolved, render-ready description of a registration's tryout. */
export interface TryoutDisplay {
  type: TryoutType;
  typeLabel: string;
  /** "Saturday, July 25" or "Any morning, now through August 7" */
  dateLine: string;
  /** "5:00–6:30 PM" or "Mornings" */
  time: string;
  location: string;
  /** "Saturday, July 25 · 5:00–6:30 PM · Cincinnati Lacrosse Academy" */
  fullLine: string;
}

/**
 * Resolve the display for any registration. Scheduled rows render from the
 * canonical session; make-up rows render the parent-picked date + the make-up
 * window; evaluation rows render the open-morning window. ONE place builds
 * these lines so the form, success page, email, and sheet all agree.
 */
export function describeTryout(input: {
  type: TryoutType;
  isoDate: string | null;
  group?: string | null;
}): TryoutDisplay {
  if (input.type === "evaluation") {
    return {
      type: "evaluation",
      typeLabel: "Evaluation",
      dateLine: YOUTH_EVALUATION.dateLine,
      time: YOUTH_EVALUATION.time,
      location: YOUTH_EVALUATION.location,
      fullLine: `${YOUTH_EVALUATION.dateLine} · ${YOUTH_EVALUATION.time} · ${YOUTH_EVALUATION.location}`,
    };
  }
  if (input.type === "makeup" && input.isoDate) {
    const dateLine = formatTryoutDate(input.isoDate);
    return {
      type: "makeup",
      typeLabel: "Make-up",
      dateLine,
      time: MAKEUP_TRYOUT.time,
      location: MAKEUP_TRYOUT.location,
      fullLine: `${dateLine} · ${MAKEUP_TRYOUT.time} · ${MAKEUP_TRYOUT.location}`,
    };
  }
  // scheduled — prefer the canonical session by isoDate, fall back to group.
  const t =
    tryoutByIsoDate(input.isoDate) ??
    (input.group === "youth"
      ? TRYOUT_DATES.youth
      : input.group === "older"
        ? TRYOUT_DATES.older
        : TRYOUT_DATES.older);
  return {
    type: "scheduled",
    typeLabel: "Scheduled",
    dateLine: t.fullLabel,
    time: t.time,
    location: t.location,
    fullLine: `${t.fullLabel} · ${t.time} · ${t.location}`,
  };
}
