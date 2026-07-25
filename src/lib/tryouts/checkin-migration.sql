-- Migration: tryout_checkin_field_columns
-- Date: 2026-07-25
-- Status: ⚠️ PROPOSED — NOT YET APPLIED to prod (iklgrzabcloaqyghlggr).
-- Apply via the Supabase MCP apply_migration tool after Harrison's approval.
-- NOT run by `supabase db push`. Repo-of-record copy for the tryout field-day
-- import (/admin/tryouts/import). Until this is applied, the import page
-- responds with a clear "migration required" message and writes nothing.
--
-- Adds the three columns the field-sheet import writes back:
--   checked_in_at   — when she was checked in at the field. Imports only ever
--                     SET this; an export where she is unchecked never clears
--                     a check-in already recorded (e.g. an earlier tryout day).
--   field_notes     — coach observations typed on the field sheet. Kept
--                     separate from `notes` (the recruiting-pipeline column)
--                     so an import can never clobber pipeline notes.
--   field_sheet_uid — uid minted on the sheet when a walk-up is added. The
--                     partial unique index makes walk-up creation idempotent:
--                     importing the same results file twice cannot create a
--                     duplicate registration.

alter table public.tryout_registrations
  add column if not exists checked_in_at timestamptz,
  add column if not exists field_notes text,
  add column if not exists field_sheet_uid text;

create unique index if not exists tryout_registrations_field_sheet_uid_key
  on public.tryout_registrations (field_sheet_uid)
  where field_sheet_uid is not null;
