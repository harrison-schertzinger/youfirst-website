# You. First Elite Lacrosse — Full Repo Inventory

> Read-only diagnostic. Generated 2026-05-15.
>
> This file is the single source of truth for the state of the lacrosse-business code as of generation. It covers two repositories: the public/parent-facing site (`~/youfirst-website`) and the Schertzinger admin Dashboard (`~/schertzinger-dashboard`). Both share one Supabase project: `iklgrzabcloaqyghlggr` (`youfirst-lacrosse`).
>
> Environment variable VALUES are deliberately omitted — only NAMES are listed.

---

## Phase 1 — Stack confirmation: youfirst-website

- **Repo path:** `/Users/harrison/youfirst-website`
- **Working directory confirmed.** ✓
- **Project name (`package.json`):** `youfirst-website`, private, v0.1.0

### Dependencies

| Package | Version |
|---|---|
| `@stripe/stripe-js` | ^9.1.0 |
| `@supabase/ssr` | ^0.10.0 |
| `@supabase/supabase-js` | ^2.101.1 |
| `next` | 16.2.2 |
| `react` | 19.2.4 |
| `react-dom` | 19.2.4 |
| `sharp` | ^0.34.5 |
| `stripe` | ^22.0.0 |

### Dev dependencies

`@tailwindcss/postcss ^4`, `@types/node ^20`, `@types/react ^19`, `@types/react-dom ^19`, `dotenv ^17.4.1`, `eslint ^9`, `eslint-config-next 16.2.2`, `tailwindcss ^4`, `tsx ^4.21.0`, `typescript ^5`.

### Scripts

```
dev    -> next dev
build  -> next build
start  -> next start
lint   -> eslint
```

### Top-level tree (2 levels, ignoring node_modules / .next / .git)

```
.
├── email-lists/          (cohort email exports — non-code)
├── public/               (favicons, images, schedule assets, sitemap.xml, robots.txt)
│   └── images/
├── scripts/              (one-off TS scripts: seed, audit, diagnose, gen-link, wipe, recruiting-graphics)
│   └── recruiting-graphics/
├── src/                  (Next.js App Router code)
│   ├── app/
│   ├── components/
│   └── lib/
├── supabase/             (just `config.toml` + `.temp/linked-project.json`)
│   └── .temp/
├── .env.local            (gitignored secrets)
├── .vercel/project.json  (Vercel project: prj_pj4rdA3uulSJ7CWB7KWwRrua8Xbu, team_b2IBOGFZ8HQBCv28D7R6nII0)
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── AGENTS.md             ("This is NOT the Next.js you know — read node_modules/next/dist/docs/ before editing")
├── CLAUDE.md             (single line: `@AGENTS.md`)
└── README.md             (boilerplate create-next-app)
```

### Notable docs/instructions

- **AGENTS.md** — flags Next.js 16 has breaking changes vs. training-data Next.js; tells agents to read `node_modules/next/dist/docs/` first.
- **CLAUDE.md** — single-line redirect to AGENTS.md.
- **README.md** — unmodified `create-next-app` boilerplate.
- **No `docs/` folder, no migrations folder.**

---

## Phase 2 — Routes and Pages

**Router:** App Router (`src/app/`). No `pages/` directory.

### Public pages

| URL | File | Purpose |
|---|---|---|
| `/` | `src/app/page.tsx` | Marketing home — Hero, Mission, CompetitiveEdge, CollegeCommitments, AllAmerican, Philosophy, PhotoStrip, PlayerJourney, CallToAction. JSON-LD `SportsTeam` schema in `layout.tsx`. |
| `/schedule` | `src/app/schedule/page.tsx` | Season schedule fetched at request-time via `getEvents()` from Google Calendar. Falls back to placeholder events when API key/calendar ID missing. |
| `/fees` | `src/app/fees/page.tsx` | "My Account" sign-in entry point. Already-authenticated users get redirected straight to `/portal`. Renders `<ParentPortal />`. |

### Authenticated parent portal

