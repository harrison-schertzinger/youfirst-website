-- ============================================================================
--  PLACEMENT EMAILS (T2) — repo copy of the migrations applied to
--  iklgrzabcloaqyghlggr on 2026-07-30, in the order they were applied.
--
--    1. placement_emails_foundation
--    2. placement_email_templates_seed
--    3. hermes_send_log_placement_kinds
--    4. placement_templates_addendum_b_guidance
--    5. placement_elite_development_program_rename
--    6. placement_seed_fixed_deadline
--    7. placement_resend_claim_uniq            (2026-08-05)
--
--  Applied via apply_migration; this file exists so the repo describes its own
--  schema, matching scripts/roster-crm-migrations.sql. Re-running it is NOT
--  idempotent — it is a record, not a runner.
-- ============================================================================


-- ─── 1. placement_emails_foundation ────────────────────────────────────────

alter table public.email_templates drop constraint email_templates_type_check;
alter table public.email_templates
  add constraint email_templates_type_check
  check (type = any (array[
    'intro','logistics','payment_reminder','overdue_notice',
    'announcement','general','custom','qa_acknowledgement','placement'
  ]));

create table public.placement_tokens (
  id                      uuid primary key default gen_random_uuid(),
  token                   text not null unique,
  campaign                text not null,
  athlete_table           text not null
                            check (athlete_table in ('players','tryout_registrations')),
  athlete_id              uuid not null,
  athlete_name            text not null,
  class_year              integer,
  -- 'declined' is absent on purpose: a declined athlete can never be issued a
  -- confirm link, enforced by the schema rather than by a code path.
  placement_tier          text not null
                            check (placement_tier in ('elite','blue','elite_youth','elite_training')),
  recipient_email         text not null,
  parent_name             text,
  expires_at              timestamptz not null,
  confirmed_at            timestamptz,
  roster_confirmation_id  uuid references public.roster_confirmations(id) on delete set null,
  receipt_sent_at         timestamptz,
  created_at              timestamptz not null default now()
);

create unique index placement_tokens_athlete_uniq
  on public.placement_tokens (campaign, athlete_table, athlete_id);
create index placement_tokens_campaign_idx
  on public.placement_tokens (campaign, placement_tier);

-- RLS on, zero policies — service-role only, the same posture as
-- roster_confirmations. The anon key cannot read a family's token.
alter table public.placement_tokens enable row level security;

-- The existing collections dedup key is (kind, player_id, cycle_key). Placement
-- audiences live in TWO tables and a tryout_registrations athlete has no
-- player_id, so a NULL there would silently defeat uniqueness for most of the
-- audience. The placement key encodes the athlete into cycle_key instead
-- ("placement-2026-27|reg:<uuid>"), which is never NULL.
create unique index hermes_send_log_placement_claim_uniq
  on public.hermes_send_log (kind, cycle_key)
  where kind in ('placement','placement_nudge','placement_receipt')
    and status in ('claimed','sent');

-- A one-click confirmation knows the parent's email but not her phone or
-- uniform sizes; the existing gear flow collects those later, which is why
-- sweatshirt_size / shooting_shirt_size were already nullable. Nothing here
-- weakens the public /roster form — that route validates every field
-- server-side before it inserts.
alter table public.roster_confirmations
  alter column parent1_name  drop not null,
  alter column parent1_phone drop not null,
  alter column jersey_size   drop not null,
  alter column shorts_size   drop not null;

-- The oldest players on the books are the class of 2027 (16 of them).
alter table public.roster_confirmations
  drop constraint roster_confirmations_player_grad_year_check;
alter table public.roster_confirmations
  add constraint roster_confirmations_player_grad_year_check
  check (player_grad_year >= 2027 and player_grad_year <= 2035);

-- 'development' stays for the legacy form; the placement vocabulary joins it.
alter table public.roster_confirmations
  drop constraint roster_confirmations_team_check;
alter table public.roster_confirmations
  add constraint roster_confirmations_team_check
  check (team in ('development','elite','blue','elite_youth','elite_training'));

alter table public.roster_confirmations
  add column if not exists confirmation_source text not null default 'form',
  add column if not exists placement_token_id uuid references public.placement_tokens(id) on delete set null,
  add column if not exists source_table text,
  add column if not exists source_id uuid;

alter table public.roster_confirmations
  add constraint roster_confirmations_confirmation_source_check
  check (confirmation_source in ('form','placement_link'));
alter table public.roster_confirmations
  add constraint roster_confirmations_source_table_check
  check (source_table is null or source_table in ('players','tryout_registrations'));

