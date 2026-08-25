/**
 * Admin allowlist — the only emails that can access /admin.
 *
 * Compared case-insensitively after trimming so trailing whitespace or a
 * casing typo can't lock anyone out.
 *
 * 2026-08-25 — Harrison is moving to harrison@youfirstlacrosse.com as his one
 * club address. harrison@theyoufirstproject.com is RETIRED IN INTENT but stays
 * on this list until he has actually signed in with the new one: it is his only
 * proven way in, and pulling it first would lock him out of the Command Center
 * with no recovery path but the Supabase dashboard. Delete the marked line
 * below once the new address is confirmed working.
 */
const ADMIN_ALLOWLIST = [
  // Harrison — the one club address going forward.
  "harrison@youfirstlacrosse.com",

  // RETIRE ME once harrison@youfirstlacrosse.com has signed in successfully.
  "harrison@theyoufirstproject.com",

  // Kathleen.
  "kathleen@youfirstlacrosse.com",
  "kathleen@youfirstelitelacrosseclub.com",
] as const;

export function isEmailAllowed(rawEmail: string | null | undefined): boolean {
  if (!rawEmail) return false;
  const email = rawEmail.trim().toLowerCase();
  return ADMIN_ALLOWLIST.some((allowed) => allowed.toLowerCase() === email);
}

export { ADMIN_ALLOWLIST };
