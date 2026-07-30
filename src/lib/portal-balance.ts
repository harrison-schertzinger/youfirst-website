/**
 * The portal's money shape.
 *
 * Every number here is produced by the Postgres function `player_balances()`
 * and is passed through untouched. Nothing in the browser — and nothing in
 * this file — recomputes a balance. The collections email reads the same
 * function, so a parent can never see one figure on the portal and a
 * different one in her inbox.
 *
 * Truth is money, never a counter: `installments_paid` / `installments_total`
 * are deliberately absent from this module. The April 2026 import set both to
 * 1 for every family that had paid anything, so partial payers read as
 * complete. Paid is scoped to the 'summer' payment category — the ledger also
 * holds 'roster' and 'fall' money, and summing all of it against the summer
 * plan total manufactures fake credit balances.
 */

/** One row of `player_balances()`, snake_case exactly as Postgres returns it. */
export interface PlayerBalanceRow {
  player_id: string;
  plan_id: string | null;
  season: string | null;
  charged_cents: number;
  paid_cents: number;
  adjustment_cents: number;
  adjustment_reason: string | null;
  remaining_cents: number;
  overpaid_cents: number;
  percent_paid: number;
  is_settled: boolean;
  quarter_cents: number;
  quarter_eligible: boolean;
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Always-two-decimal form. Used anywhere the number has to be quotable back
 * to us verbatim — the collections email and the admin queue.
 */
export function formatCentsExact(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * How many whole quarters the remainder divides into. Only meaningful when
 * `quarter_eligible` is true — the function already guarantees the remainder
 * is an exact multiple of the quarter and that more than one is left.
 */
export function quarterCount(balance: PlayerBalanceRow): number {
  if (!balance.quarter_eligible || balance.quarter_cents <= 0) return 0;
  return Math.round(balance.remaining_cents / balance.quarter_cents);
}
