-- ============================================================================
-- Ask Us Anything — qa_unanswered_questions
-- Applied to Supabase project iklgrzabcloaqyghlggr via the apply_migration
-- tool (migration name: create_qa_unanswered_questions) on 2026-07-03.
-- This file is the repo-of-record copy; it is NOT run by `supabase db push`.
--
-- Flow: the homepage "Ask us anything" widget calls POST /api/ask. When the
-- AI is not confident it can answer from the master Q&A (src/content/
-- master-qa.md), the widget collects the parent's email and POSTs it with the
-- question to /api/ask/capture, which inserts a row here via the service-role
-- key. Harrison reviews rows and follows up personally; recurring questions
-- get promoted into the master Q&A.
--
-- Security: RLS enabled, service-role-only policy, and explicit REVOKEs so a
-- future view/table rebuild can't silently re-grant anon access (the
-- default-privilege trap). No PII beyond the parent-provided email.
-- ============================================================================

create table if not exists public.qa_unanswered_questions (
  id          uuid        primary key default gen_random_uuid(),
  email       text        not null,
  question    text        not null,
  source      text        not null default 'website',
  status      text        not null default 'new'
                check (status in ('new', 'answered', 'archived')),
  notes       text,
  answered_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists qa_unanswered_questions_created_at_idx
  on public.qa_unanswered_questions (created_at desc);

create index if not exists qa_unanswered_questions_status_idx
  on public.qa_unanswered_questions (status);

alter table public.qa_unanswered_questions enable row level security;

drop policy if exists "Service role full access qa_unanswered_questions"
  on public.qa_unanswered_questions;
create policy "Service role full access qa_unanswered_questions"
  on public.qa_unanswered_questions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Belt and suspenders: even with RLS, deny table-level grants to the public
-- Postgres roles so anon/authenticated cannot touch the table at all.
revoke all on table public.qa_unanswered_questions from anon, authenticated;

create or replace function public.set_qa_unanswered_questions_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_qa_unanswered_questions_updated_at
  on public.qa_unanswered_questions;
create trigger trg_qa_unanswered_questions_updated_at
  before update on public.qa_unanswered_questions
  for each row execute function public.set_qa_unanswered_questions_updated_at();
