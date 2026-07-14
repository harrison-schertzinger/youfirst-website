import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { sendTryoutConfirmationEmail } from "@/lib/tryout-email";
import { sendTryoutAdminNotification } from "@/lib/tryout-admin-notify";
import { pingCommandSheet } from "@/lib/command-sheet/engine";
import { describeTryout, type TryoutType } from "@/lib/tryouts";

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

  // ── Tryout: abandoned checkout expired ─────────────────────────────
  // Stripe fires this ~24h after an uncompleted session. Flip the still-pending
  // tryout row to 'expired' so abandoned leads don't masquerade as live ones.
  if (event.type === "checkout.session.expired") {
    const expiredSession = event.data.object as Stripe.Checkout.Session;
    const expiredMeta = expiredSession.metadata ?? {};
    if (expiredMeta.kind === "tryout") {
      return handleTryoutExpired(supabase, expiredSession, expiredMeta);
    }
    return NextResponse.json({ received: true });
  }

  // Ack non-completion events so Stripe doesn't retry.
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const meta = session.metadata ?? {};

  // ── 2026 Tryouts branch ────────────────────────────────────────────
  // Tryout sessions carry kind:"tryout" and write to tryout_registrations,
  // not payments. Handle and return before the player/ticket logic below
  // (which would otherwise reject this metadata shape).
  if (meta.kind === "tryout") {
    return handleTryoutPaid(supabase, session, meta);
  }

  // ── One-off charge branch ───────────────────────────────────────────
  // Charge sessions carry kind:"charge" + charge_id. They record into
  // payments (reusing the ledger) and flip THAT charge to 'paid' — and
  // reconcile nothing else (the season payment_plans logic below never
  // runs for a charge). Handled before the generic logic so a charge can
  // never be mistaken for a plan payment.
  if (meta.kind === "charge") {
    return handleChargePaid(stripe, supabase, session, meta);
  }

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