| URL | File | Purpose |
|---|---|---|
| `/portal` | `src/app/portal/page.tsx` | Server component — calls `supabase.auth.getUser()`, redirects to `/fees` if unauthed. Renders `<PaymentBanner>` (driven by `?paid=…` / `?canceled=…` query params from Stripe redirect) plus `<PortalContent>` which fetches and displays players, guardians, payments, and the most-recent payment plan for the logged-in guardian. |

### Admin / internal

**None in this repo.** All admin functionality lives in the Schertzinger Dashboard (see Phase 7). The only admin-adjacent surface here is the `register` API route (Phase 3) which can be hit by anyone with the URL — it creates new player/guardian records — and the SQL migration helper at `scripts/payment-constraints.sql`.

---

## Phase 3 — API endpoints

All under `src/app/api/`. Every route returns JSON.

| URL | Method | Purpose |
|---|---|---|
| `/api/auth/callback` | GET | Supabase magic-link callback. Reads `?code=`, calls `exchangeCodeForSession()`, sets session cookies, redirects to `/portal`. Redirects to `/fees?error=missing_code` or `/fees?error=auth_failed` on failure. |
| `/api/auth/link-guardian` | POST | After a parent signs in, looks up the `guardians` row whose `email` matches the authenticated user's email, and writes `auth_user_id = user.id` (idempotent; refuses to overwrite a different user's link). Service-role admin client; never trusts client-supplied target. |
| `/api/checkout` | POST | Creates a Stripe Checkout Session. Inputs: `{playerId, category: "roster"\|"summer", installmentIndex?}`. Server-side recomputes price/amount from the player's `payment_plans` row + `payments` history — rejects already-paid items. Sets metadata: `player_id, guardian_id, ticket_id, category, installment_index?, installments_total?, player_name`. Success → `/portal?paid=<ticket_id>`. |
| `/api/portal/update-player` | POST | Lets a signed-in guardian update only the gear-size fields (`shirt_size`, `short_size`, `sweatshirt_size`, `shooting_shirt_size`) for a player they're linked to. Sizes whitelist: `XS, S, M, L, XL, XXL`. |
| `/api/register` | POST | Multipart form. Creates a new `players` row, optional photo upload to `player-photos` storage bucket, finds-or-creates up to two `guardians`, writes `player_guardians` links, handles the "emergency contact same as guardian" toggle, then sends a Supabase magic-link invite to guardian 1. **NOT gated by auth — public endpoint.** |
| `/api/stripe/webhook` | POST | Stripe webhook. Verifies signature with `STRIPE_WEBHOOK_SECRET`, processes only `checkout.session.completed`, inserts a `payments` row (idempotent via `stripe_session_id` unique index — see `scripts/payment-constraints.sql`), and reconciles the `payment_plans` row by recomputing from `payments` table (NOT incrementally accumulating). Returns 503 on missing env so Stripe retries; 200 on bad metadata so Stripe stops. |

### Stripe-specific call-outs

- **Webhook URL (in code):** `POST /api/stripe/webhook` — production URL is `https://youfirstlacrosse.com/api/stripe/webhook` (inferred from `metadataBase` in `src/app/layout.tsx`).
- **Stripe events the webhook expects:** only `checkout.session.completed`. Other events are 200-ack'd and ignored.
- **Idempotency guard:** unique partial index `payments_stripe_session_id_unique` on `payments(stripe_session_id) WHERE stripe_session_id IS NOT NULL`. Defined in `scripts/payment-constraints.sql` — must be applied manually in Supabase SQL editor before going live. The webhook also pre-checks for an existing payment row by `stripe_session_id`, and handles unique-constraint conflict code `23505` defensively.

### Auth endpoints

- `/api/auth/callback` — Supabase magic-link callback.
- `/api/auth/link-guardian` — claims a `guardians` row by email after first sign-in.

---

## Phase 4 — Environment variables (NAMES only)

### `~/youfirst-website/.env.local`

```
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_CALENDAR_API_KEY
GOOGLE_CALENDAR_ID
STRIPE_WEBHOOK_SECRET
```

**No `.env.example` in this repo.** `.env*` is gitignored.

