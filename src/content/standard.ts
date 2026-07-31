/**
 * THE YOU FIRST STANDARD — content.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THIS FILE HOLDS NO WRITING OF MINE, AND MUST NOT.
 *
 *  The brief is explicit: the content is written and lives in a file Harrison
 *  provides — "do not invent or paraphrase any of it." So every prose block
 *  below is a `pending` marker, which renders as the same visible
 *  "Pending Harrison" chip /coaches already ships. Dropping his copy in is a
 *  paste, not a rebuild.
 *
 *  The section TITLES are his own, carried verbatim from the T2 brief's list.
 *  Nothing else here is words.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ADDENDUM B applies to every word that lands here:
 *   B1  "Development" describes what the club does — never a person, a team or
 *       a tier. The rosters are Elite, You First Blue, the Elite Development
 *       Program and the Elite Training Group.
 *   B2  Tier labels are exact and come from tierLabel(): "{Class} Elite",
 *       "You First Blue", "Elite Development Program", "Elite Training Group".
 *       no_tryout / no_registration / declined / pending are INTERNAL and must
 *       never appear on this page.
 *   B3  Banned: developmental / B team / second team / lower team / tier 2 /
 *       did not make it / unfortunately. Never open a sentence by naming what
 *       an athlete did not get.
 *   B4  Blue is not a downgrade.
 */

export type StandardBlock =
  | { type: "p"; text: string }
  | { type: "lede"; text: string }
  | { type: "h"; text: string }
  | { type: "list"; items: string[] }
  | { type: "pillars"; items: { lead: string; body: string }[] }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "note"; text: string }
  /** Copy Harrison still owes. Renders as a visible chip; never invented. */
  | { type: "pending"; label: string };

export interface StandardSection {
  /** Stable slug — the in-page anchor and the contents-list link. */
  slug: string;
  title: string;
  blocks: StandardBlock[];
}

export interface StandardDoc {
  title: string;
  season: string;
  /** Shown under the title in the hero. */
  standfirst: StandardBlock;
  sections: StandardSection[];
}

export const STANDARD: StandardDoc = {
  title: "The You First Standard",
  season: "2026–27",
  standfirst: { type: "pending", label: "Standfirst" },
  sections: [
    {
      slug: "who-we-are",
      title: "Who we are",
      blocks: [
        { type: "pending", label: "Who we are" },
        { type: "h", text: "What we are building" },
        {
          type: "pillars",
          items: [
            { lead: "Own development in this area.", body: "" },
            { lead: "Build the best players.", body: "" },
            { lead: "Take our teams to the best tournaments.", body: "" },
            { lead: "Play at the highest level.", body: "" },
          ],
        },
        { type: "pending", label: "The four pillars" },
      ],
    },
    {
      slug: "structure",
      title: "Structure",
      blocks: [
        { type: "pending", label: "The teams" },
        { type: "h", text: "How athletes move between them" },
        { type: "pending", label: "Movement" },
      ],
    },
    {
      slug: "the-standard",
      title: "The 2026–27 standard",
      blocks: [
        { type: "pending", label: "Every team on the platform" },
        { type: "h", text: "What gets measured" },
        { type: "pending", label: "What gets measured" },
      ],
    },
    {
      slug: "offseason",
      title: "Offseason expectations",
      blocks: [{ type: "pending", label: "Consistency on skill work" }],
    },
    {
      slug: "summer",
      title: "Summer training and resources",
      blocks: [{ type: "pending", label: "Summer training and resources" }],
    },
    {
      slug: "staff",
      title: "Coaching staff",
      blocks: [{ type: "pending", label: "The 2026–27 staff" }],
    },
    {
      slug: "calendar",
      title: "Tournament and season calendar",
      blocks: [{ type: "pending", label: "The season, month by month" }],
    },
    {
      slug: "contacts",
      title: "Contacts",
      blocks: [{ type: "pending", label: "Who to reach, and for what" }],
    },
  ],
};

/** True once no `pending` marker survives — nothing depends on it yet, but the
 *  send screen and any future publish gate can ask. */
export function standardIsWritten(doc: StandardDoc = STANDARD): boolean {
  if (doc.standfirst.type === "pending") return false;
  return doc.sections.every((s) => s.blocks.every((b) => b.type !== "pending"));
}
