/**
 * YOU. FIRST Elite Lacrosse — 2026 Tryouts
 * Single source of truth for tryout dates, the grad-year → date mapping,
 * positions, and the fee. Referenced by the /tryouts page, the registration
 * form, the checkout API route, the Stripe webhook, the success page, and the
 * confirmation email. Change a date or the fee HERE and it updates everywhere.
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
  hero: "/images/team/DSC09764_Original.JPG",
  /** Heavily-darkened backdrop behind the two date cards. */
  datesBackground: "/images/team/DWW07819NEW.jpg",
  /** Mid-page emotional photo band ("build & bring the best"). */
  band: "/images/team/DSC09932_Original.JPG",
  /** Make-up section — warm, big-group / daytime Academy community shot. */
  makeup: "/images/team/IMG_8242.jpg",
  /** Top of the confirmation / success page. */
  success: "/images/team/DWW07763NEW.jpg",
} as const;

/** Venue for all tryouts (scheduled + make-up). */
export const TRYOUT_LOCATION = "Cincinnati Lacrosse Academy";

/** Registration fee in cents (Stripe charges in cents). $50.00 */
export const TRYOUT_FEE_CENTS = 5000;

/** Human dollar label derived from the cents value. */
export const TRYOUT_FEE_LABEL = `$${(TRYOUT_FEE_CENTS / 100).toFixed(0)}`;

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
  /** "Saturday, July 11" — used in copy and the email. */
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
    group: "Older",
    gradYears: [2029, 2030],
    weekday: "Saturday",
    dateLabel: "July 25",
    fullLabel: "Saturday, July 25",
    isoDate: "2026-07-25",
    time: "5:00–6:30 PM",
    location: TRYOUT_LOCATION,
    audience: "Grad years 2029 & 2030",
  },
};

/**
 * Make-up tryouts — softer, welcoming, no scheduled cohort. A fixed 5-day block
 * of mornings at the Academy. The parent picks ONE of the five days below — no
 * free date entry, no dates outside the block.
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

/** Ordered list for rendering the two date sections. */
export const TRYOUT_DATE_LIST: TryoutDate[] = [
  TRYOUT_DATES.youth,
  TRYOUT_DATES.older,
];

/**
 * Grad-year options for the dropdown — 2029 (oldest) through 2038 (youngest).
 */
export const GRAD_YEAR_OPTIONS: number[] = Array.from(
  { length: 2038 - 2029 + 1 },
  (_, i) => 2029 + i,
);

/**
 * The smart touch: given a graduation year, which tryout does she belong at?
 * 2029–2030 → Older (Jul 25). 2031 and younger → Youth (Jul 11).
 * Returns null for years outside the offered range.
 */
export function tryoutForGradYear(year: number | null | undefined): TryoutDate | null {
  if (year == null || Number.isNaN(year)) return null;
  if (year <= 2030 && year >= 2029) return TRYOUT_DATES.older;
  if (year >= 2031 && year <= 2038) return TRYOUT_DATES.youth;
  return null;
}

/** Find a tryout session by its stored isoDate (used by the success page). */
export function tryoutByIsoDate(isoDate: string | null | undefined): TryoutDate | null {
  if (!isoDate) return null;
  return TRYOUT_DATE_LIST.find((t) => t.isoDate === isoDate) ?? null;
}

// ── Tryout type (scheduled vs make-up) ───────────────────────────────────
export const TRYOUT_TYPES = ["scheduled", "makeup"] as const;
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
  /** "Saturday, July 11" */
  dateLine: string;
  /** "5:00–6:30 PM" */
  time: string;
  location: string;
  /** "Saturday, July 11 · 5:00–6:30 PM · Cincinnati Lacrosse Academy" */
  fullLine: string;
}

/**
 * Resolve the display for any registration. Scheduled rows render from the
 * canonical session; make-up rows render the parent-picked date + the make-up
 * window. ONE place builds these lines so the form, success page, email, and
 * sheet all agree.
 */
export function describeTryout(input: {
  type: TryoutType;
  isoDate: string;
  group?: string | null;
}): TryoutDisplay {
  if (input.type === "makeup") {
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
        : TRYOUT_DATES.youth);
  return {
    type: "scheduled",
    typeLabel: "Scheduled",
    dateLine: t.fullLabel,
    time: t.time,
    location: t.location,
    fullLine: `${t.fullLabel} · ${t.time} · ${t.location}`,
  };
}