### Cross-referenced against code

Every name listed above is referenced by at least one TS file. No silent misconfigurations detected in `youfirst-website`. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is only used to expose to the client (not currently imported, but reserved for future stripe.js usage).

### `~/schertzinger-dashboard/.env.local` (NAMES)

```
YF_SUPABASE_URL
YF_SUPABASE_SERVICE_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Drift flagged in Dashboard env

- Dashboard code reads `NEXT_PUBLIC_DASHBOARD_SUPABASE_URL` and `NEXT_PUBLIC_DASHBOARD_SUPABASE_ANON_KEY` (see `src/lib/auth/env.ts`, `src/lib/auth/supabase-server.ts`, etc.).
- The local `.env.local` defines `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — different names.
- In dev mode the proxy in `src/proxy.ts` *opens the door* (logs a warning, passes traffic through) when these are missing — so locally the dashboard appears to work without auth.
- In production the proxy returns 503 unless `NEXT_PUBLIC_DASHBOARD_SUPABASE_URL` / `NEXT_PUBLIC_DASHBOARD_SUPABASE_ANON_KEY` are set on Vercel.
- Net effect: locally the dashboard runs auth-less; whether Vercel has the dashboard-named env vars set is unverified (see Question 4).

---

## Phase 5 — Supabase schema

- **Project ref:** `iklgrzabcloaqyghlggr` (`youfirst-lacrosse`, org `bcpygdqxysyoqonnilcy`, East US Ohio).
- **No `supabase/migrations/` folder.** The only SQL file in the repo is `scripts/payment-constraints.sql`.
- **Live schema dump attempted but blocked:** `supabase db dump --schema public --data-only=false --linked` requires Docker, which is not running on this machine. `psql` is not installed. Therefore the schema below is **reconstructed from code references** — primarily `scripts/seed-players.ts`, `scripts/audit-seed.ts`, `scripts/diagnose-db.ts`, the API routes, and the Dashboard's `src/lib/data/players-supabase.ts`. Production DB was NOT queried.

### Tables (reconstructed)

#### `players`

| Column | Type (inferred) | Notes |
|---|---|---|
| `id` | uuid | PK |
| `first_name` | text | |
| `last_name` | text | |
| `graduation_year` | int | Confirmed: column name is `graduation_year`, NOT `grad_year`. ✓ Memory confirmed. |
| `position` | text \| null | |
| `jersey_number` | text \| null | **Stored as string** (see `seed-players.ts:289` — `String(p.jersey_number)`). |
| `school` | text \| null | |
| `team_name` | text \| null | Set to literal `"You. First Elite"` during seed. |
| `status` | text | Set to `"active"` during seed; UI filters out `"deleted"`. |
| `shirt_size` | text \| null | |
| `short_size` | text \| null | |
| `sweatshirt_size` | text \| null | |
| `shooting_shirt_size` | text \| null | |
| `photo_url` | text \| null | Set by `/api/register`. URL to `player-photos` storage bucket. |
| `created_at` | timestamptz | |

#### `guardians`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `auth_user_id` | uuid \| null | FK to `auth.users.id`. Linked by `/api/auth/link-guardian` after first sign-in. |
| `email` | text | NOT NULL (used as lookup key). |
| `first_name` | text | **NOT NULL** — seed fills `"Parent"` when unknown. |
| `last_name` | text | **NOT NULL** — seed fills `""` when unknown. |
| `phone` | text \| null | |
| `relationship` | text \| null | e.g. `"parent"`. |
| `is_emergency_contact` | boolean | |
| `address_line1` | text \| null | |
| `address_city` | text \| null | |
| `address_state` | text \| null | |
| `address_zip` | text \| null | |
| `created_at` | timestamptz | |

#### `player_guardians`

Junction table.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `player_id` | uuid | FK → `players.id` |
| `guardian_id` | uuid | FK → `guardians.id` |
| `is_primary` | boolean | Primary contact / billing parent. |
| `created_at` | timestamptz | |

