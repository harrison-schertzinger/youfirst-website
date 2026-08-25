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
