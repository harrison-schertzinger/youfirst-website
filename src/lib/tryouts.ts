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
  /** Top of the confirmation / success page. */
  success: "/images/team/DWW07763NEW.jpg",
} as const;

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
  /** "Friday, July 11" — used in copy and the email. */
  fullLabel: string;
  /** Machine date stored in tryout_registrations.tryout_date (YYYY-MM-DD). */
  isoDate: string;
  /** Short blurb describing who belongs at this session. */
  audience: string;
}

export const TRYOUT_DATES: Record<"youth" | "older", TryoutDate> = {
  youth: {
    id: "youth",
    group: "Youth",
    gradYears: [2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038],
    weekday: "Friday",
    dateLabel: "July 11",
    fullLabel: "Friday, July 11",
    isoDate: "2026-07-11",
    audience: "Grad years 2031, 2032, 2033 & younger",
  },
  older: {
    id: "older",
    group: "Older",
    gradYears: [2029, 2030],
    weekday: "Friday",
    dateLabel: "July 25",
    fullLabel: "Friday, July 25",
    isoDate: "2026-07-25",
    audience: "Grad years 2029 & 2030",
  },
};

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