Note: a `relationship` column was probed by `scripts/diagnose-db.ts` but is not consistently used.

#### `payments`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `player_id` | uuid | FK → `players.id` |
| `guardian_id` | uuid \| null | FK → `guardians.id` (nullable for historical seed rows) |
| `amount_cents` | int | **Cents, NOT dollars.** ✓ Memory confirmed. |
| `payment_method` | text \| null | Values seen: `"stripe"`, `"historical"`. |
| `payment_category` | text \| null | Values: `"roster" \| "fall" \| "summer"`. |
| `season` | text \| null | E.g. `"2025-2026"`, `"summer-2026"`, `"2025-26"`. **Inconsistent format** across writers (seed uses `"2025-2026"`; webhook writes `"2025-26"`). |
| `status` | text | Values: `"completed"` (used in filters). |
| `payment_date` | timestamptz | |
| `description` | text \| null | Webhook stores `ticket_id` here. |
| `stripe_session_id` | text \| null | UNIQUE partial index (see `scripts/payment-constraints.sql`). |
| `stripe_payment_intent_id` | text \| null | |
| `created_at` | timestamptz | |

#### `payment_plans`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `player_id` | uuid | FK → `players.id` |
| `season` | text | Seed uses `"summer-2026"` exclusively. |
| `plan_type` | text | Check constraint allows `"lump_sum" \| "quarterly" \| "monthly"`. **Naming inversion noted in `lib/portal-tickets.ts:95–98`:** `lump_sum → 1 install`, `monthly → 2 installs`, `quarterly → 4 installs`. |
| `total_amount_cents` | int | |
| `amount_paid_cents` | int | |
| `installments_total` | int | |
| `installments_paid` | int | |
| `next_due_date` | date \| null | |
| `created_at` | timestamptz | Used for "most recent plan" ordering. |

### Storage buckets

- `player-photos` — referenced by `/api/register`. Used `upsert: false` + `getPublicUrl()`.

### RLS policies

**Unable to confirm from code.** The webhook, checkout, link-guardian, update-player, and register routes all use `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS. Only the `/portal` browser-side fetch in `PortalContent.tsx` reads through the anon key — meaning **RLS must protect `guardians`, `players`, `player_guardians`, `payments`, and `payment_plans` for read access by a parent user**. Schema migrations defining these RLS policies are not in the repo, so the policies live only in Supabase. See Question 1.

### Confirmed schema facts

- `graduation_year` is the column name. `grad_year` does NOT exist (confirmed by `scripts/diagnose-db.ts` listing both candidates and code never using `grad_year`). ✓
- `payments.amount_cents` stores cents. Same for `payment_plans.total_amount_cents` / `amount_paid_cents`. ✓
- `jersey_number` is text/string, not an integer.

---

## Phase 6 — Stripe inventory

### CLI status

- `stripe` CLI installed at `/opt/homebrew/bin/stripe` (v1.40.9).
- **Not authenticated** — `stripe products list` returned `"You have not configured API keys yet"`. No `stripe login` was executed (would require browser auth that I cannot perform unilaterally).
- Therefore the live Stripe catalog and webhook-endpoint registration were NOT queried. The data below is from the codebase only.

### Stripe Price IDs (hardcoded in `src/lib/feesData.ts`)

| Key | Price ID | Cents | Dollars | Label |
|---|---|---|---|---|
| `roster` | `price_1TMcrE8i54MD6kpKyP7QHU2J` | 20000 | $200 | Roster Fee |
| `fall_tournament` | `price_1TMcrJ8i54MD6kpKudLe7im9` | 30000 | $300 | Fall Tournament |
| `summer_full` | `price_1TMcrK8i54MD6kpKs4B0jE5c` | 185000 | $1,850 | Summer Tuition (1 payment) |
| `summer_half` | `price_1TMcrN8i54MD6kpKizRM0Mkx` | 92500 | $925 | Summer Tuition (2 payments) |
| `summer_quarter` | `price_1TMcrO8i54MD6kpKlqmJjUNC` | 46250 | $462.50 | Summer Tuition (4 payments) |

### Stripe products referenced

Only these five Price IDs are used in code. No Product IDs are hardcoded — `/api/checkout` uses `line_items: [{ price: <id>, quantity: 1 }]`. The "fall_tournament" price is defined but **NO TICKET** is emitted for it (`src/lib/portal-tickets.ts:151–152` — "NO FALL TICKETS — fall is hidden from the portal entirely").

### Webhook endpoint

- **Code path:** `src/app/api/stripe/webhook/route.ts` → handles `POST /api/stripe/webhook`.
- **Production URL (inferred):** `https://youfirstlacrosse.com/api/stripe/webhook`.
- **Registered Stripe webhook endpoint:** could not verify (stripe CLI unauthenticated). See Question 2.

