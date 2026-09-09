/**
 * Assertions for src/lib/season.ts. No test runner in this repo.
 *   npx tsx scripts/check-season.ts
 */
import assert from "node:assert/strict";
import {
  CURRENT_SEASON,
  PRIOR_SEASON,
  filterBySeason,
  normalizeSeason,
  resolveLedgerSeason,
  rosterPaidCentsForSeason,
  seasonFromTicketId,
  seasonsEqual,
  sortSeasonsNewestFirst,
} from "../src/lib/season";

assert.equal(normalizeSeason("2025-2026"), PRIOR_SEASON);
assert.equal(normalizeSeason("summer-2026"), PRIOR_SEASON);
assert.equal(normalizeSeason("2026-2027"), CURRENT_SEASON);
assert.equal(seasonsEqual("2025-26", "2025-2026"), true);
assert.equal(seasonsEqual("2025-26", "2026-27"), false);
assert.equal(seasonsEqual(null, "2026-27"), false);

const rows = [
  { season: "2025-26", amount_cents: 185000, payment_category: "summer", status: "completed" },
  { season: "2026-27", amount_cents: 46250, payment_category: "summer", status: "completed" },
  { season: "2025-26", amount_cents: 20000, payment_category: "roster", status: "completed" },
];

assert.equal(filterBySeason(rows, "2026-27").length, 1);
assert.equal(filterBySeason(rows, "2026-27")[0]?.amount_cents, 46250);
assert.equal(rosterPaidCentsForSeason(rows, "2025-26"), 20000);
assert.equal(rosterPaidCentsForSeason(rows, "2026-27"), 0);
assert.equal(
  filterBySeason(rows, "2026-27").reduce((s, p) => s + p.amount_cents, 0) +
    filterBySeason(rows, "2025-26").reduce((s, p) => s + p.amount_cents, 0),
  rows.reduce((s, p) => s + p.amount_cents, 0),
);

const sorted = sortSeasonsNewestFirst([
  { season: "2025-26" },
  { season: "2026-27" },
]);
assert.equal(sorted[0]?.season, CURRENT_SEASON);

assert.equal(
  seasonFromTicketId("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-summer-2026-27-balance"),
  CURRENT_SEASON,
);
assert.equal(resolveLedgerSeason({ season: "2025-26" }), PRIOR_SEASON);
assert.equal(
  resolveLedgerSeason({
    ticket_id: "id-summer-2025-26-quarter",
  }),
  PRIOR_SEASON,
);
assert.equal(resolveLedgerSeason({}), CURRENT_SEASON);

console.log("season helpers: ok");
