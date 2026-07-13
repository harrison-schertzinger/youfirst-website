-- Repo copy of migration `roster_confirmations_create`
-- APPLIED to prod project iklgrzabcloaqyghlggr on 2026-07-13 via MCP.
--
-- Roster confirmations — one row per player being locked onto a roster after
-- a tryout/evaluation offer. Written ONLY by the server (service role) via
-- /api/roster/confirm. NO payment at this step (2026-07-13): the payment
-- columns (reserve_paid / stripe_* / amount_cents / paid_at) sit dormant
-- until the separate gear-charge flow populates them later.

create table public.roster_confirmations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Player
  player_first_name text not null,
  player_last_name text not null,
  player_grad_year integer not null
    check (player_grad_year between 2028 and 2034),
  -- Derived from grad year (2032/2033 dev, 2034 dev play-up, 2028–2031 elite),
  -- confirmed by the family on the form.
  team text not null check (team in ('development', 'elite')),
  player_phone text,

  -- Parent / guardian 1 (required)
  parent1_name text not null,
  parent1_email text not null,
  parent1_phone text not null,

  -- Parent / guardian 2 (optional)
  parent2_name text,
  parent2_email text,
  parent2_phone text,

  -- Uniform sizing. Clean enum values: youth YS/YM/YL, adult prefixed with A.
  -- CHECK constraint (not a pg enum) so the supplier's exact scale can be
  -- swapped in with a single ALTER later.
  jersey_size text not null check (jersey_size in
    ('YS','YM','YL','AXS','AS','AM','AL','AXL','AXXL')),
  shorts_size text not null check (shorts_size in
    ('YS','YM','YL','AXS','AS','AM','AL','AXL','AXXL')),

  -- $100 reserve payment (Stripe Checkout)
  reserve_paid boolean not null default false,
  stripe_session_id text,
  stripe_payment_intent_id text,
  amount_cents integer,
  paid_at timestamptz,

  notes text
);

-- Webhook lookup + hard dedup: one row per checkout session.
create unique index roster_confirmations_stripe_session_id_key
  on public.roster_confirmations (stripe_session_id)
  where stripe_session_id is not null;

-- Re-submit dedup lookups (unpaid row reuse).
create index roster_confirmations_parent1_email_idx
  on public.roster_confirmations (parent1_email);

-- Lock it down: RLS on, zero policies — anon/authenticated can do nothing.
-- The service role bypasses RLS; belt-and-suspenders revoke on top.
alter table public.roster_confirmations enable row level security;
revoke all on table public.roster_confirmations from anon, authenticated;
