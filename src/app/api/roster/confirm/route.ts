import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { pingCommandSheet } from "@/lib/command-sheet/engine";
import {
  isRosterGradYear,
  isRosterTeam,
  isUniformSize,
  normalizeUsPhone,
  ROSTER_GRAD_YEAR_MAX,
  ROSTER_GRAD_YEAR_MIN,
} from "@/lib/roster";

/**
 * POST /api/roster/confirm
 * Public — no auth, NO PAYMENT (2026-07-13). A family lands on /roster from
 * the "she's in" text/email, fills in player + parent + uniform details, and
 * this route validates + normalizes everything server-side and writes the
 * roster_confirmations row with the SERVICE ROLE (the table has RLS on and
 * zero policies — the anon client can't touch it). The payment columns stay
 * untouched here; the separate gear-charge flow populates them later.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same shared limiter pattern as /api/tryouts/register and /api/ask.
const isRateLimited = createRateLimiter(6);

const MAX_NAME = 120;
const MAX_EMAIL = 254;
const MAX_PHONE = 40;
const MAX_NOTES = 2000;

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function POST(request: NextRequest) {
  if (isRateLimited(clientIp(request))) {
    return NextResponse.json(
      { error: "Too many attempts — please wait a minute and try again." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return bad("Invalid request.");
  }

  const {
    playerFirstName,
    playerLastName,
    playerGradYear,
    team,
    playerPhone,
    parent1Name,
    parent1Email,
    parent1Phone,
    parent2Name,
    parent2Email,
    parent2Phone,
    jerseySize,
    shortsSize,
    sweatshirtSize,
    shootingShirtSize,
    emergencyContactName,
    emergencyContactPhone,
    notes,
  } = (body ?? {}) as Record<string, unknown>;

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  // ── Player ──────────────────────────────────────────────────────────
  const firstName = str(playerFirstName);
  const lastName = str(playerLastName);
  if (!firstName || firstName.length > MAX_NAME) {
    return bad("Player first name is required.");
  }
  if (!lastName || lastName.length > MAX_NAME) {
    return bad("Player last name is required.");
  }

  const gradYear =
    typeof playerGradYear === "string" || typeof playerGradYear === "number"
      ? parseInt(String(playerGradYear), 10)
      : NaN;
  if (!isRosterGradYear(gradYear)) {
    return bad(
      `Please choose a graduation year between ${ROSTER_GRAD_YEAR_MIN} and ${ROSTER_GRAD_YEAR_MAX}.`,
    );
  }

  if (!isRosterTeam(team)) {
    return bad("Please confirm her team.");
  }

  // Player phone is optional (plenty of 2034s don't have one yet).
  const rawPlayerPhone = str(playerPhone);
  let playerPhoneNorm: string | null = null;
  if (rawPlayerPhone) {
    if (rawPlayerPhone.length > MAX_PHONE) return bad("Player phone is too long.");
    playerPhoneNorm = normalizeUsPhone(rawPlayerPhone);
    if (!playerPhoneNorm) {
      return bad("Player phone doesn't look like a valid US number.");
    }
  }

  // ── Parent / guardian 1 (required) ──────────────────────────────────
  const p1Name = str(parent1Name);
  const p1Email = str(parent1Email).toLowerCase();
  const p1PhoneRaw = str(parent1Phone);
  if (!p1Name || p1Name.length > MAX_NAME) {
    return bad("Parent / guardian name is required.");
  }
  if (!p1Email || p1Email.length > MAX_EMAIL || !EMAIL_RE.test(p1Email)) {
    return bad("A valid parent email is required.");
  }
  if (!p1PhoneRaw || p1PhoneRaw.length > MAX_PHONE) {
    return bad("Parent phone number is required.");
  }
  const p1Phone = normalizeUsPhone(p1PhoneRaw);
  if (!p1Phone) {
    return bad("Parent phone doesn't look like a valid US number.");
  }

  // ── Parent / guardian 2 (optional — but valid if provided) ──────────
  const p2Name = str(parent2Name);
  const p2EmailRaw = str(parent2Email).toLowerCase();
  const p2PhoneRaw = str(parent2Phone);
  const hasParent2 = !!(p2Name || p2EmailRaw || p2PhoneRaw);

  let p2Email: string | null = null;
  let p2Phone: string | null = null;
  if (hasParent2) {
    if (!p2Name || p2Name.length > MAX_NAME) {
      return bad("Second parent's name is required if you're adding them.");
    }
    if (p2EmailRaw) {
      if (p2EmailRaw.length > MAX_EMAIL || !EMAIL_RE.test(p2EmailRaw)) {
        return bad("Second parent's email doesn't look valid.");
      }
      p2Email = p2EmailRaw;
    }
    if (p2PhoneRaw) {
      if (p2PhoneRaw.length > MAX_PHONE) return bad("Second parent's phone is too long.");
      p2Phone = normalizeUsPhone(p2PhoneRaw);
      if (!p2Phone) {
        return bad("Second parent's phone doesn't look like a valid US number.");
      }
    }
  }

  // ── Uniform — all four pieces; the $200 confirmation IS jerseys ─────
  if (!isUniformSize(jerseySize)) return bad("Please choose a jersey size.");
  if (!isUniformSize(shortsSize)) return bad("Please choose a shorts size.");
  if (!isUniformSize(sweatshirtSize)) return bad("Please choose a sweatshirt size.");
  if (!isUniformSize(shootingShirtSize)) return bad("Please choose a shooting shirt size.");

  // ── Emergency contact (required) ────────────────────────────────────
  const emergencyName = str(emergencyContactName);
  if (!emergencyName || emergencyName.length > MAX_NAME) {
    return bad("An emergency contact name is required.");
  }
  const emergencyPhoneRaw = str(emergencyContactPhone);
  if (!emergencyPhoneRaw || emergencyPhoneRaw.length > MAX_PHONE) {
    return bad("An emergency contact phone is required.");
  }
  const emergencyPhone = normalizeUsPhone(emergencyPhoneRaw);
  if (!emergencyPhone) {
    return bad("Emergency contact phone doesn't look like a valid US number.");
  }

  const notesText = str(notes);
  if (notesText.length > MAX_NOTES) return bad("Notes are too long.");

  const supabase = admin();

  // Payment columns (reserve_paid, stripe_*, amount_cents) are deliberately
  // absent — they sit dormant until the separate gear-charge flow.
  const row = {
    player_first_name: firstName,
    player_last_name: lastName,
    player_grad_year: gradYear,
    team,
    player_phone: playerPhoneNorm,
    parent1_name: p1Name,
    parent1_email: p1Email,
    parent1_phone: p1Phone,
    parent2_name: hasParent2 ? p2Name : null,
    parent2_email: p2Email,
    parent2_phone: p2Phone,
    jersey_size: jerseySize,
    shorts_size: shortsSize,
    sweatshirt_size: sweatshirtSize,
    shooting_shirt_size: shootingShirtSize,
    emergency_contact_name: emergencyName,
    emergency_contact_phone: emergencyPhone,
    notes: notesText || null,
  };

  // ── Dedup: same player + parent email already confirmed? ────────────
  // A double-submit or a family correcting a size refreshes the existing row
  // in place instead of writing a duplicate.
  const { data: existing } = await supabase
    .from("roster_confirmations")
    .select("id")
    .eq("parent1_email", p1Email)
    .eq("player_first_name", firstName)
    .eq("player_last_name", lastName)
    .eq("player_grad_year", gradYear)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error: updateError } = await supabase
      .from("roster_confirmations")
      .update(row)
      .eq("id", existing.id);
    if (updateError) {
      console.error("Roster confirmation update failed:", updateError);
      return NextResponse.json(
        { error: "We couldn't save her details. Please try again." },
        { status: 500 },
      );
    }
    await pingCommandSheet("confirmation");
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const { error: insertError } = await supabase
    .from("roster_confirmations")
    .insert(row);
  if (insertError) {
    console.error("Roster confirmation insert failed:", insertError);
    return NextResponse.json(
      { error: "We couldn't save her details. Please try again." },
      { status: 500 },
    );
  }

  // Mirror the confirmation onto the Roster Command Sheet (fail-soft).
  await pingCommandSheet("confirmation");

  return NextResponse.json({ ok: true });
}
