import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// I5 fix: lazy init so missing env on a preview deploy surfaces a
// 503 instead of crashing at module import.
let _stripe: Stripe | null = null;
function getStripeClient(): Stripe | null {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !key.startsWith("sk_")) return null;
  _stripe = new Stripe(key);
  return _stripe;
}

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key);
  return _supabase;
}

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  const supabase = getSupabase();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !supabase || !webhookSecret) {
    // Return 503 so Stripe retries later instead of marking the webhook dead.
    return NextResponse.json(
      { error: "Webhook handler not configured." },
      { status: 503 },
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  // ── Verify signature ──────────────────────────────────────────────
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Ack non-completion events so Stripe doesn't retry.
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const meta = session.metadata ?? {};

  const playerId = meta.player_id;
  const ticketId = meta.ticket_id;
  const category = meta.category;

  // I3 fix: return 200 on malformed metadata so Stripe stops retrying.
  // Something is already wrong — retries won't fix it.
  //
  // Sprint 5: category whitelist relaxed from ["roster","summer"] to the
  // full admin enum. Custom and fall payments created via /api/admin/
  // .../payment-link now record with their original category instead of
  // being silently coerced to "summer".
  const ALLOWED_CATEGORIES = ["roster", "summer", "fall", "custom"] as const;
  if (
    !playerId ||
    !ticketId ||
    typeof category !== "string" ||
    !(ALLOWED_CATEGORIES as readonly string[]).includes(category)
  ) {
    console.error("Webhook missing/invalid metadata:", meta);
    return NextResponse.json({ received: true, skipped: "bad_metadata" });
  }

  // Only accept sessions that actually completed payment.
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true, skipped: "unpaid_session" });
  }

  const stripeSessionId = session.id;
  const amountCents = session.amount_total ?? 0;

  // ── C2 fix: pre-insert dedup + unique-conflict guard.
  // Primary defense is the UNIQUE index on payments.stripe_session_id
  // (see scripts/payment-constraints.sql). The pre-check here handles the
  // common retry case (one function instance retrying after a prior plan
  // update failure) even if the index hasn't been applied yet.
  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_session_id", stripeSessionId)
    .maybeSingle();

  let duplicate = !!existing;

  const { error: insertError } = existing
    ? { error: null }
    : await supabase.from("payments").insert({
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
      typeof session.payment_intent === "string" ? session.payment_intent : null,
  });

  if (insertError) {
    const code = (insertError as { code?: string }).code;
    if (code === "23505") {
      duplicate = true;
    } else {
      console.error("Failed to insert payment:", insertError);
      return NextResponse.json(
        { error: "Database insert failed." },
        { status: 500 },
      );
    }
  }

  // ── Plan reconcile — derive from payments, never accumulate ─────
  // I1 + I2 fix: reconciling from the payments table (SUM over completed
  // rows) is naturally idempotent and clamped. A retry after a prior
  // plan-update failure will now converge even though the payment insert
  // is skipped as a duplicate.
  const { data: plan } = await supabase
    .from("payment_plans")
    .select("id, installments_total, total_amount_cents")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (plan) {
    const { data: summerPayments } = await supabase
      .from("payments")
      .select("amount_cents")
      .eq("player_id", playerId)
      .eq("payment_category", "summer")
      .eq("status", "completed");

    const summerPaidCents = (summerPayments ?? []).reduce(
      (sum, p) => sum + (p.amount_cents ?? 0),
      0,
    );

    const installmentsTotal = plan.installments_total ?? 0;
    const totalAmountCents = plan.total_amount_cents ?? 0;

    // Clamp so we never exceed planned totals even if manual entries drift.
    const clampedPaidCents = Math.min(summerPaidCents, totalAmountCents || summerPaidCents);

    // If fully paid in dollars, mark all installments complete regardless
    // of row count (covers the case where someone upgrades to a full-pay).
    const installmentsPaid =
      installmentsTotal > 0 && totalAmountCents > 0
        ? clampedPaidCents >= totalAmountCents
          ? installmentsTotal
          : Math.min(
              (summerPayments ?? []).filter((p) => (p.amount_cents ?? 0) > 0)
                .length,
              installmentsTotal,
            )
        : 0;

    const { error: updateError } = await supabase
      .from("payment_plans")
      .update({
        amount_paid_cents: clampedPaidCents,
        installments_paid: installmentsPaid,
      })
      .eq("id", plan.id);

    if (updateError) {
      // I1 fix: return 500 so Stripe retries. Insert is already idempotent
      // via the unique constraint, and plan reconcile is recompute-from-truth,
      // so the retry converges safely.
      console.error("Failed to update payment plan; will retry:", updateError);
      return NextResponse.json(
        { error: "Plan update failed." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ received: true, duplicate });
}
