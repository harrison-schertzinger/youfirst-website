import {
  STRIPE_PRICE_IDS,
  TICKET_AMOUNTS_DOLLARS,
  TICKET_AMOUNTS_CENTS,
} from "./feesData";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PaymentTicket {
  ticketId: string;
  playerId: string;
  category: "roster" | "summer";
  title: string;
  amount: number;
  amountCents: number;
  dueDate: string | null;
  dueDateDisplay: string;
  status: "paid" | "due" | "overdue";
  paidDate?: string;
  stripePriceId: string;
  installmentIndex?: number;
  installmentsTotal?: number;
}

/** Minimal payment plan shape matching what PortalContent fetches. */
export interface PortalPaymentPlan {
  id: string;
  season: string;
  plan_type: string;
  total_amount_cents: number;
  amount_paid_cents: number;
  installments_total: number;
  installments_paid: number;
  next_due_date: string | null;
}

/** Minimal payment row shape matching what PortalContent fetches. */
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

// ─── Constants ──────────────────────────────────────────────────────────────

const ROSTER_FEE = TICKET_AMOUNTS_DOLLARS.roster; // $200

/**
 * Due dates for summer tuition installments (2025-26 season).
 * Keyed by installment count.
 */
const SUMMER_DUE_DATES: Record<1 | 2 | 4, string[]> = {
  1: ["2025-12-15"],
  2: ["2025-12-15", "2026-03-15"],
  4: ["2025-12-15", "2026-01-15", "2026-02-15", "2026-03-15"],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Find the Nth completed payment in a given category (sorted oldest-first).
 * Returns the payment_date ISO string, or undefined.
 */
function paidDateForIndex(
  payments: PortalPayment[],
  category: string,
  index: number,
): string | undefined {
  const matches = payments
    .filter((p) => p.status === "completed" && p.payment_category === category)
    .sort((a, b) => a.payment_date.localeCompare(b.payment_date));
  return matches[index]?.payment_date;
}

/**
 * Determine the summer installment schedule from the payment plan.
 *
 * Naming inversion (matches Supabase enum, confirmed in dashboard):
 *   lump_sum  -> 1 installment  of $1,850
 *   monthly   -> 2 installments of $925   (the "half plan")
 *   quarterly -> 4 installments of $462.50 (the "quarter plan")
 */
function inferSummerInstallments(plan: PortalPaymentPlan): {
  count: 1 | 2 | 4;
  amountDollars: number;
  amountCents: number;
  stripePriceId: string;
  dueDates: string[];
} {
  let count: 1 | 2 | 4;
  const installmentsTotal = plan.installments_total ?? 0;

  if (
    installmentsTotal === 1 ||
    installmentsTotal === 2 ||
    installmentsTotal === 4
  ) {
    count = installmentsTotal;
  } else if (plan.plan_type === "quarterly") {
    count = 4;
  } else if (plan.plan_type === "monthly") {
    count = 2;
  } else {
    count = 1;
  }

  const totalDollars = plan.total_amount_cents / 100;
  const amountDollars = totalDollars / count;
  const amountCents = Math.round(plan.total_amount_cents / count);

  const stripePriceId =
    count === 1
      ? STRIPE_PRICE_IDS.summer_full
      : count === 2
        ? STRIPE_PRICE_IDS.summer_half
        : STRIPE_PRICE_IDS.summer_quarter;

  return {
    count,
    amountDollars,
    amountCents,
    stripePriceId,
    dueDates: SUMMER_DUE_DATES[count],
  };
}

// ─── Main builder ───────────────────────────────────────────────────────────

/**
 * Build the full ordered ticket list for a player. Each ticket is one
 * payable item a parent can act on. Order: roster first, then summer
 * installments by due date.
 *
 * NO FALL TICKETS — fall is hidden from the portal entirely.
 */
export function buildTickets(
  playerId: string,
  payments: PortalPayment[],
  paymentPlan: PortalPaymentPlan | null,
  nowMs: number = Date.now(),
): PaymentTicket[] {
  const tickets: PaymentTicket[] = [];

  // ── 1. Roster Fee ─────────────────────────────────────────────────────
  // Sum completed roster payments in cents
  const rosterPaidCents = payments
    .filter((p) => p.payment_category === "roster" && p.status === "completed")
    .reduce((sum, p) => sum + p.amount_cents, 0);
  const rosterFullyPaid = rosterPaidCents >= ROSTER_FEE * 100;

  tickets.push({
    ticketId: `${playerId}-roster-1`,
    playerId,
    category: "roster",
    title: "Roster Fee",
    amount: ROSTER_FEE,
    amountCents: TICKET_AMOUNTS_CENTS.roster,
    dueDate: null,
    dueDateDisplay: "Due at Registration",
    status: rosterFullyPaid ? "paid" : "due",
    paidDate: rosterFullyPaid
      ? paidDateForIndex(payments, "roster", 0)
      : undefined,
    stripePriceId: STRIPE_PRICE_IDS.roster,
  });

  // ── 2. Summer Tuition ─────────────────────────────────────────────────
  if (paymentPlan && paymentPlan.total_amount_cents > 0) {
    const summer = inferSummerInstallments(paymentPlan);

    // Trust installments_paid when set; fall back to deriving from amount_paid.
    let paidCount = paymentPlan.installments_paid ?? 0;
    if (paidCount === 0 && paymentPlan.amount_paid_cents > 0 && summer.amountCents > 0) {
      paidCount = Math.floor(
        (paymentPlan.amount_paid_cents + 1) / summer.amountCents,
      );
    }
    paidCount = Math.min(Math.max(0, paidCount), summer.count);

    for (let i = 0; i < summer.count; i++) {
      const isPaid = i < paidCount;
      const dueDate = summer.dueDates[i];
      const dueMs = new Date(dueDate).getTime();
      const isOverdue = !isPaid && dueMs < nowMs;

      tickets.push({
        ticketId: `${playerId}-summer-${i + 1}`,
        playerId,
        category: "summer",
        title:
          summer.count === 1
            ? "Summer Tuition"
            : `Summer Tuition \u00b7 ${i + 1} of ${summer.count}`,
        amount: summer.amountDollars,
        amountCents: summer.amountCents,
        dueDate,
        dueDateDisplay: `Due ${formatLongDate(dueDate)}`,
        status: isPaid ? "paid" : isOverdue ? "overdue" : "due",
        paidDate: isPaid
          ? paidDateForIndex(payments, "summer", i)
          : undefined,
        stripePriceId: summer.stripePriceId,
        installmentIndex: i + 1,
        installmentsTotal: summer.count,
      });
    }
  }

  return tickets;
}