// ──────────────────────────────────────────────────────────────────────
// 2026 Tryouts: flip the pending registration to `paid` and email the parent.
// Idempotent — a Stripe retry on an already-paid row is a no-op (no double
// email). Returns 200 on terminal/malformed states so Stripe stops retrying;
// returns 500 only on a transient DB failure so Stripe retries.
// ──────────────────────────────────────────────────────────────────────
async function handleTryoutPaid(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  meta: Record<string, string>,
): Promise<NextResponse> {
  // Only act on truly-paid sessions.
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true, skipped: "unpaid_session" });
  }

  const registrationId = meta.registration_id;
  const stripeSessionId = session.id;

  // Locate the row — prefer the registration_id from metadata, fall back to
  // the session id (covers a metadata hiccup).
  const baseSelect =
    "id, email, parent_name, player_full_name, phone, graduation_year, position, tryout_type, tryout_date, tryout_group, payment_status, confirmation_email_sent";

  let { data: reg } = registrationId
    ? await supabase
        .from("tryout_registrations")
        .select(baseSelect)
        .eq("id", registrationId)
        .maybeSingle()
    : { data: null };

  if (!reg) {
    const fallback = await supabase
      .from("tryout_registrations")
      .select(baseSelect)
      .eq("stripe_session_id", stripeSessionId)
      .maybeSingle();
    reg = fallback.data;
  }

  if (!reg) {
    console.error("Tryout webhook: no registration row for", {
      registrationId,
      stripeSessionId,
    });
    return NextResponse.json({ received: true, skipped: "no_registration" });
  }

  // Already paid → idempotent no-op (fast path; don't resend the email).
  if (reg.payment_status === "paid") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const amountCents = session.amount_total ?? undefined;
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  // Atomic compare-and-swap: flip pending→paid ONLY if it isn't already paid,
  // and learn whether THIS delivery is the one that flipped it (rows returned).
  // Two concurrent Stripe deliveries both pass the read above as 'pending'; the
  // `.neq` makes the second UPDATE match 0 rows once the first commits, so only
  // the winner sends the email and appends to the Sheet (no duplicate egress).
  const { data: flipped, error: updateError } = await supabase
    .from("tryout_registrations")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      stripe_session_id: stripeSessionId,
      stripe_payment_intent_id: paymentIntentId,
      ...(amountCents != null ? { amount_cents: amountCents } : {}),
    })
    .eq("id", reg.id)
    .neq("payment_status", "paid")
    .select("id");

  if (updateError) {
    // Transient — let Stripe retry.
    console.error("Tryout webhook: failed to mark paid:", updateError);
    return NextResponse.json({ error: "DB update failed." }, { status: 500 });
  }

  // Lost the race — a concurrent delivery already flipped + notified. Don't
  // re-email or re-append.
  if (!flipped || flipped.length === 0) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Resolve the render-ready tryout (scheduled session OR make-up picked date).
  const display = describeTryout({
    type: (reg.tryout_type as TryoutType) ?? "scheduled",
    isoDate: reg.tryout_date,
    group: reg.tryout_group,
  });

  // ── Confirmation email (fail-soft, send-once) ─────────────────────
  if (!reg.confirmation_email_sent) {
    const { sent } = await sendTryoutConfirmationEmail({
      to: reg.email,
      parentName: reg.parent_name,
      playerFullName: reg.player_full_name,
      display,
    });
    if (sent) {
      await supabase
        .from("tryout_registrations")
        .update({ confirmation_email_sent: true })
        .eq("id", reg.id);
    }
  }

  // ── Admin notification (fail-soft) — the informative "someone registered"
  // ping to the club. Runs on the winning delivery only (the race-guard above),
  // so it fires exactly once per paid registration. #count is the true total.
  try {
    const { count: regCount } = await supabase
      .from("tryout_registrations")
      .select("id", { count: "exact", head: true });
    await sendTryoutAdminNotification(
      {
        player_full_name: reg.player_full_name,
        parent_name: reg.parent_name,
        email: reg.email,
        phone: reg.phone,
        graduation_year: reg.graduation_year,
        position: reg.position,
        tryout_group: reg.tryout_group,
        tryout_type: reg.tryout_type,
        tryout_date: reg.tryout_date,
        payment_status: "paid",
        amount_cents: amountCents ?? 5000,
      },
      regCount ?? 0,
    );
  } catch (notifyErr) {
    console.error("Tryout admin notification failed (non-fatal):", notifyErr);
  }

  // ── Roster Command Sheet mirror (fail-soft) — runs once per paid reg;
  // the compare-and-swap above prevents duplicate work on retry.
  await pingCommandSheet("webhook");

  return NextResponse.json({ received: true });
}

