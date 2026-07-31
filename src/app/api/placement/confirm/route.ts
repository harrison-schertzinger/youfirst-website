import { NextRequest, NextResponse } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { pingCommandSheet } from "@/lib/command-sheet/engine";
import { splitName } from "@/lib/command-sheet/data";
import { getServiceClient } from "@/lib/placement/config";
import { findToken, isExpired, type TokenRow } from "@/lib/placement/tokens";
import { notifyConfirmation, sendReceipt } from "@/lib/placement/send";

export const dynamic = "force-dynamic";

/**
 * POST /api/placement/confirm  { token }
 *
 * Public, tokenized, no login, no form. The family taps one button.
 *
 * CONFIRMATION IS CLAIMED ATOMICALLY: the UPDATE carries
 * `where confirmed_at is null`, so a double-tap, a prefetch or two devices at
 * once produce exactly one confirmation, one roster_confirmations row, one
 * receipt and one notification. Everything after the claim is a follow-on
 * effect and fails soft — her spot is confirmed the moment the row flips, and
 * a Resend hiccup must never take that back.
 */

const isRateLimited = createRateLimiter(8);

const GRAD_YEAR_MIN = 2027;
const GRAD_YEAR_MAX = 2035;

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (isRateLimited(clientIp(request))) {
    return NextResponse.json(
      { error: "Too many attempts — please wait a minute and try again." },
      { status: 429 },
    );
  }

  let body: { token?: unknown };
  try {
    body = (await request.json()) as { token?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const db = getServiceClient();
  if (!db) {
    return NextResponse.json(
      { error: "We couldn't reach our records. Please try again shortly." },
      { status: 503 },
    );
  }

  let row: TokenRow | null;
  try {
    row = await findToken(db, token);
  } catch (err) {
    console.error("[placement/confirm] lookup failed:", err);
    return NextResponse.json(
      { error: "We couldn't reach our records. Please try again shortly." },
      { status: 503 },
    );
  }

  // Same response for an unknown and a malformed token — nothing here should
  // help someone probe for valid links.
  if (!row) {
    return NextResponse.json({ error: "This link is not valid." }, { status: 404 });
  }

  if (row.confirmed_at) {
    return NextResponse.json({ ok: true, alreadyConfirmed: true });
  }

  if (isExpired(row)) {
    return NextResponse.json(
      { error: "expired", expiresAt: row.expires_at },
      { status: 410 },
    );
  }

  // ── The claim. One winner, always. ──────────────────────────────────────
  const { data: claimed, error: claimErr } = await db
    .from("placement_tokens")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("confirmed_at", null)
    .select("id, confirmed_at")
    .maybeSingle();

  if (claimErr) {
    console.error("[placement/confirm] claim failed:", claimErr);
    return NextResponse.json(
      { error: "We couldn't save that. Please try again." },
      { status: 500 },
    );
  }
  // Lost the race to a concurrent tap — the other one did the work.
  if (!claimed) {
    return NextResponse.json({ ok: true, alreadyConfirmed: true });
  }

  // ── Everything below is follow-on, and fails soft ───────────────────────
  const confirmationId = await upsertRosterConfirmation(db, row);
  if (confirmationId) {
    await db
      .from("placement_tokens")
      .update({ roster_confirmation_id: confirmationId })
      .eq("id", row.id);
  }

  let receiptOk = false;
  try {
    const receipt = await sendReceipt(db, row);
    receiptOk = receipt.ok;
    if (!receipt.ok) {
      console.error("[placement/confirm] receipt failed:", receipt.error);
    }
  } catch (err) {
    console.error("[placement/confirm] receipt threw:", err);
  }

  try {
    await notifyConfirmation(row, receiptOk);
  } catch (err) {
    console.error("[placement/confirm] admin notify threw:", err);
  }

  // Mirror onto the Roster Command Sheet, like the /roster form does.
  await pingCommandSheet("confirmation").catch(() => {});

  return NextResponse.json({ ok: true, alreadyConfirmed: false });
}

/**
 * Land the confirmation in roster_confirmations — the table the roster screen
 * already reads to decide whether a family has confirmed.
 *
 * A one-click confirmation cannot know uniform sizes or a parent's phone; the
 * existing gear flow collects those later, which is why those columns are
 * nullable. What it does know is written, and `confirmation_source` marks the
 * row so a partially-filled placement confirmation is never mistaken for an
 * incomplete form submission.
 *
 * If she already has a confirmation row, it is LINKED, not duplicated.
 */
async function upsertRosterConfirmation(
  db: SupabaseClient,
  row: TokenRow,
): Promise<string | null> {
  const gradYear = row.class_year;
  if (gradYear == null || gradYear < GRAD_YEAR_MIN || gradYear > GRAD_YEAR_MAX) {
    console.error(
      `[placement/confirm] ${row.athlete_name}: class year ${gradYear} is outside ${GRAD_YEAR_MIN}–${GRAD_YEAR_MAX}; confirmation recorded on the token only.`,
    );
    return null;
  }

  const { first, last } = splitName(row.athlete_name);

  try {
    // Already linked to this athlete?
    const { data: linked } = await db
      .from("roster_confirmations")
      .select("id")
      .eq("source_table", row.athlete_table)
      .eq("source_id", row.athlete_id)
      .limit(1)
      .maybeSingle();
    if (linked) return linked.id as string;

    // Confirmed through the older /roster form? Adopt that row.
    const { data: existing } = await db
      .from("roster_confirmations")
      .select("id")
      .eq("player_first_name", first)
      .eq("player_last_name", last)
      .eq("player_grad_year", gradYear)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await db
        .from("roster_confirmations")
        .update({
          source_table: row.athlete_table,
          source_id: row.athlete_id,
          placement_token_id: row.id,
          team: row.placement_tier,
        })
        .eq("id", existing.id);
      return existing.id as string;
    }

    const { data: inserted, error } = await db
      .from("roster_confirmations")
      .insert({
        player_first_name: first,
        player_last_name: last,
        player_grad_year: gradYear,
        team: row.placement_tier,
        parent1_name: row.parent_name,
        parent1_email: row.recipient_email,
        confirmation_source: "placement_link",
        placement_token_id: row.id,
        source_table: row.athlete_table,
        source_id: row.athlete_id,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[placement/confirm] roster_confirmations insert failed:", error);
      return null;
    }
    return inserted.id as string;
  } catch (err) {
    console.error("[placement/confirm] roster_confirmations threw:", err);
    return null;
  }
}
