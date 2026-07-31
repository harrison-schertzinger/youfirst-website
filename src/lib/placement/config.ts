/**
 * Placement send configuration. Server only.
 *
 * Every value has a working default so a missing env var degrades to something
 * correct rather than to a crash on the send path — except the two that must
 * never be guessed (the Resend key and the verified sender). Their absence is
 * reported as a refusal to send, not worked around.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.youfirstlacrosse.com";

/** Replies to a placement email must reach a human, never a noreply void. */
export const REPLY_TO =
  process.env.PLACEMENT_REPLY_TO ?? "kathleen@youfirstlacrosse.com";

export const ADMIN_NOTIFY = [
  "harrison@theyoufirstproject.com",
  "kathleen@youfirstlacrosse.com",
];

/**
 * The header band. Built by scripts/build-email-header.mjs — a flat JPEG,
 * because Gmail strips blend modes and Outlook ignores CSS gradients.
 *
 * HEADER_VARIANTS exists so a treatment can be compared in a real inbox: a
 * TEST send may name one, and the email is otherwise identical. Live sends
 * always use HEADER_DEFAULT — the variant is not a parameter a real send can
 * reach.
 */
/**
 * Every built band, keyed <photo>-<treatment>. Rebuild with
 * `node scripts/build-email-header.mjs` after dropping photos into
 * public/images/email/incoming/.
 *
 * TREATMENTS
 *   aurora   Carolina light washes the band, wordmark in the left third
 *   split    a navy panel carries the type; the photograph owns the rest
 *   duotone  luminance kept, hue mapped navy → Carolina; reads as a graphic
 */
export const HEADER_VARIANTS: Record<string, string> = {
  "goalie-aurora": "header-img-1945-aurora.jpg",
  "goalie-split": "header-img-1945-split.jpg",
  "goalie-duotone": "header-img-1945-duotone.jpg",

  "driving-aurora": "header-img-1951-2-aurora.jpg",
  "driving-split": "header-img-1951-2-split.jpg",
  "driving-duotone": "header-img-1951-2-duotone.jpg",

  "defender-aurora": "header-tryouts-hero-defender-aurora.jpg",
  "defender-split": "header-tryouts-hero-defender-split.jpg",
  "defender-duotone": "header-tryouts-hero-defender-duotone.jpg",
};

export const HEADER_DEFAULT = "driving-aurora";

export function heroUrl(variant?: string | null): string {
  const file =
    (variant && HEADER_VARIANTS[variant]) ?? HEADER_VARIANTS[HEADER_DEFAULT];
  return `${SITE_URL}/images/email/${file}`;
}

export const HERO_URL = heroUrl();
export const HERO_ALT = "YOU. FIRST — Elite Lacrosse.";

export const EMAIL_FOOTER =
  "YOU. FIRST Elite Lacrosse Club · Cincinnati, Ohio";

/**
 * The You First Standard — a PAGE, never an attachment.
 *
 * An attached PDF hurts deliverability and competes with the confirm button
 * for the one decision the email is asking for. /standard carries a print
 * stylesheet, so a family who wants a file makes one in two taps and we ship
 * nothing heavier than a link.
 */
export const STANDARD_URL = `${SITE_URL}/standard`;
export const STANDARD_NAME = "The You First Standard";
export const STANDARD_LINK_LABEL = "Read The You First Standard";

/**
 * Confirmation links expire. Configurable via PLACEMENT_CONFIRM_DEADLINE as an
 * ISO date; otherwise 21 days from the moment the link is minted. An
 * unparseable value falls back to the relative default rather than minting a
 * token that expired in 1970.
 */
export function tokenExpiry(now: Date = new Date()): Date {
  const raw = process.env.PLACEMENT_CONFIRM_DEADLINE;
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    console.warn(
      `[placement] PLACEMENT_CONFIRM_DEADLINE is not a valid date: ${raw}`,
    );
  }
  return new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
}

export function confirmUrl(token: string): string {
  return `${SITE_URL}/placement/${token}`;
}

export function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Resend, or an explained refusal. Never a silent no-op. */
export function resendConfig():
  | { ok: true; apiKey: string; from: string }
  | { ok: false; reason: string } {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: "RESEND_API_KEY is not set" };
  const verifiedSender = process.env.TRYOUT_FROM_EMAIL;
  if (!verifiedSender) {
    return { ok: false, reason: "TRYOUT_FROM_EMAIL is not set" };
  }
  // Keep the domain-verified address, set only the display name.
  const bare =
    verifiedSender.match(/<([^>]+)>/)?.[1]?.trim() ?? verifiedSender.trim();
  return { ok: true, apiKey, from: `YOU. FIRST Lacrosse <${bare}>` };
}

/**
 * No attachment parameter, by design. Nothing in the placement path may attach
 * a file: the Standard is a link. Removing the capability is stronger than
 * remembering not to use it.
 */
export async function sendViaResend(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const cfg = resendConfig();
  if (!cfg.ok) return { ok: false, error: cfg.reason };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: cfg.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: REPLY_TO,
      }),
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `resend ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`,
      };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
