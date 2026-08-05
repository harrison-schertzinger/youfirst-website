/**
 * The confirmation link. Server only.
 *
 * One token per athlete per campaign, non-guessable, expiring. It carries no
 * information — it is a random 256-bit lookup key, not a signed payload — so a
 * family cannot read a placement out of the URL, and a leaked link grants
 * nothing beyond the one athlete it was minted for.
 *
 * The token row is also where "has she confirmed" is recorded, which is what
 * makes the nudge safe: a confirmed family is filtered by a column, not by a
 * count of emails sent.
 */

import crypto from "node:crypto";
import { type SupabaseClient } from "@supabase/supabase-js";
import { confirmUrl, tokenExpiry } from "@/lib/placement/config";
import { PLACEMENT_CAMPAIGN, type SendableTier } from "@/lib/placement/shared";

export interface TokenRow {
  id: string;
  token: string;
  campaign: string;
  athlete_table: "players" | "tryout_registrations";
  athlete_id: string;
  athlete_name: string;
  class_year: number | null;
  placement_tier: SendableTier;
  recipient_email: string;
  parent_name: string | null;
  expires_at: string;
  confirmed_at: string | null;
  roster_confirmation_id: string | null;
  receipt_sent_at: string | null;
}

export const TOKEN_COLUMNS =
  "id, token, campaign, athlete_table, athlete_id, athlete_name, class_year, placement_tier, recipient_email, parent_name, expires_at, confirmed_at, roster_confirmation_id, receipt_sent_at";

function mint(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export interface IssueInput {
  table: "players" | "tryout_registrations";
  id: string;
  name: string;
  classYear: number | null;
  tier: SendableTier;
  email: string;
  parentName: string | null;
}

/**
 * Get this athlete's link for this campaign, creating it if she has none.
 *
 * Idempotent by (campaign, athlete_table, athlete_id) — a preview, a test send
 * and the real send all resolve to the SAME link, so what Harrison sees in the
 * preview is the URL the family receives. A re-issue refreshes the details we
 * print on the confirmation page but never rotates the token: an already-sent
 * email must not have its link invalidated by someone reopening the send screen.
 */
export async function issueToken(
  db: SupabaseClient,
  input: IssueInput,
): Promise<{ row: TokenRow; url: string }> {
  const { data: existing, error: readErr } = await db
    .from("placement_tokens")
    .select(TOKEN_COLUMNS)
    .eq("campaign", PLACEMENT_CAMPAIGN)
    .eq("athlete_table", input.table)
    .eq("athlete_id", input.id)
    .maybeSingle();
  if (readErr) throw new Error(`Token read failed: ${readErr.message}`);

  if (existing) {
    const row = existing as TokenRow;
    const drifted =
      row.placement_tier !== input.tier ||
      row.recipient_email !== input.email ||
      row.athlete_name !== input.name ||
      row.class_year !== input.classYear ||
      row.parent_name !== input.parentName;

    // Never re-stamp a link a family has already used.
    if (drifted && !row.confirmed_at) {
      const { data: updated, error: updErr } = await db
        .from("placement_tokens")
        .update({
          placement_tier: input.tier,
          recipient_email: input.email,
          athlete_name: input.name,
          class_year: input.classYear,
          parent_name: input.parentName,
        })
        .eq("id", row.id)
        .select(TOKEN_COLUMNS)
        .single();
      if (updErr) throw new Error(`Token refresh failed: ${updErr.message}`);
      const fresh = updated as TokenRow;
      return { row: fresh, url: confirmUrl(fresh.token) };
    }
    return { row, url: confirmUrl(row.token) };
  }

  const { data: inserted, error: insErr } = await db
    .from("placement_tokens")
    .insert({
      token: mint(),
      campaign: PLACEMENT_CAMPAIGN,
      athlete_table: input.table,
      athlete_id: input.id,
      athlete_name: input.name,
      class_year: input.classYear,
      placement_tier: input.tier,
      recipient_email: input.email,
      parent_name: input.parentName,
      expires_at: tokenExpiry().toISOString(),
    })
    .select(TOKEN_COLUMNS)
    .single();

  // Lost a race with a concurrent issue — read the winner rather than fail.
  if (insErr) {
    if ((insErr as { code?: string }).code === "23505") {
      const { data: winner } = await db
        .from("placement_tokens")
        .select(TOKEN_COLUMNS)
        .eq("campaign", PLACEMENT_CAMPAIGN)
        .eq("athlete_table", input.table)
        .eq("athlete_id", input.id)
        .single();
      if (winner) {
        const row = winner as TokenRow;
        return { row, url: confirmUrl(row.token) };
      }
    }
    throw new Error(`Token issue failed: ${insErr.message}`);
  }

  const row = inserted as TokenRow;
  return { row, url: confirmUrl(row.token) };
}

/**
 * This athlete's existing link for this campaign, or null if she has none.
 *
 * A READ, unlike issueToken — the resend path needs the token's id before it
 * corrects an address, and must not mint or re-stamp anything to get it.
 */
export async function findTokenForAthlete(
  db: SupabaseClient,
  table: "players" | "tryout_registrations",
  id: string,
): Promise<TokenRow | null> {
  const { data, error } = await db
    .from("placement_tokens")
    .select(TOKEN_COLUMNS)
    .eq("campaign", PLACEMENT_CAMPAIGN)
    .eq("athlete_table", table)
    .eq("athlete_id", id)
    .maybeSingle();
  if (error) throw new Error(`Token lookup failed: ${error.message}`);
  return (data as TokenRow | null) ?? null;
}

export async function findToken(
  db: SupabaseClient,
  token: string,
): Promise<TokenRow | null> {
  if (!token || token.length < 20 || token.length > 200) return null;
  const { data, error } = await db
    .from("placement_tokens")
    .select(TOKEN_COLUMNS)
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error(`Token lookup failed: ${error.message}`);
  return (data as TokenRow | null) ?? null;
}

export function isExpired(row: TokenRow, now: Date = new Date()): boolean {
  return new Date(row.expires_at).getTime() < now.getTime();
}
