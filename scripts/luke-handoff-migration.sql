-- ============================================================================
-- Luke handoff — the War Room board and the operations contact book.
--
-- WHY TWO NEW TABLES AND NOT A REUSE:
--
--   club_contacts already exists and is NOT the right home for BUILD 3. That
--   table answers "who does a FAMILY email" and every row in it is published
--   to the public portal. This one answers "who does LUKE call" — a tournament
--   director's friend, a uniform vendor, a league rep. Putting a vendor rep in
--   club_contacts would either publish them to every parent in the club or
--   require a published=false row that the portal query is one typo away from
--   leaking. Separate concern, separate table.
--
-- POSTURE: both tables are admin-only, so they match every other admin table
-- in this project — RLS ENABLED WITH ZERO POLICIES. service_role bypasses RLS;
-- anon and authenticated are denied every operation because no policy grants
-- them one. Supabase's DEFAULT PRIVILEGES hand anon/authenticated a table-wide
-- ALL grant on creation, and on the existing admin tables RLS alone is what
-- stops them. Here we also REVOKE that grant outright — defence in depth on a
-- brand-new table, and it cannot regress anything because nothing has ever
-- read these. service_role and postgres are deliberately NOT revoked.
--
-- ORDERING (high-risk-review §5): read-only guards first, then DDL, then all
-- data writes last inside ONE DO block, so a failing seed rolls back every
-- seed rather than leaving the tables half-populated.
--
-- IDEMPOTENT: safe to run twice. The seed only fires into an EMPTY table, so
-- re-running never resurrects a row Luke deleted on purpose.
-- ============================================================================

-- ── 1. Read-only guards ─────────────────────────────────────────────────────
-- Nothing here writes to an existing table, so there is no constraint census to
-- pin. What we DO assert is that we are not about to collide with a table that
-- already exists under a different shape — that would silently skip the CREATE
-- and leave the app reading columns that are not there.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'war_room_cards'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'war_room_cards'
      AND column_name = 'board_column'
  ) THEN
    RAISE EXCEPTION
      'war_room_cards exists without board_column — inspect it before re-running.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ops_contacts'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ops_contacts'
      AND column_name = 'contact_for'
  ) THEN
    RAISE EXCEPTION
      'ops_contacts exists without contact_for — inspect it before re-running.';
  END IF;
END $$;

-- ── 2. DDL ──────────────────────────────────────────────────────────────────

-- The shared whiteboard. Three columns, and deliberately nothing else: no due
-- date, no assignee, no priority. added_by is the admin's email, taken from the
-- session server-side and never sent by the browser.
CREATE TABLE IF NOT EXISTS public.war_room_cards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_column  text        NOT NULL,
  title         text        NOT NULL,
  body          text,
  added_by      text        NOT NULL,
  -- Soft delete. A whiteboard gets wiped by accident; a shared one gets wiped
  -- by someone else's accident. Archiving keeps the card recoverable by hand.
  archived_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Constraints added separately so a re-run over an existing table still lands
-- them. NOT VALID is deliberately NOT used — these tables are new and empty.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'war_room_cards_column_ck'
  ) THEN
    ALTER TABLE public.war_room_cards ADD CONSTRAINT war_room_cards_column_ck
      CHECK (board_column IN ('doing_now', 'needs_decision', 'ideas'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'war_room_cards_title_ck'
  ) THEN
    ALTER TABLE public.war_room_cards ADD CONSTRAINT war_room_cards_title_ck
      CHECK (char_length(btrim(title)) BETWEEN 1 AND 120);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'war_room_cards_body_ck'
  ) THEN
    ALTER TABLE public.war_room_cards ADD CONSTRAINT war_room_cards_body_ck
      CHECK (body IS NULL OR char_length(body) <= 400);
  END IF;
END $$;

-- The board reads one column at a time, newest first, live cards only.
CREATE INDEX IF NOT EXISTS war_room_cards_board_idx
  ON public.war_room_cards (board_column, created_at DESC)
  WHERE archived_at IS NULL;

-- Luke's inherited phone book. name + what they're the contact for + notes,
-- exactly as specified and nothing more.
CREATE TABLE IF NOT EXISTS public.ops_contacts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  contact_for  text        NOT NULL,
  notes        text,
  added_by     text,
  archived_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ops_contacts_name_ck'
  ) THEN
    ALTER TABLE public.ops_contacts ADD CONSTRAINT ops_contacts_name_ck
      CHECK (char_length(btrim(name)) BETWEEN 1 AND 120);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ops_contacts_contact_for_ck'
  ) THEN
    ALTER TABLE public.ops_contacts ADD CONSTRAINT ops_contacts_contact_for_ck
      CHECK (char_length(btrim(contact_for)) BETWEEN 1 AND 160);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ops_contacts_notes_ck'
  ) THEN
    ALTER TABLE public.ops_contacts ADD CONSTRAINT ops_contacts_notes_ck
      CHECK (notes IS NULL OR char_length(notes) <= 600);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ops_contacts_live_idx
  ON public.ops_contacts (created_at)
  WHERE archived_at IS NULL;

-- ── 3. Lockdown ─────────────────────────────────────────────────────────────
ALTER TABLE public.war_room_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_contacts   ENABLE ROW LEVEL SECURITY;

-- No policies are created on purpose. RLS on + zero policies = only a role that
-- bypasses RLS (service_role) can read or write. Every /api/admin route checks
-- the admin allowlist BEFORE it picks up the service-role key, so the allowlist
-- is the real door and this is the wall around it.
REVOKE ALL ON public.war_room_cards FROM anon, authenticated;
REVOKE ALL ON public.ops_contacts   FROM anon, authenticated;

-- ── 4. Data writes — LAST, and atomic as one statement ──────────────────────
-- Seeds only into an empty table. Re-running this file after Luke has deleted
-- "Gear Up" must not bring Gear Up back, and this is why.
DO $$
DECLARE
  seeded_by CONSTANT text := 'harrison@youfirstlacrosse.com';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.ops_contacts) THEN
    INSERT INTO public.ops_contacts (name, contact_for, notes, added_by) VALUES
      ('Lexi',
       'Top Guns tournaments',
       'Knows the Top Guns tournament director. Start here for anything Top Guns.',
       seeded_by),
      ('Gary Potterbaum',
       'Needs detail',
       'Harrison to fill in the relationship and what Gary is the contact for.',
       seeded_by),
      ('Gear Up',
       'Uniform vendor',
       'Uniforms still need organizing — see the War Room board.',
       seeded_by),
      ('LAX.com',
       'Uniform vendor',
       'Uniforms still need organizing — see the War Room board.',
       seeded_by),
      ('League app contact',
       'Needs detail',
       'Harrison to name which league app this is, and who the contact there is.',
       seeded_by);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.war_room_cards) THEN
    INSERT INTO public.war_room_cards (board_column, title, body, added_by) VALUES
      ('doing_now',
       'Get uniforms organized',
       'Two vendors on file — Gear Up and LAX.com. Decide one, then order.',
       seeded_by),
      ('doing_now',
       'The goalie hunt',
       'Several teams are short a goalie. Roster Readiness below shows which.',
       seeded_by),
      ('needs_decision',
       'Who is the recruiting coordinator',
       'A hire is likely next, reporting into this same structure.',
       seeded_by),
      ('ideas',
       'Media day',
       'Harrison''s idea. Parked here on purpose — not active work yet.',
       seeded_by);
  END IF;
END $$;
