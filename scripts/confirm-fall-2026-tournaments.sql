-- ═══════════════════════════════════════════════════════════════════════════
-- confirm_fall_2026_tournament_dates
--
-- APPLIED to project iklgrzabcloaqyghlggr (youfirst-lacrosse) via MCP
-- execute_sql. Recorded here for the repo's history.
--
-- Confirms the three Fall 2026 Elite weekends the operators have now
-- released. Does not invent Summer 2027 dates. Does not touch event UIDs
-- (events_guard_uid_trg refuses that, and a changed UID would duplicate
-- the event on every subscribed parent calendar).
--
-- Sequence increments via events_bump_sequence_trg on the date / location
-- / description change.
--
-- Guarded on date_confirmed = false so a re-run is a no-op.
-- ═══════════════════════════════════════════════════════════════════════════

update public.events
set
  starts_at = timestamptz '2026-11-07 00:00:00 America/New_York',
  ends_at = timestamptz '2026-11-08 00:00:00 America/New_York',
  all_day = true,
  date_confirmed = true,
  date_note = null,
  location_name = 'The Proving Grounds, Conshohocken, PA',
  description = 'NXT Sports · The Proving Grounds, Conshohocken PA. First weekend of the NCAA fall live period.'
where id = '224f6a58-81bc-472d-b981-de6b951be281'
  and title = 'Continental Cup'
  and date_confirmed = false;

update public.events
set
  starts_at = timestamptz '2026-11-14 00:00:00 America/New_York',
  ends_at = timestamptz '2026-11-15 00:00:00 America/New_York',
  all_day = true,
  date_confirmed = true,
  date_note = null,
  location_name = 'Robinson Sports, MD',
  description = 'MidAtlantic Showcase · recruiting-year team only.'
where id = 'e257287f-d830-4dfd-91b7-a9d6e6ea4566'
  and title = 'Mid Atlantic'
  and date_confirmed = false;

update public.events
set
  starts_at = timestamptz '2026-11-20 00:00:00 America/New_York',
  ends_at = timestamptz '2026-11-22 00:00:00 America/New_York',
  all_day = true,
  date_confirmed = true,
  date_note = null,
  location_name = 'Bradenton & Tampa, FL',
  description = 'IWLCA'
where id = '796afebf-16af-46a4-b30b-c2e40f25773b'
  and title = 'President''s Cup'
  and date_confirmed = false;