### Hardcoded payment plan amounts (display only)

`src/lib/feesData.ts` also exposes legacy display-only `PAYMENT_PLANS`:

- Full Season: $3,400 × 1
- Quarterly: $925 × 4 = $3,700
- Monthly: $375 × 10 = $3,750

These don't match the live ticket prices ($1,850 / $925 / $462.50). These are marketing copy on `/fees` only — they have empty `stripePriceId: ""` strings. The portal uses the SKU catalog at the top of the same file.

---

## Phase 7 — Schertzinger Dashboard (`ops.schertzinger.co`)

### Repo location

- **Path on disk:** `/Users/harrison/schertzinger-dashboard`
- **Framework:** Next.js 16.2.2, React 19.2.4, App Router, Tailwind CSS 4.
- **Charts:** `recharts ^3.8.1`, icons via `lucide-react`.
- **No Stripe dependency.**
- **Package manager:** pnpm (lockfile present).
- **Deployment target:** Vercel. `.vercel/` directory absent — project link state unknown locally. Production URL per task: `ops.schertzinger.co`. See Question 3.

### Top-level tree

```
.
├── data/
│   ├── bank-export.csv               (Fifth Third Bank export, Oct 2025 – Apr 2026)
│   ├── cla-summary.json              (parsed Wix order summary for CLA)
│   └── youfirst-wix-summary.json     (parsed Wix order summary for You. First)
├── scripts/
│   ├── build-data-summaries.mjs
│   └── verify-data.mjs
├── public/                           (icons + assets)
├── src/
│   ├── app/
│   ├── components/
│   └── lib/
├── .env.local
├── AGENTS.md   (same "NOT the Next.js you know" warning)
├── CLAUDE.md   (single-line `@AGENTS.md`)
├── README.md   (create-next-app boilerplate)
├── RLS_GAPS.md (likely documents RLS state — not yet read this pass)
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

### Routes

All routes under the `(dashboard)` route group are gated by `src/proxy.ts` (Next.js 16 proxy.ts, formerly middleware.ts).

| URL | File | Purpose |
|---|---|---|
| `/login` | `src/app/login/page.tsx` + `login-form.tsx` | Magic-link sign-in. Email allowlist enforced in `src/lib/auth/whitelist.ts` AND defence-in-depth in the proxy. Allowed emails: `harrison@theyoufirstproject.com`, `kathleen@youfirstelitelacrosseclub.com`. |
| `/` | `src/app/(dashboard)/page.tsx` | Portfolio overview — KPI quartet, monthly revenue chart, You. First Elite section, CLA section, You.Prjct section, recent activity. |
| `/players` | `src/app/(dashboard)/players/page.tsx` | You. First Elite player roster. Live Supabase read via service role. Falls back to `seed-data.json` if Supabase env missing. |
| `/players/[id]` | `src/app/(dashboard)/players/[id]/page.tsx` | Per-player profile. Reuses `getPlayersDataset()` then finds by UUID. |
| `/revenue` | `src/app/(dashboard)/revenue/page.tsx` | Revenue Intelligence — bank inflows, Wix data for CLA + You. First, business-card deep dives, seasonal pattern, inflow table. |
| `/expenses` | `src/app/(dashboard)/expenses/page.tsx` | Outflows view sourced from bank CSV (`data/bank-export.csv`). |
| `/projections` | `src/app/(dashboard)/projections/page.tsx` | Forward-looking cash flow May 2026 → Feb 2027 with scenario sliders. |
| `/settings` | `src/app/(dashboard)/settings/page.tsx` | Placeholder ("Coming soon"). Allowlist still in code. |

### Components

```
src/components/
├── activity-feed.tsx
├── app-shell.tsx              (sidebar + topbar wrapper)
├── kpi-card.tsx
├── players-roster.tsx
├── revenue-chart.tsx
├── sidebar.tsx
├── team-balance-card.tsx
├── topbar.tsx
├── cla/
│   └── cla-overview.tsx
├── expenses/
│   ├── expense-breakdown-chart.tsx
│   ├── expense-table.tsx
│   └── expense-trend-chart.tsx
├── players/
│   └── player-profile.tsx
├── projections/
│   ├── projection-chart.tsx
│   ├── projections-client.tsx
│   └── scenario-comparison.tsx
├── revenue/
│   ├── business-card.tsx
│   ├── inflow-table.tsx
│   ├── monthly-trend-chart.tsx
│   ├── seasonal-pattern.tsx
│   └── source-breakdown-chart.tsx
└── youprjct/
    └── youprjct-overview.tsx
