# Club dues stay on their own season

2025-26 and 2026-27 are two ledgers. The parent portal, checkout, and
Stripe webhook must never add them together or credit one year with the
other year's money.

## What a family sees

The Player Portal lists every season the athlete has a `payment_plans` or
`payments` row for. Tabs sit in the left rail **and** on the Club dues
panel. Switching tabs changes the charged / paid / remaining figures, the
roster fee, fall tournaments, one-off charges, and the payment history.
There is no combined total.

2025-26 rows are historical. This change does not rewrite them.

## What the database already does

`player_season_balances()` groups plans and summer payments by `season`.
`player_balances()` returns only the most recent plan, still joined to
that plan's own season's payments. Those functions were already season-
scoped. The portal used to ignore that and render **every** payment under
whichever tab was open.

## What was writing the merge

`/api/stripe/webhook` hardcoded `season: "2025-26"` on every new payment
and then reconciled the **newest** `payment_plans` row with **all** summer
payments. A 2026-27 checkout therefore landed on last year, and last year's
dollars could mark this year's plan paid.

Checkout now sends the season on the Stripe session. The webhook writes
that season and reconciles only that season's plan against that season's
payments. Admin payment links do the same.

Live `payments` as of 2026-09-09: every completed row is still tagged
`2025-26`. There are no 2026-27 payment rows yet. Historical 2025-26
money is left as-is.

## The 2026-27 plan gap

`fee_schedule` has published 2026-27 pricing for classes 2028–2033
(2027 is unpublished; 2034 has no row).

`payment_plans`: 60 athletes on 2025-26, 97 on 2026-27.

Active / injured / hold athletes **with published 2026-27 pricing and no
2026-27 plan** (15 people). None of them have a 2025-26 plan either —
they are new records, not returning families missing a rollover:

| Class | Athletes |
|---|---|
| 2029 | Annabel Dawes; Nora Jacobs; Stella Straubel (two player rows) |
| 2030 | Isla Jackson; Natalie Rogers (two player rows) |
| 2031 | Summer Graupe (two player rows); Katelyn Schell |
| 2032 | Fiona Fleming; Piper Glover |
| 2033 | Reagan Foxbower; Alyson Hackett; Isabelle Seward |

Class of 2034 (Eva Behrens, Lola DeBord, Rose McLean, Leona Meinerding)
are active with no plan and **no published fee_schedule row**, so there
is nothing safe to bill from.

Several names appear twice. Those look like duplicate `players` rows, not
missing seasons. Clean those up in the Command Center before writing plans.

## Safe backfill — report first, write only on purpose

There is no existing 2026-27 seed that should be replayed against live
families. The original `scripts/seed-players.ts` imported 2025-26 history
and used different season spellings (`2025-2026`, `summer-2026`). Do not
run it again.

Use the read-only report:

```
npx tsx -r dotenv/config scripts/report-missing-season-plans.ts dotenv_config_path=.env.local
```

It lists who is missing a 2026-27 plan and what `fee_schedule` would
charge. It writes nothing.

`--apply` inserts one `lump_sum` plan per listed athlete, using the
published `summer_cents` for their class. It will not update 2025-26
rows, will not touch anyone who already has a 2026-27 plan, and will not
invent a price when `fee_schedule` is unpublished. Run the report, read
the list, then pass `--apply` only if those rows are the ones you mean
to bill.
