-- ============================================================================
-- 2026 Tryouts — make-up path: add tryout_type
-- Applied to Supabase project iklgrzabcloaqyghlggr via the apply_migration
-- tool (migration name: add_tryout_type_to_tryout_registrations) on 2026-06-19.
-- Repo-of-record copy; NOT run by `supabase db push`.
--
-- 'scheduled' = grad-year-assigned Saturday session (July 11 / July 25).
-- 'makeup'    = parent-picked morning (8 AM–12 PM) through Aug 7 at the Academy.
-- tryout_group stays NOT NULL (always derived from grad year, even for make-ups);
-- tryout_date holds the assigned date (scheduled) or the picked date (make-up).
-- RLS is unchanged (service-role only).
-- ============================================================================

alter table public.tryout_registrations
  add column if not exists tryout_type text not null default 'scheduled'
    check (tryout_type in ('scheduled','makeup'));

create index if not exists tryout_registrations_type_idx
  on public.tryout_registrations (tryout_type);
