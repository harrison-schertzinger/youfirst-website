-- ============================================================================
-- 2026 Tryouts go FREE + youth open-morning evaluations.
-- Applied to Supabase project iklgrzabcloaqyghlggr via the apply_migration
-- tool (migration name: tryouts_free_evaluations_widen_constraints) on
-- 2026-07-13. This file is the repo-of-record copy; it is NOT run by
-- `supabase db push`.
--
-- All changes widen/relax — fully backward-compatible with the prior code:
--   • graduation_year: 2029–2038 → 2027–2038 (Elite now includes 2027/2028)
--   • payment_status: + 'free' (no-charge registrations)
--   • tryout_type:    + 'evaluation' (youth walk-in morning evals, no fixed date)
--   • tryout_date:    now nullable (evaluation rows have no fixed date)
-- ============================================================================

alter table public.tryout_registrations
  drop constraint tryout_registrations_graduation_year_check;
alter table public.tryout_registrations
  add constraint tryout_registrations_graduation_year_check
  check (graduation_year between 2027 and 2038);

alter table public.tryout_registrations
  drop constraint tryout_registrations_payment_status_check;
alter table public.tryout_registrations
  add constraint tryout_registrations_payment_status_check
  check (payment_status in ('pending','paid','failed','expired','free'));

alter table public.tryout_registrations
  drop constraint tryout_registrations_tryout_type_check;
alter table public.tryout_registrations
  add constraint tryout_registrations_tryout_type_check
  check (tryout_type in ('scheduled','makeup','evaluation'));

alter table public.tryout_registrations
  alter column tryout_date drop not null;
