/**
 * Splitting a season into dated installments.
 *
 * ── WHAT THIS IS AND IS NOT ─────────────────────────────────────────────────
 * These dates are a PLAN, not a standing order. Nothing charges a card on
 * February 1 — a parent comes back and pays each installment. The copy must
 * never imply otherwise, because a family who believes she is on autopay and is
 * not ends up in collections through no fault of her own.
 *
 * The AMOUNTS are display only. Every cent that reaches Stripe is re-derived
 * server-side in /api/checkout; this module cannot influence what is charged.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * TWO WINDOWS, TWO DEADLINES. The season is not one bill:
 *
 *   FALL TOURNAMENTS — entry fees. Settled by October 1, so the club can pay
 *                      operators before the teams travel. Splittable across
 *                      September and October.
 *   SUMMER TUITION   — settled by February 1. Splittable across November,
 *                      December, January and February.
 *
 * The dates below are Harrison's, stated on 2026-08-26, not a spread computed
 * from a deadline. A schedule a family cannot predict is a schedule nobody
 * remembers and the club ends up chasing.
 */

export type PlanChoice = "full" | "half" | "quarter";
export type FeeWindow = "fall" | "summer";

export interface Installment {
  /** YYYY-MM-DD */
  dueDate: string;
  amountCents: number;
}

export interface PaymentPlan {
  choice: PlanChoice;
  window: FeeWindow;
  installments: Installment[];
}

interface WindowSpec {
  label: string;
  finalDue: string;
  /** Due dates per choice. A missing choice is not offered for this window. */
  dates: Partial<Record<PlanChoice, string[]>>;
}

export const WINDOWS: Record<FeeWindow, WindowSpec> = {
  fall: {
    label: "Fall tournaments",
    finalDue: "2026-10-01",
    dates: {
      full: ["2026-10-01"],
      // Sep 6, not the 1st — Harrison, 2026-08-26.
      half: ["2026-09-06", "2026-10-01"],
      // No quarter: two months cannot carry four payments.
    },
  },
  summer: {
    label: "Summer tuition",
    finalDue: "2027-02-01",
    dates: {
      full: ["2027-02-01"],
      half: ["2026-11-01", "2027-01-01"],
      quarter: ["2026-11-01", "2026-12-01", "2027-01-01", "2027-02-01"],
    },
  },
};

export const CHOICE_LABELS: Record<PlanChoice, string> = {
  full: "Pay in full",
  half: "2 payments",
  quarter: "4 payments",
};

/**
 * Build the schedule for a window and a choice.
 *
 * Installments are equal except the last, which is whatever CLEARS the balance
 * — never a rounded figure — so the numbers on screen add up to exactly what is
 * owed and a family is never left holding four cents.
 *
 * Returns null when the choice cannot honestly be offered: the window does not
 * support it, nothing is owed, or an installment would settle the balance on
 * its own (in which case it is a full payment wearing a costume).
 */
export function buildPlan(
  window: FeeWindow,
  choice: PlanChoice,
  remainingCents: number,
): PaymentPlan | null {
  if (remainingCents <= 0) return null;

  const dates = WINDOWS[window].dates[choice];
  if (!dates || dates.length === 0) return null;

  if (dates.length === 1) {
    return {
      choice,
      window,
      installments: [{ dueDate: dates[0], amountCents: remainingCents }],
    };
  }

  const per = Math.round(remainingCents / dates.length);
  if (per <= 0 || per >= remainingCents) return null;

  const installments: Installment[] = [];
  let allocated = 0;
  dates.forEach((dueDate, i) => {
    const isLast = i === dates.length - 1;
    const amountCents = isLast ? remainingCents - allocated : per;
    allocated += amountCents;
    installments.push({ dueDate, amountCents });
  });

  return { choice, window, installments };
}

/** Which choices this window can actually offer for this balance. */
export function offeredChoices(
  window: FeeWindow,
  remainingCents: number,
): PlanChoice[] {
  return (["full", "half", "quarter"] as PlanChoice[]).filter((c) =>
    buildPlan(window, c, remainingCents),
  );
}

export function formatDueDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
