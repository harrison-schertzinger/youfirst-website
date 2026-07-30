-- Roster CRM migrations — repo copy of record.
-- BOTH APPLIED to prod (iklgrzabcloaqyghlggr) via MCP apply_migration on
-- 2026-07-30 as `roster_crm_placement_tier` and
-- `roster_crm_backfill_athlete_links`. Do not run again; kept here so the
-- schema story lives next to the code that depends on it.

-- ── 1. roster_crm_placement_tier ──────────────────────────────────────────
-- Placement is two fields written together: placed_team (the age-group class
-- team; its existing CHECK is the rail that makes Move Up / Move Down work,
-- untouched) and placement_tier (which roster within the class). Naming
-- standard: no 'development' value — younger classes are the Elite Youth
-- Program, unrostered training athletes are the Elite Training Group.

alter table public.tryout_registrations
  add column if not exists placement_tier text
  constraint tryout_registrations_placement_tier_check
  check (placement_tier in ('elite', 'blue', 'elite_youth', 'elite_training', 'declined'));

alter table public.players
  add column if not exists placement_tier text
  constraint players_placement_tier_check
  check (placement_tier in ('elite', 'blue', 'elite_youth', 'elite_training', 'declined'));

notify pgrst, 'reload schema';

-- ── 3. roster_crm_placement_tier_widen_decisions (applied 2026-07-30) ─────
-- no_tryout / no_registration promoted to first-class placement_tier values
-- on BOTH tables — T2's send-safety gate reads this column; a decision that
-- guards families cannot live in a substring of an editable notes field.
-- Also migrated any [decision:*] notes tags onto the column and stripped
-- them; pipeline_status='passed' for these unchanged.

-- alter table public.tryout_registrations
--   drop constraint tryout_registrations_placement_tier_check;
-- alter table public.tryout_registrations
--   add constraint tryout_registrations_placement_tier_check
--   check (placement_tier in ('elite', 'blue', 'elite_youth', 'elite_training',
--                             'no_tryout', 'no_registration', 'declined'));
-- (players constraint identically; see migration history for full text.)

-- ── 2. roster_crm_backfill_athlete_links ──────────────────────────────────
-- Populated tryout_registrations.roster_confirmation_id (26 rows) and
-- .player_id (30 rows; 1 was already set) by matching last name + graduation
-- year with a first-name guard (first 3 chars), only when unambiguous BOTH
-- ways. Ambiguous rows stayed null and surface in /admin/rosters for a human
-- decision. SUPERSEDED rows untouched. See the migration history in Supabase
-- for the full CTE text.
