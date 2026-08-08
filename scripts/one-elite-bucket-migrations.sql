-- ═══════════════════════════════════════════════════════════════════════════
-- SPRINT — ONE ELITE BUCKET, THEN SEND          applied 2026-08-08
-- ═══════════════════════════════════════════════════════════════════════════
--
-- THE RECORD OF WHAT WENT TO THE REMOTE DATABASE. Every statement below was
-- applied through apply_migration against project iklgrzabcloaqyghlggr and
-- verified by a post-apply read. This file is the transcript, not the source:
-- re-running it is a no-op by construction (each UPDATE is guarded by the value
-- it is changing away from).
--
-- THE PRINCIPLE THESE ENFORCE: every team in this club is an Elite team. There
-- is no development program. `elite` and `elite_youth` are two LETTERS, not two
-- teams — a 2034 family must never receive the 2029 college-recruiting letter —
-- and a class may only ever use one of them.
--
-- DISCIPLINE FOR WHOEVER COMES NEXT: apply_migration only, never
-- `supabase db push`; `notify pgrst, 'reload schema'` closes every migration;
-- and a read-only pre-flight runs before any mutation, so the row list is known
-- before it changes rather than inferred after.

-- ── 1. normalize_one_elite_tier_per_class ──────────────────────────────────
--
-- Seven rows carried `elite` at class 2031 or younger. Two (Cam Bahl, Piper
-- Brown) were in that night's send and would have received the college letter
-- for a thirteen-year-old. Two more (Lucy Walker, Eva Behrens) had already been
-- emailed and were saved only because their TOKEN said elite_youth — which is
-- exactly what made the 2033/2034 ELITE header report a real send as zero.
--
-- One-way, toward the youth letter. Every token ever minted for 2031-2034
-- already used elite_youth, so the email side has always treated these classes
-- as one group; this makes the roster agree. The other direction hands a
-- twelve-year-old's family the college letter.
--
-- Rows changed: 2 players (Alden Long dup, Grace Lanzillotta dup) and 5
-- registrations (Evelyn Lake, Cam Bahl, Lucy Walker, Piper Brown, Eva Behrens).

update players
   set placement_tier = 'elite_youth'
 where placement_tier = 'elite'
   and coalesce(nullif(placed_team, '')::int, graduation_year) >= 2031;

update tryout_registrations
   set placement_tier = 'elite_youth'
 where placement_tier = 'elite'
   and coalesce(nullif(placed_team, '')::int, graduation_year) >= 2031;

notify pgrst, 'reload schema';

-- VERIFIED LIVE: `elite` now spans classes 2028-2030 only; `elite_youth` spans
-- 2031-2034 only. No class holds both.


-- ── 2. deactivate_placed_duplicate_player_rows ─────────────────────────────
--
-- buildRosterData() collapses a registration into its player, but SKIPS any
-- pair where both sides are returning players — autoResolveDuplicates and
-- attachDuplicates both `continue` on returning/returning. A duplicate players
-- row is therefore INVISIBLE on the roster screen: no chip, no merge control.
-- It simply renders twice.
--
-- These two are PLACED duplicates, so each was an independent send candidate:
--
--   Grace Lanzillotta 29405917 — created 2026-08-07 during a manual correction.
--   The real Grace is 36e8db08 (registration, $50 tryout payment, June 25
--   history). She was being tokened for the first time that night; with this
--   row alive her family receives two emails, and the held-athlete guard named
--   only 36e8db08.
--
--   Alden Long de39b3f6 — created 2026-07-31. The real Alden is d77fb78e
--   (registration, token, roster confirmation, two guardians).
--
-- Verified row by row before applying: zero registrations, zero placement
-- tokens, zero payments, zero payment plans, zero hermes_send_log rows, zero
-- tournament rosters, zero roster confirmations. Guardian links duplicate the
-- surviving row's, so no contact detail is lost.
--
-- REVERSIBLE: set status back to 'active'. Nothing is deleted.
--
-- NOT TOUCHED, deliberately — the other six duplicate name-groups are all
-- UNPLACED, so none is a send candidate and none distorts a team count.
-- Annabel Dawes' second row additionally carries a payment. Left for Harrison.

update players
   set status = 'inactive'
 where id in (
   '29405917-3e7b-46fe-86c5-f6929c601adb',  -- Grace Lanzillotta, duplicate
   'de39b3f6-d653-4ad5-9305-c1a6f9cf90d6'   -- Alden Long, duplicate
 )
   and status = 'active';

notify pgrst, 'reload schema';

-- VERIFIED LIVE: both rows inactive; both surviving rows active and unchanged
-- at 2033 / elite_youth and 2032 / elite_youth respectively.


-- ── 3. retire_elite_development_program_from_letter ────────────────────────
--
-- The youth letter's subject line was "Welcome to the Elite Development
-- Program." Renaming every screen in the building and leaving that subject
-- intact would be renaming nothing.
--
-- Both replacements reach for {{placement_label}}, the merge field that already
-- existed and now resolves through the corrected tierLabel() — so the letter
-- names HER team ("2033/2034 Elite", "2032 Elite", "2031 Elite") rather than
-- carrying one hardcoded name for four classes. An unfilled merge field is a
-- hard block in renderEmail(), so this cannot silently degrade.
--
-- A RENAME, NOT A REWRITE. Two strings. Deliberately untouched:
--   · "premier elite development program" — lowercase prose about the club, and
--     the IDENTICAL sentence sits in the Elite and Blue letters that 79
--     families received on 31 July. Editing it here alone would make three
--     approved letters disagree.
--   · "a development platform" — describes YOU.PRJCT+, not a team.
--   · "For our development teams, the focus is..." — lowercase prose, but the
--     one line that still reads like a tier. Flagged for Harrison, not reworded.

update email_templates
   set subject = 'Welcome to the {{placement_label}} team.'
 where name = 'Placement — Elite Development Program'
   and subject = 'Welcome to the Elite Development Program.';

update email_templates
   set body = replace(
         body,
         '{{player_first_name}} has a spot in the Elite Development Program for 2026–27.',
         '{{player_first_name}} has a spot on the {{placement_label}} team for 2026–27.'
       )
 where name = 'Placement — Elite Development Program';

notify pgrst, 'reload schema';

-- VERIFIED LIVE by rendering the real letter for three classes: the proper noun
-- "Elite Development Program" is absent from subject, text and HTML in all
-- three, and the subject reads "Welcome to the 2033/2034 Elite team." /
-- "Welcome to the 2032 Elite team." / "Welcome to the 2031 Elite team."
--
-- THE TEMPLATE ROW NAME IS UNCHANGED, deliberately: email_templates.name is a
-- primary key that TEMPLATE_NAME_BY_TIER looks up. Renaming it is a two-place
-- change whose failure mode is a live send finding no template, and no family
-- ever sees the string.
