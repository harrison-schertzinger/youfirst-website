import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import {
  TRYOUT_FEE_CENTS,
  MAKEUP_TRYOUT,
  describeTryout,
  isTryoutPosition,
  isValidMakeupDate,
  tryoutForGradYear,
} from "@/lib/tryouts";

/**
 * POST /api/tryouts/checkout
 * Public — no auth. Validates the registration, writes a `pending` row, then
 * hands the parent to Stripe Checkout for the $50 fee. The webhook flips the
 * row to `paid`. Everything that decides the charge (fee, tryout date) is
 * re-derived server-side; the client is never trusted for it.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      {
        error:
          "Payment system is being configured. Please email kathleen@youfirstlacrosse.com.",
      },
      { status: 503 },
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
    makeupDate,
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
  // columns (or Stripe). Names ≤120, email ≤254 (RFC 5321 max), phone ≤40. The
  // email cap is checked before the regex so we never run it on a huge string.
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

  // Server-authoritative: derive the cohort from grad year. Rejects any year
  // outside the offered window even if the client sent something else. The
  // cohort is stored for BOTH scheduled and make-up rows (informational).
  const cohort = tryoutForGradYear(gradYear);
  if (!cohort) {
    return NextResponse.json(
      { error: "Please choose a graduation year between 2029 and 2038." },
      { status: 400 },
    );
  }

  // Tryout type — defaults to scheduled. Make-up requires one of the five
  // fixed make-up days (re-validated server-side).
  const tType = tryoutType === "makeup" ? "makeup" : "scheduled";
  let tryoutDateIso: string;
  if (tType === "makeup") {
    const picked = typeof makeupDate === "string" ? makeupDate.trim() : "";
    if (!isValidMakeupDate(picked)) {
      return NextResponse.json(
        {
          error: `Please choose a make-up day (${MAKEUP_TRYOUT.rangeLabel}).`,
        },
        { status: 400 },
      );
    }
    tryoutDateIso = picked;
  } else {
    tryoutDateIso = cohort.isoDate;
  }

  const display = describeTryout({
    type: tType,
    isoDate: tryoutDateIso,
    group: cohort.id,
  });

  const supabase = admin();

  // ── Insert the pending registration ───────────────────────────────
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
      tryout_group: cohort.id,
      tryout_date: tryoutDateIso,
      amount_cents: TRYOUT_FEE_CENTS,
      currency: "usd",
      payment_status: "pending",
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

  // ── Create the Stripe Checkout session ($50, inline price) ─────────
  const origin = request.nextUrl.origin;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: mail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: TRYOUT_FEE_CENTS,
            product_data: {
              name: `2026 YOU. FIRST ${display.typeLabel} Tryout`,
              description: `${player} — ${display.dateLine}`,
            },
          },
        },
      ],
      metadata: {
        kind: "tryout",
        registration_id: reg.id,
        player_full_name: player,
        tryout_type: tType,
        tryout_group: cohort.id,
        tryout_date: tryoutDateIso,
        graduation_year: String(gradYear),
        position: pos,
      },
      success_url: `${origin}/tryouts/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/tryouts?canceled=1`,
    });

    // Stamp the session id so the webhook can reconcile idempotently.
    await supabase
      .from("tryout_registrations")
      .update({ stripe_session_id: session.id })
      .eq("id", reg.id);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe tryout checkout create failed:", err);
    // Mark the orphaned pending row so it doesn't masquerade as a live lead.
    await supabase
      .from("tryout_registrations")
      .update({ payment_status: "failed" })
      .eq("id", reg.id);
    return NextResponse.json(
      { error: "We couldn't reach the payment system. Please try again." },
      { status: 502 },
    );
  }
}
