import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import { STRIPE_PRICE_IDS, TICKET_AMOUNTS_CENTS } from "@/lib/feesData";
import { readPortalSession } from "@/lib/portal-session";
import type { PlayerBalanceRow } from "@/lib/portal-balance";

export const dynamic = "force-dynamic";

// The client supplies only WHICH thing it wants to pay — (playerId, category,
// intent). Every cent is re-derived here, server-side.
//
// Summer is charged as a dynamic amount taken from `player_balances()`: the
// same function the portal renders and the collections email quotes. It is NOT
// a fixed Stripe Price any more. The old code resolved one of three preset
// prices from `installments_total`, which for every live plan meant $1,850 —
// so a family who had already paid part of the season would have been billed
// the whole thing again.

type Category = "roster" | "summer";
type Intent = "full" | "quarter";

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { playerId, category, intent } = (body ?? {}) as {
    playerId?: string;
    category?: string;
    intent?: string;
  };

  if (typeof playerId !== "string" || !playerId) {
    return NextResponse.json({ error: "Missing playerId." }, { status: 400 });
  }
  if (category !== "roster" && category !== "summer") {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  const safeCategory: Category = category;

  // A stale page (or an older client) may not send an intent. Defaulting to
  // the full remaining balance is always the safe read — it can never charge
  // more than what is actually owed.
  const safeIntent: Intent = intent === "quarter" ? "quarter" : "full";

  // ── Authenticate: portal token (parents are NOT on Supabase Auth) ──
  const portalSession = readPortalSession(request);
  if (!portalSession) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Any signed-in parent may pay for any player — intentionally not gated
  // (divorced/step-parent families etc.). The amount is still re-derived
  // server-side below, so the payer can never influence what is charged.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Derive the amount server-side ──────────────────────────────────
  let lineItem: {
    price?: string;
    price_data?: {
      currency: string;
      unit_amount: number;
      product_data: { name: string };
    };
    quantity: number;
  };
  let ticketId: string;
  let amountCents: number;

  if (safeCategory === "roster") {
    // Fixed $200, settled by money received. Unchanged.
    const { data: rosterPayments, error: rosterErr } = await admin
      .from("payments")
      .select("amount_cents")
      .eq("player_id", playerId)
      .eq("payment_category", "roster")
      .eq("status", "completed");

    if (rosterErr) {
      console.error("[checkout] roster payments lookup failed:", rosterErr);
      return NextResponse.json(
        { error: "Couldn’t start checkout." },
        { status: 500 },
      );
    }

    const paidCents = (rosterPayments ?? []).reduce(
      (sum, p) => sum + (p.amount_cents ?? 0),
      0,
    );
    if (paidCents >= TICKET_AMOUNTS_CENTS.roster) {
      return NextResponse.json(
        { error: "Roster fee already paid." },
        { status: 409 },
      );
    }

    amountCents = TICKET_AMOUNTS_CENTS.roster;
    lineItem = { price: STRIPE_PRICE_IDS.roster, quantity: 1 };
    ticketId = `${playerId}-roster-1`;
  } else {
    // ── Summer: the amount IS the balance. One source of truth. ──────
    const { data: balances, error: balanceErr } = await admin.rpc(
      "player_balances",
      { p_player_id: playerId },
    );

    if (balanceErr) {
      console.error("[checkout] player_balances failed:", balanceErr);
      return NextResponse.json(
        { error: "Couldn’t start checkout." },
        { status: 500 },
      );
    }

    const balance = (balances as PlayerBalanceRow[] | null)?.[0];
    if (!balance) {
      return NextResponse.json(
        { error: "No summer payment plan for this player." },
        { status: 404 },
      );
    }

    if (balance.remaining_cents <= 0) {
      return NextResponse.json(
        { error: "Summer tuition is already settled." },
        { status: 409 },
      );
    }

    if (safeIntent === "quarter") {
      // Only offer a quarter when it is a true fraction of what she owes.
      // The function decides this — the browser cannot talk us into it.
      if (!balance.quarter_eligible || balance.quarter_cents <= 0) {
        return NextResponse.json(
          { error: "The quarter option isn’t available on this balance." },
          { status: 409 },
        );
      }
      amountCents = balance.quarter_cents;
      ticketId = `${playerId}-summer-quarter`;
    } else {
      amountCents = balance.remaining_cents;
      ticketId = `${playerId}-summer-balance`;
    }

    // Belt and braces: never let a computed amount exceed what is owed, and
    // never hand Stripe a non-positive amount.
    if (amountCents <= 0 || amountCents > balance.remaining_cents) {
      console.error("[checkout] refusing implausible summer amount", {
        playerId,
        amountCents,
        remaining: balance.remaining_cents,
      });
      return NextResponse.json(
        { error: "Couldn’t start checkout." },
        { status: 500 },
      );
    }

    lineItem = {
      price_data: {
        currency: "usd",
        unit_amount: amountCents,
        product_data: {
          name:
            safeIntent === "quarter"
              ? "You. First — Summer Tuition (partial payment)"
              : "You. First — Summer Tuition (remaining balance)",
        },
      },
      quantity: 1,
    };
  }

  // ── Look up player name for the receipt ────────────────────────────
  const { data: player } = await admin
    .from("players")
    .select("first_name, last_name")
    .eq("id", playerId)
    .single();

  const playerName = player
    ? `${player.first_name} ${player.last_name}`
    : "Player";

  // ── Create Stripe Checkout Session ─────────────────────────────────
  const origin = request.nextUrl.origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [lineItem],
      customer_email: portalSession.email || undefined,
      metadata: {
        player_id: playerId,
        guardian_id: portalSession.guardianId,
        ticket_id: ticketId,
        category: safeCategory,
        player_name: playerName,
        // Recorded for reconciliation: what we believed was owed at the
        // moment this session was created.
        amount_cents: String(amountCents),
        intent: safeCategory === "summer" ? safeIntent : "full",
      },
      success_url: `${origin}/portal?paid=${encodeURIComponent(ticketId)}`,
      cancel_url: `${origin}/portal?canceled=${encodeURIComponent(ticketId)}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout session create failed:", err);
    return NextResponse.json(
      {
        error:
          "We couldn't reach the payment system. Please try again in a moment.",
      },
      { status: 502 },
    );
  }
}
