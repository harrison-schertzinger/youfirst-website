import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTryoutConfirmationEmail } from "@/lib/tryout-email";
import { sendTryoutAdminNotification } from "@/lib/tryout-admin-notify";
import { syncTryoutToSheet } from "@/lib/google-sheets";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import {
  ELITE_TRYOUT,
  GRAD_YEAR_MAX,
  GRAD_YEAR_MIN,
  describeTryout,
  groupForGradYear,
  isOfferedGradYear,
  isTryoutPosition,
  type TryoutType,
} from "@/lib/tryouts";

/**
 * POST /api/tryouts/register
 * Public — no auth, NO CHARGE. Tryouts and evaluations are completely free
 * (2026-07-13); this replaces the old $50 Stripe checkout route. Two options,
 * both open to every age: the July 25 set-date tryout, or a free morning
 * evaluation (any morning through Aug 7, no fixed date). Validates the
 * registration, writes the row with payment_status 'free', then fires the
 * confirmation email, the admin ping, and the Sheet append directly — all
 * fail-soft, so the family is never blocked on email/Sheet infrastructure.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Free registrations have no Stripe friction, so keep a light per-IP limiter
// (same shared pattern as /api/ask).
const isRateLimited = createRateLimiter(6);

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
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
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const {
    playerFullName,
    parentName,
    email,
    phone,
    graduationYear,
    position,
    tryoutType,
  } = (body ?? {}) as Record<string, unknown>;

  // ── Validate ──────────────────────────────────────────────────────
  const player = typeof playerFullName === "string" ? playerFullName.trim() : "";
  const parent = typeof parentName === "string" ? parentName.trim() : "";
  const mail = typeof email === "string" ? email.trim() : "";
  const tel = typeof phone === "string" ? phone.trim() : "";
  const gradYear =
    typeof graduationYear === "string" || typeof graduationYear === "number"
      ? parseInt(String(graduationYear), 10)
      : NaN;
  const pos = typeof position === "string" ? position.trim() : "";

  // Length caps — reject oversized payloads before they hit the unbounded text
  // columns. Names ≤120, email ≤254 (RFC 5321 max), phone ≤40. The email cap
  // is checked before the regex so we never run it on a huge string.
  const MAX_NAME = 120;
  const MAX_EMAIL = 254;
  const MAX_PHONE = 40;

  if (!player) {
    return NextResponse.json({ error: "Player full name is required." }, { status: 400 });
  }
  if (player.length > MAX_NAME) {
    return NextResponse.json({ error: "Player full name is too long." }, { status: 400 });
  }
  if (!parent) {
    return NextResponse.json({ error: "Parent name is required." }, { status: 400 });
  }
  if (parent.length > MAX_NAME) {
    return NextResponse.json({ error: "Parent name is too long." }, { status: 400 });
  }
  if (!mail) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (mail.length > MAX_EMAIL || !EMAIL_RE.test(mail)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (!tel) {
    return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
  }
  if (tel.length > MAX_PHONE) {
    return NextResponse.json({ error: "Phone number is too long." }, { status: 400 });
  }
  if (!isTryoutPosition(pos)) {
    return NextResponse.json({ error: "Please choose a valid position." }, { status: 400 });
  }
  if (!isOfferedGradYear(gradYear)) {
    return NextResponse.json(
      { error: `Please choose a graduation year between ${GRAD_YEAR_MIN} and ${GRAD_YEAR_MAX}.` },
      { status: 400 },
    );
  }

  // Two options for every grad year: a free morning evaluation (the primary
  // path) or the July 25 set date. Evaluations have no fixed date.
  const tType: TryoutType = tryoutType === "evaluation" ? "evaluation" : "scheduled";
  const tryoutDateIso = tType === "evaluation" ? null : ELITE_TRYOUT.isoDate;
  const group = groupForGradYear(gradYear);

  const display = describeTryout({ type: tType, isoDate: tryoutDateIso, group });

  const supabase = admin();

  // ── Duplicate guard — free registrations have no checkout friction, so a
  // double-submit would otherwise write two rows and email twice. Same player
  // + email + grad year already registered free → idempotent success.
  const { data: dupe } = await supabase
    .from("tryout_registrations")
    .select("id")
    .eq("email", mail)
    .eq("player_full_name", player)
    .eq("graduation_year", gradYear)
    .eq("payment_status", "free")
    .limit(1)
    .maybeSingle();

  if (dupe) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // ── Insert the registration — free, confirmed immediately ─────────
  const { data: reg, error: insertError } = await supabase
    .from("tryout_registrations")
    .insert({
      player_full_name: player,
      parent_name: parent,
      email: mail,
      phone: tel,
      graduation_year: gradYear,
      position: pos,
      tryout_type: tType,
      tryout_group: group,
      tryout_date: tryoutDateIso,
      amount_cents: 0,
      currency: "usd",
      payment_status: "free",
    })
    .select("id")
    .single();

  if (insertError || !reg) {
    console.error("Tryout registration insert failed:", insertError);
    return NextResponse.json(
      { error: "We couldn't save your registration. Please try again." },
      { status: 500 },
    );
  }

  // ── Confirmation email (fail-soft) ─────────────────────────────────
  const { sent } = await sendTryoutConfirmationEmail({
    to: mail,
    parentName: parent,
    playerFullName: player,
    display,
  });
  if (sent) {
    await supabase
      .from("tryout_registrations")
      .update({ confirmation_email_sent: true })
      .eq("id", reg.id);
  }

  // ── Admin notification (fail-soft) ─────────────────────────────────
  try {
    const { count: regCount } = await supabase
      .from("tryout_registrations")
      .select("id", { count: "exact", head: true });
    await sendTryoutAdminNotification(
      {
        player_full_name: player,
        parent_name: parent,
        email: mail,
        phone: tel,
        graduation_year: gradYear,
        position: pos,
        tryout_group: group,
        tryout_type: tType,
        tryout_date: tryoutDateIso,
        payment_status: "free",
        amount_cents: 0,
      },
      regCount ?? 0,
    );
  } catch (notifyErr) {
    console.error("Tryout admin notification failed (non-fatal):", notifyErr);
  }

  // ── Google Sheet sync (fail-soft) ──────────────────────────────────
  await syncTryoutToSheet({
    timestampIso: new Date().toISOString(),
    tryoutTypeLabel: display.typeLabel,
    tryoutDateIso: tryoutDateIso ?? "",
    playerFullName: player,
    parentName: parent,
    email: mail,
    phone: tel,
    graduationYear: gradYear,
    position: pos,
    paymentStatus: "free",
  });

  return NextResponse.json({ ok: true });
}
