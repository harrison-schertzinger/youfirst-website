/**
 * Club seasons on the parent portal and the ledger.
 *
 * Two seasons can be on screen at once (last year still owed, this year just
 * billed). They must never share a total, a payment list, or a Stripe write.
 * Every comparison goes through `seasonsEqual` so "2025-26" and the older
 * "2025-2026" seed spelling still match — and nothing else does.
 */

export const CURRENT_SEASON = "2026-27";
export const PRIOR_SEASON = "2025-26";

/** Newest first — the order a family wants to read. */
export const PORTAL_SEASONS = [CURRENT_SEASON, PRIOR_SEASON] as const;

const CANONICAL = new Set<string>(PORTAL_SEASONS);

/**
 * Collapse the spellings that have appeared in writers over time.
 * Unknown values are returned trimmed, never invented.
 */
export function normalizeSeason(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (lower === "2025-26" || lower === "2025-2026" || lower === "summer-2026") {
    return PRIOR_SEASON;
  }
  if (lower === "2026-27" || lower === "2026-2027") {
    return CURRENT_SEASON;
  }
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;
  const long = trimmed.match(/^(\d{4})-(\d{4})$/);
  if (long) return `${long[1]}-${long[2].slice(2)}`;
  return trimmed;
}

export function seasonsEqual(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = normalizeSeason(a);
  const right = normalizeSeason(b);
  if (!left || !right) return false;
  return left === right;
}

export function isKnownSeason(value: string | null | undefined): boolean {
  const normalized = normalizeSeason(value);
  return normalized != null && CANONICAL.has(normalized);
}

/** Newest known season first; unknown labels keep their relative order. */
export function sortSeasonsNewestFirst<T extends { season: string }>(rows: T[]): T[] {
  const rank = (season: string) => {
    const normalized = normalizeSeason(season) ?? season;
    const known = PORTAL_SEASONS.indexOf(normalized as (typeof PORTAL_SEASONS)[number]);
    return known === -1 ? 100 + normalized : known;
  };
  return [...rows].sort((a, b) => {
    const byKnown = Number(rank(a.season)) - Number(rank(b.season));
    if (byKnown !== 0) return byKnown;
    return b.season.localeCompare(a.season);
  });
}

export function filterBySeason<T extends { season?: string | null }>(
  rows: T[],
  season: string | null | undefined,
): T[] {
  if (!season) return [];
  return rows.filter((row) => seasonsEqual(row.season, season));
}

export function rosterPaidCentsForSeason(
  payments: {
    amount_cents: number;
    payment_category?: string | null;
    status: string;
    season?: string | null;
  }[],
  season: string | null | undefined,
): number {
  return filterBySeason(payments, season)
    .filter((p) => p.payment_category === "roster" && p.status === "completed")
    .reduce((sum, p) => sum + (p.amount_cents ?? 0), 0);
}

/**
 * Recover a season from a checkout ticket id when Stripe metadata is missing.
 * Portal tickets look like `{uuid}-summer-2026-27-balance`.
 */
export function seasonFromTicketId(ticketId: string | null | undefined): string | null {
  if (!ticketId) return null;
  const match = ticketId.match(/(?:^|-)((?:19|20)\d{2}-(?:\d{2}|\d{4}))(?:-|$)/);
  return match ? normalizeSeason(match[1]) : null;
}

/**
 * Season a new ledger row belongs to. Metadata first, then the ticket id,
 * then this season — never last year. Historical 2025-26 rows are untouched;
 * only *new* writes without a season land on the live year.
 */
export function resolveLedgerSeason(meta: {
  season?: string | null;
  ticket_id?: string | null;
}): string {
  return (
    normalizeSeason(meta.season) ??
    seasonFromTicketId(meta.ticket_id) ??
    CURRENT_SEASON
  );
}