```

### Lacrosse-relevant filter

Every route in this repo except `/projections` (purely calculated) and `/settings` (placeholder) touches lacrosse data in some way, because You. First Elite is the largest revenue stream in the portfolio. Strict-lacrosse-only pieces:

| Path | Why it's lacrosse |
|---|---|
| `/players` page | Reads `players`, `player_guardians`, `guardians`, `payment_plans`, `payments` from the lacrosse Supabase. |
| `/players/[id]` | Same dataset, per-player view. |
| `src/lib/data/players-supabase.ts` | Full loader for player roster. Uses `YF_SUPABASE_URL` / `YF_SUPABASE_SERVICE_KEY` (service role). |
| `src/lib/data/youfirst-supabase.ts` | Aggregate stats by graduation year — billed/collected/outstanding/collection rate. Used by Overview KPI quartet. |
| `src/lib/data/youfirst-wix.ts` | Pre-Supabase Wix order history for You. First Elite. |
| `src/app/(dashboard)/players/seed-data.json` | Static fallback used when live Supabase fails — same JSON pattern as the website's `scripts/seed-data.json`. |
| `components/players-roster.tsx` | Roster table view. |
| `components/players/player-profile.tsx` | Per-player profile. |
| `components/team-balance-card.tsx` | Per-grad-year balance summary used on Overview. |
| Overview page (`/`) — You. First section | Team balance grid + collection-health bar + quick links to `/players` and `/revenue`. |
| Revenue page — You. First Elite business card | Mixes Wix lifetime data with live Supabase billed/collected (`yf.source === "live"`). |
| `src/lib/businesses.ts` | Defines `BusinessId` including `"you-first-elite"` and `"cincinnati-lacrosse-academy"`. |

The `cla-overview` and `youprjct-overview` components are sister businesses (CLA is also lacrosse but Wix-only; You.Prjct is the personal-excellence platform).

### Dashboard auth

- Proxy: `src/proxy.ts` — uses Supabase getUser() (not getSession()), then checks email allowlist.
- Allowlist: `src/lib/auth/whitelist.ts` — hardcoded `harrison@theyoufirstproject.com` and `kathleen@youfirstelitelacrosseclub.com`.
- Layout-level defence: `src/app/(dashboard)/layout.tsx` does its own `getUser()` and redirects to `/login` on failure.

### Data sources used by Dashboard

| Source | Library |
|---|---|
| Live lacrosse Supabase | `src/lib/data/players-supabase.ts`, `youfirst-supabase.ts` |
| Wix CLA order history (static JSON) | `src/lib/data/cla-wix.ts` |
| Wix You. First order history (static JSON) | `src/lib/data/youfirst-wix.ts` |
| Fifth Third bank CSV | `src/lib/data/bank.ts`, `src/lib/expenses/parse-bank-csv.ts` |
| Static seed JSON (fallback) | `src/app/(dashboard)/players/seed-data.json` |

---

## Phase 8 — Player ↔ Parent ↔ Payment data model

### Relationships

```
auth.users
   │  (1:0..1 by email match, written by /api/auth/link-guardian)
   ▼
