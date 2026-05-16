/**
 * Admin allowlist — the only emails that can access /admin.
 *
 * Hardcoded for now per the Command Center spec; move to Supabase once
 * we have more than two operators. Compared case-insensitively after
 * trimming so trailing whitespace / casing typos can't lock anyone out.
 */
const ADMIN_ALLOWLIST = [
  "harrison@theyoufirstproject.com",
  "kathleen@youfirstelitelacrosseclub.com",
] as const;

export function isEmailAllowed(rawEmail: string | null | undefined): boolean {
  if (!rawEmail) return false;
  const email = rawEmail.trim().toLowerCase();
  return ADMIN_ALLOWLIST.some((allowed) => allowed.toLowerCase() === email);
}

export { ADMIN_ALLOWLIST };
