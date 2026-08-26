-- ═══════════════════════════════════════════════════════════════════════════
-- club_schedule_events_teams_feeds
--
-- APPLIED to project iklgrzabcloaqyghlggr on 2026-08-25 via MCP apply_migration.
-- Recorded here for the repo's history; do not re-run blind — it is idempotent
-- but the seed data below is not part of the migration itself.
--
-- Creates: teams, events, event_teams, calendar_feeds.
-- Alters:  nothing. No existing table, policy, or column was touched.
--
-- THE LOAD-BEARING PIECE is events.uid plus events_guard_uid_trg. The UID is
-- generated once and the trigger refuses any UPDATE that would change it,
-- because a changed UID makes every subscribed parent's calendar create a
-- DUPLICATE instead of updating the event it already has.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  grad_year integer,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  uid text not null unique default (gen_random_uuid()::text || '@youfirstlacrosse.com'),
  title text not null,
  event_type text not null default 'other',
  starts_at timestamptz,
  ends_at timestamptz,
  all_day boolean not null default false,
  date_confirmed boolean not null default false,
  date_note text,
  location_name text,
  location_address text,
  description text,
  status text not null default 'scheduled',
  cancelled_reason text,
  applies_to_all boolean not null default false,
  published boolean not null default false,
  sequence integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_event_type_check check (
    event_type in ('practice','tournament','showcase','camp','meeting','training','other')),
  constraint events_status_check check (status in ('scheduled','cancelled')),
  constraint events_confirmed_needs_start check (date_confirmed = false or starts_at is not null),
  constraint events_end_after_start check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_published_idx on public.events (published, status);

create table if not exists public.event_teams (
  event_id uuid not null references public.events (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  primary key (event_id, team_id)
);
create index if not exists event_teams_team_idx on public.event_teams (team_id);

create table if not exists public.calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  team_id uuid references public.teams (id) on delete cascade,
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

create or replace function public.events_guard_uid()
returns trigger language plpgsql as $$
begin
  if new.uid is distinct from old.uid then
    raise exception
      'events.uid is immutable (attempted % -> %). Changing it duplicates the event on every subscribed calendar.',
      old.uid, new.uid;
  end if;
  return new;
end; $$;

create or replace function public.events_bump_sequence()
returns trigger language plpgsql as $$
begin
  if (new.title, new.starts_at, new.ends_at, new.all_day, new.location_name,
      new.location_address, new.description, new.status, new.date_confirmed)
     is distinct from
     (old.title, old.starts_at, old.ends_at, old.all_day, old.location_name,
      old.location_address, old.description, old.status, old.date_confirmed)
  then new.sequence := old.sequence + 1; end if;
  return new;
end; $$;

drop trigger if exists teams_touch_updated_at on public.teams;
create trigger teams_touch_updated_at before update on public.teams
  for each row execute function public.touch_updated_at();

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at before update on public.events
  for each row execute function public.touch_updated_at();

drop trigger if exists events_guard_uid_trg on public.events;
create trigger events_guard_uid_trg before update on public.events
  for each row execute function public.events_guard_uid();

drop trigger if exists events_bump_sequence_trg on public.events;
create trigger events_bump_sequence_trg before update on public.events
  for each row execute function public.events_bump_sequence();

alter table public.teams enable row level security;
alter table public.events enable row level security;
alter table public.event_teams enable row level security;
alter table public.calendar_feeds enable row level security;

drop policy if exists "Service role full access teams" on public.teams;
create policy "Service role full access teams" on public.teams
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role full access events" on public.events;
create policy "Service role full access events" on public.events
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role full access event_teams" on public.event_teams;
create policy "Service role full access event_teams" on public.event_teams
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role full access calendar_feeds" on public.calendar_feeds;
create policy "Service role full access calendar_feeds" on public.calendar_feeds
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════════════════
-- players_notes_and_hold_status
-- APPLIED to iklgrzabcloaqyghlggr on 2026-08-25 via MCP apply_migration.
--
-- An injured athlete is ON the roster. She is not "inactive". Before this the
-- status column had no way to say that, and a player had no notes field at all.
-- Widening the CHECK is only half the change — see src/lib/player-status.ts,
-- because every caller wrote `status === 'active'` and that comparison was
-- silently answering two different questions.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.players add column if not exists notes text;

alter table public.players drop constraint if exists players_status_check;
alter table public.players add constraint players_status_check
  check (status = any (array['active','injured','hold','inactive','alumni']));

-- ═══════════════════════════════════════════════════════════════════════════
-- fee_schedule_by_grad_year — APPLIED 2026-08-26 via MCP apply_migration.
-- Per-class season pricing. published=false means a number is still missing;
-- the CHECK makes such a row impossible to publish, so a fee a parent sees is
-- always one that was actually decided.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.fee_schedule (
  id uuid primary key default gen_random_uuid(),
  season text not null,
  grad_year integer not null,
  summer_cents integer,
  roster_cents integer not null default 20000,
  tournament_count integer,
  tournament_cents integer not null default 30000,
  published boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season, grad_year),
  constraint fee_schedule_amounts_sane check (
    (summer_cents is null or summer_cents >= 0) and roster_cents >= 0
    and tournament_cents >= 0 and (tournament_count is null or tournament_count >= 0)),
  constraint fee_schedule_published_is_complete check (
    published = false or (summer_cents is not null and tournament_count is not null))
);

-- balance_questions: which club contact the family chose (resolved server-side).
alter table public.balance_questions
  add column if not exists sent_to_contact_id uuid references public.club_contacts(id) on delete set null,
  add column if not exists sent_to_email text;

-- ═══════════════════════════════════════════════════════════════════════════
-- player_season_balances — APPLIED 2026-08-26 via MCP apply_migration.
--
-- Per-season money so the portal can show every season a family has been part
-- of. ADDITIVE ON PURPOSE: player_balances() returns one row (the most recent
-- plan) and the collections email, admin queue and /api/checkout all read it.
-- Widening it would silently change what all three see. Proven before shipping:
-- for 2025-26 this returns 59 rows matching player_balances() exactly on
-- charged, paid, remaining, percent and settled — zero mismatches.
-- ═══════════════════════════════════════════════════════════════════════════
-- (full body applied via MCP; see git history for the definition)
