import { TICKET_AMOUNTS_DOLLARS, TICKET_AMOUNTS_CENTS } from "./feesData";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PaymentTicket {
  ticketId: string;
  playerId: string;
  category: "roster";
  title: string;
  amountCents: number;
  /** Money actually received against this ticket. */
  paidCents: number;
  status: "paid" | "due";
  paidDate?: string;
}

/** Minimal payment row shape matching what /api/portal/data returns. */
export interface PortalPayment {
  id: string;
  amount_cents: number;
  payment_method: string | null;
  description: string | null;
  payment_date: string;
  season: string | null;
  status: string;
  payment_category?: string | null;
}

/** One line in the "Summer Payments" list. */
export interface SummerPaymentLine {
  id: string;
  /** "Payment 1 — Apr 7, 2026". Derived from date order, never invented. */
  label: string;
  amountCents: number;
  paymentDate: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ROSTER_FEE_CENTS = TICKET_AMOUNTS_CENTS.roster; // $200

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatShortDate(iso: string): string {
  // Parse date-only strings at local noon so a Pacific-time viewer doesn't
  // see "2026-04-07" render as Apr 6.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? new Date(`${iso}T12:00:00`)
    : new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function completedInCategory(
  payments: PortalPayment[],
  category: string,
): PortalPayment[] {
  return payments
    .filter((p) => p.status === "completed" && p.payment_category === category)
    .sort((a, b) => a.payment_date.localeCompare(b.payment_date));
}

// ─── Roster ticket ──────────────────────────────────────────────────────────

/**
 * The roster fee is a fixed $200 and is settled purely by money received —
 * it never consulted an installment counter, so it was always honest and is
 * unchanged here.
 *
 * The summer season is NOT a ticket any more. It is one balance surface driven
 * by `player_balances()` (see SummerBalanceCard). There are no due dates and
 * nothing is labeled overdue: the season is over, and the only question left
 * is what is still owed.
 *
 * Fall money is deliberately absent from the portal entirely.
 */
export function buildRosterTicket(
  playerId: string,
  payments: PortalPayment[],
): PaymentTicket {
  const rosterPayments = completedInCategory(payments, "roster");
  const paidCents = rosterPayments.reduce((sum, p) => sum + p.amount_cents, 0);
  const fullyPaid = paidCents >= ROSTER_FEE_CENTS;

  return {
    ticketId: `${playerId}-roster-1`,
    playerId,
    category: "roster",
    title: "Roster Fee",
    amountCents: ROSTER_FEE_CENTS,
    paidCents,
    status: fullyPaid ? "paid" : "due",
    paidDate: fullyPaid ? rosterPayments[0]?.payment_date : undefined,
  };
}

// ─── Summer payment list ────────────────────────────────────────────────────

/**
 * Every completed summer payment, oldest first, labeled by its position in
 * that order. Existing rows have null descriptions and there never was an
 * installment schedule, so we label by date rather than fabricate one.
 *
 * These lines sum to the `paid_cents` shown on the balance card — a parent can
 * count her own payments and reconcile them against the figure above.
 */
export function buildSummerPaymentLines(
  payments: PortalPayment[],
): SummerPaymentLine[] {
  return completedInCategory(payments, "summer").map((p, i) => ({
    id: p.id,
    label: `Payment ${i + 1} — ${formatShortDate(p.payment_date)}`,
    amountCents: p.amount_cents,
    paymentDate: p.payment_date,
  }));
}

export const ROSTER_FEE_DOLLARS = TICKET_AMOUNTS_DOLLARS.roster;