// ──────────────────────────────────────────────────────────────────────
// One-off charge paid: insert the ledger row and flip the charge to 'paid'.
// Idempotent and self-converging:
//   • payments insert dedups on the unique stripe_session_id (pre-check +
//     23505 guard), so a duplicate delivery never double-records.
//   • the charge flip is a compare-and-swap (.neq status 'paid'); a second
//     delivery matches 0 rows — it can't pay twice or change the amount.
//   • reconciles NOTHING else — payment_plans are untouched by a charge.
// Returns 500 only on a transient DB error so Stripe retries and converges.
// ──────────────────────────────────────────────────────────────────────
async function handleChargePaid(
  stripe: Stripe,
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  meta: Record<string, string>,
): Promise<NextResponse> {
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true, skipped: "unpaid_session" });
  }

  const chargeId = meta.charge_id;
  const playerId = meta.player_id;
  if (!chargeId || !playerId) {
    console.error("Charge webhook missing metadata:", meta);
    return NextResponse.json({ received: true, skipped: "bad_metadata" });
  }

  const stripeSessionId = session.id;
  const amountCents = session.amount_total ?? 0;
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  // ── 1. Claim the charge — ONLY if it is still 'open' ───────────────
  // Compare-and-swap on status='open'. Exactly one delivery flips it. Any
  // later or parallel delivery (already paid, or VOIDED mid-payment) matches
  // 0 rows — it must never resurrect a voided charge or fabricate a paid row.
  const { data: claimed, error: claimError } = await supabase
    .from("player_charges")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_session_id: stripeSessionId,
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("id", chargeId)
    .eq("status", "open")
    .select("id");

  if (claimError) {
    console.error("Failed to claim charge; will retry:", claimError);
    return NextResponse.json({ error: "Charge update failed." }, { status: 500 });
  }

  const weClaimed = !!claimed && claimed.length === 1;

  if (!weClaimed) {
    // We didn't flip it. Find out why: our own duplicate, or money-taken?
    const { data: chargeRow, error: readError } = await supabase
      .from("player_charges")
      .select("status, stripe_session_id")
      .eq("id", chargeId)
      .maybeSingle();

    if (readError) {
      console.error("Failed to read charge after claim miss:", readError);
      return NextResponse.json({ error: "Charge read failed." }, { status: 500 });
    }
    if (!chargeRow) {
      console.error("Charge webhook: charge row missing:", chargeId);
      return NextResponse.json({ received: true, skipped: "charge_missing" });
    }

    const sameSessionAlreadyPaid =
      chargeRow.status === "paid" &&
      chargeRow.stripe_session_id === stripeSessionId;

    if (!sameSessionAlreadyPaid) {
      // The card was charged but this charge is no longer claimable by THIS
      // session — it was voided mid-payment, or already paid by a different
      // checkout (two tabs). Refund the parent rather than keep the money or
      // write a phantom paid row. Idempotency-keyed so a retry can't double-
      // refund.
      if (paymentIntentId) {
        try {
          await stripe.refunds.create(
            { payment_intent: paymentIntentId },
            { idempotencyKey: `charge_refund_${stripeSessionId}` },
          );
        } catch (refundErr) {
          console.error("Charge refund failed; will retry:", refundErr);
          return NextResponse.json({ error: "Refund failed." }, { status: 500 });
        }
      } else {
        console.error("Charge not claimable and no payment_intent to refund:", {
          chargeId,
          stripeSessionId,
        });
      }
      return NextResponse.json({ received: true, refunded: true });
    }
    // else: a duplicate delivery of OUR OWN winning payment → fall through to
    // ensure the ledger row exists (idempotent). No refund.
  }

  // ── 2. Ledger row (idempotent on stripe_session_id) ────────────────
  // Runs for the winning delivery AND a duplicate redelivery of the same
  // winning session, so a claim-succeeded-but-insert-failed retry converges.
  // Reconciles NOTHING else — payment_plans are untouched by a charge.
  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_session_id", stripeSessionId)
    .maybeSingle();

  let duplicate = !weClaimed;

  if (existing) {
    duplicate = true;
  } else {
    const { error: insertError } = await supabase.from("payments").insert({
      player_id: playerId,
      amount_cents: amountCents,
      payment_category: "custom",
      payment_method: "stripe",
      description: meta.label || meta.ticket_id || "Charge",
      season: meta.season || "2025-26",
      status: "completed",
      payment_date: new Date().toISOString(),
      stripe_session_id: stripeSessionId,
      stripe_payment_intent_id: paymentIntentId,
    });

    if (insertError) {
      const code = (insertError as { code?: string }).code;
      if (code === "23505") {
        duplicate = true;
      } else {
        console.error("Failed to insert charge payment:", insertError);
        return NextResponse.json(
          { error: "Database insert failed." },
          { status: 500 },
        );
      }
    }
  }

  return NextResponse.json({ received: true, duplicate });
}

// ──────────────────────────────────────────────────────────────────────
// 2026 Tryouts: an abandoned checkout expired. Flip the still-pending row to
// 'expired' so abandoned leads don't masquerade as live ones. Guarded to
// pending-only — a paid or failed row is never disturbed. Best-effort cleanup:
// always ack so Stripe doesn't retry.
// ──────────────────────────────────────────────────────────────────────
async function handleTryoutExpired(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  meta: Record<string, string>,
): Promise<NextResponse> {
  const registrationId = meta.registration_id;
  const stripeSessionId = session.id;

  const update = supabase
    .from("tryout_registrations")
    .update({ payment_status: "expired" })
    .eq("payment_status", "pending");

  const { error } = registrationId
    ? await update.eq("id", registrationId)
    : await update.eq("stripe_session_id", stripeSessionId);

  if (error) {
    console.error("Tryout webhook: failed to mark expired:", error);
  }
  return NextResponse.json({ received: true });
}
