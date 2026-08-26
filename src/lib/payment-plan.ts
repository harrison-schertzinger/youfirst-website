/**
 * Splitting a summer balance into dated installments.
 *
 * ── WHAT THIS IS AND IS NOT ─────────────────────────────────────────────────
 * These dates are a PLAN, not a standing order. Nothing charges a card on
 * February 1 — a parent comes back and pays each installment. The copy must
 * never imply otherwise, because a family who believes they are on autopay and
 * is not ends up in collections through no fault of their own.
 *
 * The AMOUNTS here are display only. Every cent that reaches Stripe is
 * re-derived server-side in /api/checkout from player_balances(); this module
 * cannot influence what is charged, only what is shown.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * An installment is a fraction of what the SEASON costs, not of what is left.
 * A quarter of the remainder would be a different, shrinking number every time,
 * and four of them would never clear the balance.
 */

/**
 * Everything is settled by this date. Harrison, 2026-08-26.
 * A constant rather than a column because it is one date for the whole club;
 * when that stops being true it belongs on the season, not on a player.
 */
export const FINAL_DUE_DATE = "2027-02-01";

export type PlanChoice = "full" | "half" | "quarter";

export interface Installment {
  /** YYYY-MM-DD */
  dueDate: string;
  amountCents: number;
}

export interface PaymentPlan {
  choice: PlanChoice;
  installments: Installment[];
  /** What each scheduled payment is, before the final true-up. */
  installmentCents: number;
}

const DIVISOR: Record<PlanChoice, number> = { full: 1, half: 2, quarter: 4 };

/**
 * The 1st of each month from the month after `today` through FINAL_DUE_DATE,
 * inclusive. These are the only dates an installment may fall on — a plan with
 * arbitrary dates is impossible for anyone to remember or chase.
 */
export function availableDueDates(today: Date = new Date()): string[] {
  const final = new Date(`${FINAL_DUE_DATE}T12:00:00Z`);
  const dates: string[] = [];

  const cursor = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1, 12),
  );
  while (cursor <= final) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return dates;
}

/**
 * Build the schedule for a choice.
 *
 * Installments are spread as evenly as whole months allow across the window,
 * always ending on the last available date. The FINAL payment is whatever
 * clears the balance — never a rounded figure — so the numbers on screen add up
 * to exactly what is owed and a family is never left holding four cents.
 *
 * Returns null when the choice cannot honestly be offered: no room left in the
 * calendar, or an installment that would settle the balance on its own.
 */
export function buildPlan(
  choice: PlanChoice,
  chargedCents: number,
  remainingCents: number,
  today: Date = new Date(),
): PaymentPlan | null {
  if (remainingCents <= 0) return null;

  const dates = availableDueDates(today);
  if (dates.length === 0) return null;

  if (choice === "full") {
    return {
      choice,
      installmentCents: remainingCents,
      installments: [{ dueDate: dates[dates.length - 1], amountCents: remainingCents }],
    };
  }

  const n = DIVISOR[choice];
  if (dates.length < n) return null; // not enough months left to spread it

  const installmentCents = Math.round(chargedCents / n);
  if (installmentCents <= 0 || installmentCents >= remainingCents) return null;

  // How many scheduled installments actually fit inside what is still owed.
  const whole = Math.floor(remainingCents / installmentCents);
  const count = Math.min(n, Math.max(2, whole + (remainingCents % installmentCents ? 1 : 0)));
  if (count < 2 || count > dates.length) return null;

  const chosen = Array.from({ length: count }, (_, i) =>
    dates[Math.round((i * (dates.length - 1)) / (count - 1))],
  );

  const installments: Installment[] = [];
  let allocated = 0;
  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    // The last payment clears the balance exactly.
    const amount = isLast ? remainingCents - allocated : installmentCents;
    allocated += amount;
    installments.push({ dueDate: chosen[i], amountCents: amount });
  }

  return { choice, installments, installmentCents };
}

export function formatDueDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
