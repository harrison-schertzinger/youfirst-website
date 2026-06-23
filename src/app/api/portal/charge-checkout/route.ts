import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import { readPortalSession } from "@/lib/portal-session";

export const dynamic = "force-dynamic";

/**
 * Start Stripe checkout for a one-off player charge.
 *
 * SECURITY: the client sends ONLY `charge_id`. The amount is looked up from
 * player_charges (status='open') and the Stripe price is derived from THAT
 * row — the request body can never influence what is charged. Paying $0.01
 * against a $400 charge is structurally impossible. A checkout is only created
 * while the charge is still 'open'.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      {
        error:
          "Payment system is being configured. Please contact kathleen@youfirstlacrosse.com.",
      },
      { status: 503 },
    );
  }

  const session = readPortalSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { charge_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const chargeId = typeof body.charge_id === "string" ? body.charge_id : "";
  if (!chargeId) {
    return NextResponse.json({ error: "Missing charge_id." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Re-derive EVERYTHING from the database row keyed by charge_id.
  const { data: charge, error: chargeErr } = await admin
    .from("player_charges")
    .select("id, player_id, label, amount_cents, season, status")
    .eq("id", chargeId)
    .maybeSingle();

  if (chargeErr) {
    console.error("[portal/charge-checkout] charge lookup failed:", chargeErr);
    return NextResponse.json({ error: "Couldn’t start checkout." }, { status: 500 });
  }
  if (!charge) {
    return NextResponse.json({ error: "Charge not found." }, { status: 404 });
  }
  if (charge.status !== "open") {
    return NextResponse.json(
      { error: "This charge is no longer open." },
      { status: 409 },
    );
  }

  const { data: player } = await admin
    .from("players")
    .select("first_name, last_name")
    .eq("id", charge.player_id)
    .maybeSingle();
  const playerName = player
    ? `${player.first_name} ${player.last_name}`
    : "Player";

  const ticketId = `charge_${charge.id}`;
  const origin = request.nextUrl.origin;

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          // Amount comes straight from the DB row — never the request body.
          price_data: {
            currency: "usd",
            unit_amount: charge.amount_cents,
            product_data: { name: `You. First — ${charge.label}` },
          },
          quantity: 1,
        },
      ],
      customer_email: session.email,
      metadata: {
        kind: "charge",
        charge_id: charge.id,
        player_id: charge.player_id,
        ticket_id: ticketId,
        category: "custom",
        player_name: playerName,
        label: charge.label,
        ...(charge.season ? { season: charge.season } : {}),
      },
      success_url: `${origin}/portal?paid=${encodeURIComponent(ticketId)}`,
      cancel_url: `${origin}/portal?canceled=${encodeURIComponent(ticketId)}`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("[portal/charge-checkout] Stripe session create failed:", err);
    return NextResponse.json(
      {
        error:
          "We couldn’t reach the payment system. Please try again in a moment.",
      },
      { status: 502 },
    );
  }
}
