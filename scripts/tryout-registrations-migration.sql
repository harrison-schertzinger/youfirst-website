-- ============================================================================
-- 2026 Tryouts — tryout_registrations
-- Applied to Supabase project iklgrzabcloaqyghlggr via the apply_migration
-- tool (migration name: create_tryout_registrations) on 2026-06-19.
-- This file is the repo-of-record copy; it is NOT run by `supabase db push`.
--
-- Flow: public /tryouts form -> POST /api/tryouts/checkout inserts a 'pending'
-- row + creates a $50 Stripe Checkout session -> /api/stripe/webhook flips the
-- row to 'paid'. All writes are server-side via the service-role key, matching
-- the payments/players RLS pattern (service-role full access, no anon access).
-- ============================================================================

create table if not exists public.tryout_registrations (
  id                        uuid primary key default gen_random_uuid(),
  player_full_name          text        not null,
  parent_name               text        not null,
  email                     text        not null,
  phone                     text        not null,
  graduation_year           integer     not null check (graduation_year between 2029 and 2038),
  position                  text        not null,
  tryout_group              text        not null check (tryout_group in ('youth','older')),
  tryout_date               date        not null,
  amount_cents              integer     not null default 5000 check (amount_cents >= 0),
  currency                  text        not null default 'usd',
  stripe_session_id         text,
  stripe_payment_intent_id  text,
  payment_status            text        not null default 'pending'
                              check (payment_status in ('pending','paid','failed','expired')),
  confirmation_email_sent   boolean     not null default false,
  created_at                timestamptz not null default now(),
  paid_at                   timestamptz,
  updated_at                timestamptz not null default now()
);

create unique index if not exists tryout_registrations_stripe_session_id_key
  on public.tryout_registrations (stripe_session_id)
  where stripe_session_id is not null;

create index if not exists tryout_registrations_status_idx
  on public.tryout_registrations (payment_status);

create index if not exists tryout_registrations_created_at_idx
  on public.tryout_registrations (created_at desc);

alter table public.tryout_registrations enable row level security;

drop policy if exists "Service role full access tryout_registrations"
  on public.tryout_registrations;
create policy "Service role full access tryout_registrations"
  on public.tryout_registrations
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function public.set_tryout_registrations_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tryout_registrations_updated_at
  on public.tryout_registrations;
create trigger trg_tryout_registrations_updated_at
  before update on public.tryout_registrations
  for each row execute function public.set_tryout_registrations_updated_at();
