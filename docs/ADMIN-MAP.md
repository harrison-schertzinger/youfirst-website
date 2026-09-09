# The Command Center — what lives where

**One address runs the club: `youfirstlacrosse.com/admin`.**

If you are looking for something and it is not on this map, it does not exist
yet. Say so plainly rather than building a second place for it to live.

## How you get in

`https://www.youfirstlacrosse.com/admin/login` — email and password.

Access is an allowlist in `src/lib/admin-auth.ts`. Being able to sign in to
Supabase is not enough; the address has to be on that list. It is enforced three
times: on the login form, again in `src/app/admin/layout.tsx` for every rendered
page, and again in every `/api/admin/*` route handler, so a forged cookie cannot
reach data through the API.

Adding a person is a code change to that file, not a database edit. That is
deliberate — admin access should require a deploy.

## The pages

| Address | What it is |
|---|---|
| **`/admin`** | **The roster. This is the Command Center.** Every athlete, every class, one screen — inline click-to-edit, Elite / Blue / Training buckets, paid and partial status, parent email and phone, confirmation state, per-team CSV. A compact season strip sits on top: active players, billed, collected, net position. |
| **`/admin/war-room`** | **The handoff page.** A three-column board (Doing Now / Needs a Decision / Ideas) that Harrison, Henry and Luke all write to, the roster-readiness strip, and the operations contact book. See the note below on why this is a route. |
| `/admin/placements` | The placement-letter engine — grouped by graduation class, preview, send, resend, holds. |
| `/admin/tryouts` | Tryout registrations, CSV import, field sheets. |
| `/admin/prospects` | The prospect pipeline, as a spreadsheet. |
| `/admin/players` | Player records — spreadsheet or tiles, guardians, charges, payment links. |
| `/admin/tournaments` | Tournaments and tournament rosters. |
| `/admin/expenses` | Expense entry and categories. |
| `/admin/financials` | Revenue and expense charts. |
| `/admin/templates` | Email templates and snippets. |
| `/admin/questions` | Unanswered parent questions from the site. |

`/admin/rosters` is **retired**. It permanently redirects to `/admin`. Old links
and bookmarks keep working; do not build anything new against it.

## The rule that keeps this clear

**New capability goes on `/admin`, or into a section of it. Not a new
top-level route.**

**`/admin/war-room` is the one deliberate exception, added 2026-09-09** for the
Luke handoff. The rule targets *one job served by two surfaces* — which is what
`/admin` vs `/admin/rosters` was. The War Room is a different job read by a
different person: the roster screen answers "who is on which team", the War Room
answers "what does the club owe attention to this week". Folding a whiteboard and
a phone book into the 2,000-line roster client would bury both.

Where the rule DOES bind, it was honoured: roster capability stayed on `/admin`.
The readiness strip renders on **both** pages from one component
(`src/components/admin/rosters/TeamReadiness.tsx`) fed by one reduction
(`buildReadiness()` in `src/lib/rosters/readiness.ts`), so the two screens
cannot report different counts for the same team.

Until 2026-08-25 this was broken in exactly that way. `/admin` served a
244-line landing page — four KPI cards and an "Add a Player" button — while the
real instrument sat at `/admin/rosters` and had received months of iteration.
Two surfaces, two levels of finish, no signpost between them. Someone could land
on the front door and never learn the house was behind it, which is precisely
what happened.

The fix was to make the front door the house. Adding a fresh top-level route
for the next feature is how that split comes back.

## Where the data actually lives

| You are looking at | It comes from |
|---|---|
| The roster screen | `players`, merged at read time with `tryout_registrations` and `roster_confirmations` (`src/lib/rosters/data.ts`) |
| Whether a family said yes | **Two places that can disagree** — `placement_tokens.confirmed_at` and the existence of a `roster_confirmations` row. See the warning below. |
| What a family owes | `player_balances()` in Postgres. Nothing recomputes a balance — not the portal, not the collections email. |
| The War Room board | `war_room_cards` — three columns, soft-archived, admin-only |
| Luke's contact book | `ops_contacts` — **not** `club_contacts`. `club_contacts` is the club's *published* front desk and renders on the parent portal; `ops_contacts` is internal (vendors, tournament contacts) and is never published. Do not merge them. |
| Roster readiness per team | Derived, not stored — `buildReadiness()` over the same roster data `/admin` already loads. Targets are `ROSTER_SIZE_MIN`/`MAX` (14–17) and the goalie minimum from `ROSTER_SHAPE`; there is deliberately no second set of numbers. |
| The public schedule and calendar feed | `events`, `teams`, `event_teams`, `calendar_feeds`. See `docs/SCHEDULE.md`. |

### ⚠️ "Confirmed" is recorded in two places

A family can appear confirmed in one and not the other:

- `placement_tokens.confirmed_at` — set when they click through the placement
  letter.
- a `roster_confirmations` row — written when they complete the roster form.

These have already drifted apart once. In August 2026 seven 2028 families had a
complete roster form and yet their placement token still read unconfirmed, so a
query keyed on tokens alone reported **1 confirmed out of 15** for a class that
was fully committed.

**Never answer "who is in?" from one table.** Check both, or reconcile them
first. A send list built on the wrong one either misses families who are on the
team or chases families who already answered.
