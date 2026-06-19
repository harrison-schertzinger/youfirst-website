-- ============================================================================
-- 2026 Tryouts — FORTIFY hardening (D1 + D2)
-- Applied to Supabase project iklgrzabcloaqyghlggr via the apply_migration tool
-- (migration name: harden_tryout_registrations_grants_and_search_path) on
-- 2026-06-19. Repo-of-record copy; NOT run by `supabase db push`.
--
-- D1 — least-privilege / defense-in-depth. RLS already denies anon/authenticated
--      (the table has a service-role-only policy), but the broad default table
--      grants meant the table leaned on RLS alone. Revoking them makes anon hit a
--      hard "permission denied for table" (42501) instead of an empty result.
--      service_role + postgres retain full access; the app writes EXCLUSIVELY via
--      the service-role key, so the happy path is unaffected (verified live:
--      service-role INSERT/SELECT/UPDATE/DELETE all still succeed).
--
-- D2 — pin the updated_at trigger function's search_path (Supabase advisor WARN
--      0011_function_search_path_mutable). The body only calls now() (pg_catalog,
--      always in scope) so an empty search_path is safe.
-- ============================================================================

revoke all on table public.tryout_registrations from anon, authenticated;

alter function public.set_tryout_registrations_updated_at() set search_path = '';