guardians ───┐                              players
   │         │                                 │
   │         └──── player_guardians ───────────┘
   │              (M:N junction, is_primary flag)
   │                                            │
   │                                            ▼
   └─────────────────────────► payments  (guardian_id nullable for seed rows)
                                ▲   ▲
                                │   │ unique partial index on stripe_session_id
                                │
                          payment_plans   (1:N per player; most-recent-by-created_at wins)
```

### Sign-in flow

1. Parent submits email at `/fees` → Supabase magic link.
2. Click magic link → `/api/auth/callback?code=…` exchanges code for session cookie → redirects to `/portal`.
3. `PortalContent` runs `supabase.from("guardians").eq("auth_user_id", userId)`.
4. If not found, calls `/api/auth/link-guardian` which matches the authed email to a `guardians.email` server-side and writes `auth_user_id`.
5. On next render, the linked guardian's `player_guardians` rows enumerate visible players.

### Balance computation

- **Roster fee** ($200): derived from `SUM(payments.amount_cents)` where `payment_category='roster' AND status='completed'`. A player is "roster paid" once `paidCents >= 20000`.
- **Summer tuition**: comes from the player's *most recent* `payment_plans` row (`ORDER BY created_at DESC LIMIT 1`).
  - `total_amount_cents` is authoritative for amount billed.
  - `amount_paid_cents` is reconciled in the webhook from `SUM(payments.amount_cents) WHERE payment_category='summer' AND status='completed'`, clamped to `total_amount_cents`.
  - `installments_paid` similarly recomputed from row count or full-paid heuristic.
  - Installment plan inferred from `installments_total` (1 / 2 / 4) with fallback to `plan_type` enum.
- **Fall tournament** ($300 hardcoded `STRIPE_PRICE_IDS.fall_tournament`): **NOT exposed in the parent portal** — `portal-tickets.ts` returns no fall tickets. Historical fall payments live in `payments` rows but are not actionable.

### Confirmed memory facts

- ✓ Column is `graduation_year`.
- ✓ `payments.amount_cents` stores cents.

### Gaps relative to "Command Center" vision

| Gap | Today | Lift |
|---|---|---|
| **Admin-driven onboarding** | Public `/api/register` accepts anonymous POSTs, sends magic-link invite to guardian 1. No admin approval step. | **Extend existing** — add an admin-only POST that bypasses the public form, lets Harrison/Kathleen pre-create a player + send the invite from the dashboard. |
| **Custom payment links per player** | Stripe prices are fixed (5 hardcoded SKUs). One-off charges (private lessons, makeup payments) cannot be invoiced. | **Build new** — a dashboard action that creates a one-off `payments` row with a Stripe Payment Link / Invoice, then surfaces it on the parent's `/portal`. Requires either Stripe Invoices/Payment Links or a new dynamic-price flow in `/api/checkout`. |
| **Expense ledger** | Dashboard reads expenses from `data/bank-export.csv` only. No live writes; no categorization persisted; no per-business attribution. | **Build new** — an `expenses` table in the lacrosse Supabase (or a separate ops project) with category, business attribution, and notes. Or move to a Plaid-style live feed. |
| **P&L view** | `/revenue` and `/expenses` exist as separate read-only deep-dives. No combined P&L row that nets them. | **Build new on top of existing** — combine the two existing data loaders. Most of the math already exists in `lib/data/index.ts`. |
| **Schertzinger admin actions write back to lacrosse DB** | Dashboard is currently read-only against the lacrosse Supabase (service-role key, no writes anywhere). | **Build new** — write API in the dashboard for admin mutations (refund, mark paid manually, edit player). Requires careful RLS or service-role boundaries. |
| **`fall` payments surfaced to parents** | Hidden from portal. Historical fall payments visible in the DB but not actionable. | **Extend existing** — un-hide `portal-tickets.ts`, add a Stripe Price wiring. |

---

## Phase 9 — Caveats and items not verified live

- Live Supabase schema NOT dumped (Docker not running, `psql` not installed). Schema above is reconstructed from code.
- RLS policies NOT enumerated (would require live SQL query). The repo contains no RLS migration files. `RLS_GAPS.md` exists in the Dashboard repo (mentioned in dir listing) but was not opened in this pass — see Question 1.
- Stripe live product / price / webhook registration NOT verified (stripe CLI unauthenticated).
- Dashboard Vercel project link NOT verified (`.vercel/project.json` absent locally — see Question 3).
- No production data was queried during this audit.

---

## Phase 10 — Open questions for Harrison

1. **RLS coverage on the lacrosse Supabase project.** No migration files in either repo define RLS policies for `players`, `guardians`, `player_guardians`, `payments`, or `payment_plans`. The parent portal *reads* these tables through the anon key (see `PortalContent.tsx:84–145`), so RLS must permit a parent to see their own rows. Could you confirm RLS is enabled and policies exist? `~/schertzinger-dashboard/RLS_GAPS.md` exists — should I read it next pass?
2. **Stripe webhook endpoint registration.** The stripe CLI is installed but not authenticated. Should I run `stripe login` and verify the live registered webhook URL matches `https://youfirstlacrosse.com/api/stripe/webhook` and is wired to `checkout.session.completed`? Same goes for cross-checking the five Price IDs and the price-amount drift between the marketing copy ($3,400 / $3,700 / $3,750) and the actual portal SKUs ($1,850 / $925 / $462.50).
3. **Schertzinger Dashboard deployment.** The dashboard's `.vercel/` directory is absent locally. Is `ops.schertzinger.co` currently deployed on Vercel and pointed at this repo? If so, where do I find the project ID / team ID to verify it's the same repo I inventoried?
4. **Dashboard env var drift.** Code reads `NEXT_PUBLIC_DASHBOARD_SUPABASE_URL` / `NEXT_PUBLIC_DASHBOARD_SUPABASE_ANON_KEY`, but the local `.env.local` defines `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The dev-mode proxy silently lets traffic through when the `DASHBOARD_*` vars are missing — meaning local dev currently runs auth-less. Is that intentional, or should the local `.env.local` be renamed? Are the `DASHBOARD_*` names set on Vercel?
5. **Payment plan inversion** (`lump_sum / monthly / quarterly`). `lib/portal-tickets.ts:95–98` notes the enum is inverted relative to install count (`monthly → 2 installs`, `quarterly → 4 installs`). Is that a long-running technical-debt note, or is the enum stable as-is? It changes which Stripe price gets charged per ticket.
6. **`payments.season` formatting.** Three different season formats appear in writers: `"2025-2026"` (seed), `"summer-2026"` (seed plans), and `"2025-26"` (live webhook). Is the inconsistency known? It affects any dashboard query that filters by season.
7. **`/api/register` is anonymous.** Anyone with the URL can submit a registration form and trigger a magic-link email from the lacrosse account. Is this intentional for parents who self-register, or should it be admin-gated as part of the Command Center build?
8. **Schertzinger Dashboard fallback risk.** The dashboard `loadFallback()` path silently shows the seed-data snapshot if Supabase env is missing — meaning a misconfigured deploy renders months-old balances without a hard error. Is that the desired behavior, or should it fail loudly?
9. **`payment-constraints.sql` application status.** The webhook idempotency story rests on a UNIQUE partial index on `payments.stripe_session_id` that exists only in `scripts/payment-constraints.sql`. Has this SQL been applied to the live database? The webhook also handles `23505` defensively, so it works either way — but the pre-check race window opens up without it.
10. **`photo_url` on players.** `/api/register` uploads to a `player-photos` storage bucket. Are those photos exposed anywhere in the parent portal or dashboard? I see the column read in `PortalContent.tsx` but the renderer (`PlayerCard.tsx`) was not opened in this pass.

---

*End of inventory.*
