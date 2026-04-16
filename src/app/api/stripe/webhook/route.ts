import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret." },
      { status: 400 },
    );
  }

  // ── Verify signature ──────────────────────────────────────────────
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // ── Handle checkout.session.completed ─────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata ?? {};

    const playerId = meta.player_id;
    const ticketId = meta.ticket_id;
    const category = meta.category;
    const installmentIndex = meta.installment_index;

    if (!playerId || !ticketId || !category) {
      console.error("Webhook missing metadata:", meta);
      return NextResponse.json({ error: "Missing metadata." }, { status: 400 });
    }

    // ── Idempotency: check if we already processed this session ─────
    const stripeSessionId = session.id;
    const { data: existing } = await supabase
      .from("payments")
      .select("id")
      .eq("stripe_session_id", stripeSessionId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const amountCents = session.amount_total ?? 0;

    try {
      // ── Insert payment row ──────────────────────────────────────────
      const { error: insertError } = await supabase.from("payments").insert({
        player_id: playerId,
        amount_cents: amountCents,
        payment_category: category,
        payment_method: "stripe",
        description: ticketId,
        season: "2025-26",
        status: "completed",
        payment_date: new Date().toISOString(),
        stripe_session_id: stripeSessionId,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
      });

      if (insertError) {
        console.error("Failed to insert payment:", insertError);
        return NextResponse.json(
          { error: "Database insert failed." },
          { status: 500 },
        );
      }

      // ── Update payment_plans row ────────────────────────────────────
      const { data: plan } = await supabase
        .from("payment_plans")
        .select("id, amount_paid_cents, installments_paid")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (plan) {
        const updates: Record<string, number> = {
          amount_paid_cents: (plan.amount_paid_cents ?? 0) + amountCents,
        };

        if (category === "summer" && installmentIndex != null) {
          updates.installments_paid = (plan.installments_paid ?? 0) + 1;
        }

        const { error: updateError } = await supabase
          .from("payment_plans")
          .update(updates)
          .eq("id", plan.id);

        if (updateError) {
          console.error("Failed to update payment plan:", updateError);
          // Don't return 500 — the payment was recorded; plan sync can be fixed manually.
        }
      }

      return NextResponse.json({ received: true });
    } catch (err) {
      console.error("Webhook processing error:", err);
      return NextResponse.json(
        { error: "Processing failed." },
        { status: 500 },
      );
    }
  }

  // All other event types: acknowledge receipt
  return NextResponse.json({ received: true });
}
