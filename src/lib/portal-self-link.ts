/**
 * Self-linking kill switch.
 *
 * The roster picker let any signed-in parent claim ANY active player off the
 * full roster with no verification, then read that family's charged/paid/
 * remaining, her payment history, and her adjustment reason. The portal is
 * gated only by a single universal password — and the season close-out is about
 * to put that password in 33 households' inboxes. One adjustment reason reads
 * "Released — departed program, payment retained."
 *
 * All 33 owing families already have linked guardian emails, with zero
 * exceptions, so nobody in either wave needs self-linking to reach her portal.
 * It is therefore OFF by default and must be turned on deliberately.
 *
 * Turning it back on for fall onboarding is a one-line env change — but it
 * should not go back on WITHOUT verification (a per-family code, or matching
 * against an invited email). The hole was the absence of that check, not the
 * feature.
 *
 * Enable with PORTAL_SELF_LINK_ENABLED=true. Server-only: this reads a
 * non-NEXT_PUBLIC var, so the value never reaches the browser bundle.
 */
export function isSelfLinkEnabled(): boolean {
  return process.env.PORTAL_SELF_LINK_ENABLED === "true";
}

/** What a parent sees when her email isn't recognised. */
export const SELF_LINK_DISABLED_MESSAGE =
  "We don’t have this email on file for a player yet. Reply to the email we sent you, or use the “Question about your balance?” box on your athlete’s portal, and Harrison or Kathleen will connect your account the same day.";
