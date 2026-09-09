/**
 * Operations contacts — shared vocabulary.
 *
 * NOT club_contacts. That table is the club's PUBLISHED front desk — who a
 * family emails — and every row in it renders on the parent portal. This is the
 * internal book Luke inherits: a tournament director's friend, a uniform rep, a
 * league contact. The two must never merge, because the merge puts a vendor rep
 * one boolean away from every parent in the club.
 *
 * Pure — no Supabase, no env — so the client list can import the same limits
 * the routes validate against and the same limits the database enforces.
 */

/** Mirrors the CHECK constraints in scripts/luke-handoff-migration.sql. */
export const NAME_MAX = 120;
export const CONTACT_FOR_MAX = 160;
export const NOTES_MAX = 600;

export interface OpsContact {
  id: string;
  name: string;
  contact_for: string;
  notes: string | null;
  added_by: string | null;
  created_at: string;
}

/**
 * The seeds deliberately left blank pending Harrison — Gary Potterbaum's
 * relationship, and which league app the club actually uses. The spec marked
 * both "[Harrison to specify]", so rather than invent a plausible answer the
 * row exists and says out loud that it is incomplete.
 */
export const NEEDS_DETAIL = "Needs detail";

export function needsDetail(contact: { contact_for: string }): boolean {
  return contact.contact_for.trim().toLowerCase() === NEEDS_DETAIL.toLowerCase();
}
