-- ONE ELITE BUCKET — COLD FORTIFY
-- Applied live to iklgrzabcloaqyghlggr on 2026-08-08 and recorded here.
-- Nothing in this file needs running again; it is the record of what ran.
--
-- WHY THIS EXISTS. The sprint that preceded it reported "elite stops at 2030;
-- elite_youth starts at 2031; no class holds both." That was false when it was
-- written. Live data had 'elite' spanning 2028–2034 and class 2033 holding BOTH
-- values in BOTH tables — one of them Grace Lanzillotta, who is in tonight's
-- send. Every count below was read back out of the database after the write,
-- not predicted before it.
--
-- THE MODEL, settled: every You First team is an Elite team. One tier value.
-- Classes 2031 and up differ in tournament schedule and in nothing else — not
-- in tier, not in name, not in status. Which LETTER a family receives keys off
-- GRADUATION YEAR, in placementTemplateFor() (src/lib/placement/shared.ts),
-- and off nothing else.

-- ── 1. Collapse the bucket ─────────────────────────────────────────────────
--
-- 25 rows: 6 players + 19 tryout_registrations. NULL tiers are deliberately
-- untouched — a null tier is an athlete who has not been placed, and writing
-- 'elite' onto her would place her and put her in the send audience.
--
-- BEFORE (class_key = coalesce(placed_team, graduation_year)):
--   players  2031 elite_youth 3 · 2032 elite_youth 2 · 2033 elite 1 + elite_youth 1
--   regs     2031 elite_youth 9 · 2032 elite_youth 9 · 2033 elite 8 + elite_youth 1
--            2034 elite 4
--
-- AFTER:
--   players  2031 elite 3 · 2032 elite 2 · 2033 elite 2
--   regs     2031 elite 9 · 2032 elite 9 · 2033 elite 9 · 2034 elite 4
--   elite_youth: ZERO ROWS in both tables.

update players
   set placement_tier = 'elite', updated_at = now()
 where placement_tier = 'elite_youth';        -- 6 rows

update tryout_registrations
   set placement_tier = 'elite', updated_at = now()
 where placement_tier = 'elite_youth';        -- 19 rows

-- Grace Lanzillotta, named because she was the sole outlier and is in tonight's
-- send. All three of her rows now read 2033 / elite, matching her teammates:
--   players 36e8db08 (active)   2033 / 2033 / elite
--   players 29405917 (inactive) 2033 / 2033 / elite
--   reg     bee3284e (placed)   2033 / 2033 / elite

-- NOT TOUCHED, deliberately:
--   · placement_tokens.placement_tier still holds 30 elite_youth rows. Those
--     are the historical record of which letter was minted for a family who has
--     already received one; rewriting them would falsify that record. They are
--     inert: the send derives tier from the roster row, not the token, and
--     issueToken() re-stamps the token when the two disagree. tierLabel() still
--     renders 'elite_youth' for exactly this reason.
--   · the decline-as-a-tier corruption, the 30-row divergence list, and the six
--     unplaced duplicate name-groups. Out of scope, per the brief.
--   · Carter Quinn (reg 8fccde99, 2033 elite) stays unstaged.

-- ── 2. One deadline, one place ─────────────────────────────────────────────
--
-- Every letter's closing carried "Please confirm by August 7" as hardcoded
-- prose WHILE PLACEMENT_DEADLINE separately said the same thing. Two copies of
-- one fact is why they were able to disagree the moment the date moved. The
-- prose now reads the merge field, so the constant in
-- src/lib/placement/shared.ts is the only place the date exists.
--
-- Affected: Placement — Elite, Placement — Blue, Placement — Elite Development
-- Program. Elite Training Group and the receipt/nudge carry no date.
--
-- NOTE: this moves the date on any FUTURE resend or nudge to 2029/2030 families
-- from August 7 to August 15. No delivered email changes — those are already in
-- inboxes. PLACEMENT_DEADLINE is documented as one date for the whole round.

update email_templates
   set body = replace(body,
                      'Please confirm by August 7.',
                      'Please confirm by {{deadline}}.'),
       updated_at = now()
 where type = 'placement'
   and body like '%Please confirm by August 7.%';   -- 3 rows

-- ── 3. The retired line ────────────────────────────────────────────────────
--
-- "our development teams" is retired. Harrison approved the deletion and chose
-- the replacement (2026-08-08): a claim about the CLUB, not about a tier.
--
-- The two remaining "development" phrases in this letter — "the premier elite
-- development program in this area" in the opening, and "a development platform"
-- describing YOU.PRJCT+ in the spine — were surfaced and Harrison chose to LEAVE
-- BOTH. Neither names a tier or a lesser group, and both are word-for-word
-- identical in the Elite and Blue letters 79 families already received on
-- 31 July. Changing them here alone would make tonight's letter diverge from
-- letters already delivered.

update email_templates
   set body = replace(body,
        'For our development teams, the focus is accelerating her skill development and establishing the foundational skills that let her compete at the highest level when she gets there.',
        'We build the next generation of great lacrosse players in Cincinnati. Accelerating her skill development is what we do for every athlete here.'),
       updated_at = now()
 where name = 'Placement — Elite Development Program';   -- 1 row

-- The template ROW NAME is still "Placement — Elite Development Program". It is
-- a primary key into email_templates.name, invisible outside /admin/templates,
-- and renaming it is a two-place change whose failure mode is a live send
-- finding no template. The COPY inside it names no program.

-- ── Verification, re-run after the writes ──────────────────────────────────
--
--   select 'reg' tbl, coalesce(placed_team, graduation_year::text,'NULL') cls,
--          coalesce(placement_tier,'NULL') tier, count(*)
--     from tryout_registrations group by 1,2,3
--    union all
--   select 'players', coalesce(placed_team, graduation_year::text,'NULL'),
--          coalesce(placement_tier,'NULL'), count(*)
--     from players group by 1,2,3 order by 1,2,3;
--
-- and, for the letters themselves:
--   npx tsx scripts/prove-seven-letters.ts
--   npx tsx scripts/diagnose-placements.ts
