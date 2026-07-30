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

export const HERO_URL = `${SITE_URL}/images/email/placement-hero.jpg`;
export const HERO_ALT =
  "YOU. FIRST athletes on the field at sunrise, arms around each other.";

export const EMAIL_FOOTER =
  "YOU. FIRST Elite Lacrosse Club · Cincinnati, Ohio";

/** The two Club Standard variants, served from public/documents. */
export const CLUB_STANDARD = {
  tournament: {
    file: "club-standard-tournament.pdf",
    label: "The Club Standard — Tournament Rosters",
  },
  elite_youth: {
    file: "club-standard-elite-youth.pdf",
    label: "The Club Standard — Elite Youth Program",
  },
} as const;

export type ClubStandardVariant = keyof typeof CLUB_STANDARD;

export function clubStandardUrl(variant: ClubStandardVariant): string {
  return `${SITE_URL}/documents/${CLUB_STANDARD[variant].file}`;
}

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

export interface Attachment {
  filename: string;
  /** base64, no data: prefix — what Resend expects. */
  content: string;
}

export async function sendViaResend(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Attachment[];
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
        ...(input.attachments?.length
          ? { attachments: input.attachments }
          : {}),
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