create index roster_confirmations_source_idx
  on public.roster_confirmations (source_table, source_id);

notify pgrst, 'reload schema';


-- ─── 2. placement_email_templates_seed ─────────────────────────────────────
--
--  Six rows in email_templates, type 'placement'. Full bodies are in the
--  migration history and editable at /admin/templates — they are copy, not
--  schema, and are deliberately NOT duplicated here where they would go stale
--  the first time Harrison edits one.
--
--    Placement — Elite
--    Placement — Blue
--    Placement — Elite Development Program (renamed in 5)
--    Placement — Elite Training Group
--    Placement — Confirmation Receipt
--    Placement — Unconfirmed Nudge
--
--  Body format: `--- key ---` opens a content region; `{{key}}` is a merge
--  field; `[[ ... ]]` is copy nobody has written yet and hard-blocks the send.


-- ─── 3. hermes_send_log_placement_kinds ────────────────────────────────────
--
--  Caught by the pre-send proof, not by a family: without these the claim
--  insert fails a CHECK and no placement email can be sent at all.

alter table public.hermes_send_log drop constraint hermes_send_log_kind_check;
alter table public.hermes_send_log
  add constraint hermes_send_log_kind_check
  check (kind = any (array[
    'payment_reminder','overdue_notice','qa_ack','morning_briefing',
    'collections','collections_test','collections_summary',
    'placement','placement_nudge','placement_receipt','placement_test'
  ]));

notify pgrst, 'reload schema';


-- ─── 4. placement_templates_addendum_b_guidance ────────────────────────────
--
--  Prepends an Addendum B reminder into every placement template body, inside
--  a [[ ]] block that deletes with the rest of the placeholders. B3's word list
--  is enforced in code (BANNED_PATTERNS, src/lib/placement/shared.ts); the two
--  rules a regex cannot judge are stated in the template, next to the cursor.
--  Full text is in the migration history — it is copy, not schema.


-- ─── 5. placement_elite_development_program_rename (2026-07-30) ────────────
--
--  "Elite Youth Program" → "Elite Development Program". The display label is
--  ELITE_DEV_PROGRAM in src/lib/rosters/shared.ts and propagates through
--  tierLabel() to the roster screen and the emails on its own. Only the
--  template ROW name needs SQL — TEMPLATE_NAME_BY_TIER looks it up by name, so
--  code and row must move together or the elite_youth send finds no template.

update public.email_templates
set name = 'Placement — Elite Development Program'
where name = 'Placement — Elite Youth Program' and type = 'placement';

update public.email_templates
set body = replace(body, 'Elite Youth Program', 'Elite Development Program'),
    subject = replace(subject, 'Elite Youth Program', 'Elite Development Program'),
    description = replace(description, 'Elite Youth Program', 'Elite Development Program')
where type = 'placement';

notify pgrst, 'reload schema';


-- ─── 6. placement_seed_fixed_deadline (2026-07-30) ─────────────────────────
--
--  The deadline is a FIXED DATE for the whole round, not a per-send variable:
--  nobody fills anything in before approving, and no two groups can go out
--  carrying different dates. It is the only sentence safe to write without
--  Harrison, because it states a fact he set. {{deadline}} = "August 7" and
--  {{deadline_long}} = "Friday, August 7" are also available as merge fields.

update public.email_templates
set body = regexp_replace(
  body,
  '--- deadline ---\s*\n\[\[[^\]]*\]\]',
  '--- deadline ---' || chr(10) || 'Her place is held through Friday, August 7.',
  'g'
)
where type = 'placement' and body like '%--- deadline ---%';

notify pgrst, 'reload schema';


-- ─── 7. placement_resend_claim_uniq (2026-08-05) ───────────────────────────
--
--  A resend is claimed before it sends, exactly like an original send.
--
--  Deliberately a SEPARATE index rather than an ALTER of
--  hermes_send_log_placement_claim_uniq: dropping and recreating that one would
--  leave a window, however brief, in which the 79 already-sent placement emails
--  were not protected from a duplicate claim. Additive costs nothing and risks
--  nothing.
--
--  The cycle_key carries the attempt ordinal ("...|resend-2"), so two
--  overlapping resends of the same athlete compute the same key, exactly one
--  INSERT survives, and the loser skips instead of sending a second copy.

create unique index if not exists hermes_send_log_placement_resend_claim_uniq
  on public.hermes_send_log (kind, cycle_key)
  where kind = 'placement_resend' and status in ('claimed', 'sent');
