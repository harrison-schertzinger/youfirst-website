import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import { STRIPE_PRICE_IDS, TICKET_AMOUNTS_CENTS } from "@/lib/feesData";

// C1/C3 fix: derive price + verify unpaid state server-side.
// Client only supplies (playerId, category, installmentIndex). Everything
// that affects what the parent is charged is recomputed here.

type Category = "roster" | "summer";

function resolveSummerPrice(
  installmentsTotal: number,
): { priceId: string; amountCents: number } | null {
  if (installmentsTotal === 1) {
    return {
      priceId: STRIPE_PRICE_IDS.summer_full,
      amountCents: TICKET_AMOUNTS_CENTS.summer_full,
    };
  }
  if (installmentsTotal === 2) {
    return {
      priceId: STRIPE_PRICE_IDS.summer_half,
      amountCents: TICKET_AMOUNTS_CENTS.summer_half,
    };
  }
  if (installmentsTotal === 4) {
    return {
      priceId: STRIPE_PRICE_IDS.summer_quarter,
      amountCents: TICKET_AMOUNTS_CENTS.summer_quarter,
    };
  }
  return null;
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();

  if (!stripe) {
    return NextResponse.json(
      {
        error:
          "Payment system is being configured. Please contact kathleen@youfirstelitelacrosseclub.com.",
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

  const {
    playerId,
    category,
    installmentIndex,
  } = (body ?? {}) as {
    playerId?: string;
    category?: string;
    installmentIndex?: number;
  };

  if (typeof playerId !== "string" || !playerId) {
    return NextResponse.json({ error: "Missing playerId." }, { status: 400 });
  }
  if (category !== "roster" && category !== "summer") {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  const safeCategory: Category = category;

  // ── Authenticate: read user from Supabase session cookies ──────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // No-op — this route doesn't refresh cookies
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // ── Authorize: verify this user is a guardian of this player ────────
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: guardian } = await admin
    .from("guardians")
    .select("id, email")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!guardian) {
    return NextResponse.json({ error: "Guardian not found." }, { status: 403 });
  }

  const { data: link } = await admin
    .from("player_guardians")
    .select("player_id")
    .eq("guardian_id", guardian.id)
    .eq("player_id", playerId)
    .maybeSingle();

  if (!link) {
    return NextResponse.json(
      { error: "You are not authorized to make payments for this player." },
      { status: 403 },
    );
  }

  // ── Re-derive ticket state server-side (C1 + C3) ───────────────────
  //  - Summer: look up the player's plan, derive price from installments_total
  //  - Roster: fixed $200 price
  //  - Reject if already paid
  let stripePriceId: string;
  let installmentsTotal: number | undefined;
  let ticketId: string;

  if (safeCategory === "roster") {
    // Fetch completed roster payments; sum to check paid state
    const { data: rosterPayments } = await admin
      .from("payments")
      .select("amount_cents, status, payment_category")
      .eq("player_id", playerId)
      .eq("payment_category", "roster")
      .eq("status", "completed");

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

    stripePriceId = STRIPE_PRICE_IDS.roster;
    ticketId = `${playerId}-roster-1`;
  } else {
    // Summer: fetch most recent plan
    const { data: plan } = await admin
      .from("payment_plans")
      .select(
        "id, total_amount_cents, amount_paid_cents, installments_total, installments_paid, plan_type",
      )
      .eq("player_id", playerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!plan || !plan.total_amount_cents || plan.total_amount_cents <= 0) {
      return NextResponse.json(
        { error: "No active summer payment plan for this player." },
        { status: 404 },
      );
    }

    // Normalize installments_total to a supported value (1, 2, or 4).
    let iTotal = plan.installments_total ?? 0;
    if (iTotal !== 1 && iTotal !== 2 && iTotal !== 4) {
      if (plan.plan_type === "quarterly") iTotal = 4;
      else if (plan.plan_type === "monthly") iTotal = 2;
      else iTotal = 1;
    }

    const resolved = resolveSummerPrice(iTotal);
    if (!resolved) {
      return NextResponse.json(
        { error: "Unsupported installment configuration." },
        { status: 400 },
      );
    }

    const idx =
      typeof installmentIndex === "number" && Number.isInteger(installmentIndex)
        ? installmentIndex
        : undefined;

    if (idx == null || idx < 1 || idx > iTotal) {
      return NextResponse.json(
        { error: "Invalid installment index." },
        { status: 400 },
      );
    }

    const paidCount = Math.min(
      Math.max(0, plan.installments_paid ?? 0),
      iTotal,
    );

    // Reject if this specific installment (or an earlier one) is already paid.
    if (idx <= paidCount) {
      return NextResponse.json(
        { error: "This installment is already paid." },
        { status: 409 },
      );
    }

    // Also reject if the plan is already fully paid by dollars.
    if ((plan.amount_paid_cents ?? 0) >= plan.total_amount_cents) {
      return NextResponse.json(
        { error: "Summer tuition is already paid in full." },
        { status: 409 },
      );
    }

    stripePriceId = resolved.priceId;
    installmentsTotal = iTotal;
    ticketId = `${playerId}-summer-${idx}`;
  }

  // ── Look up player name for receipt ────────────────────────────────
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
      line_items: [{ price: stripePriceId, quantity: 1 }],
      customer_email: guardian.email || user.email || undefined,
      metadata: {
        player_id: playerId,
        guardian_id: guardian.id,
        ticket_id: ticketId,
        category: safeCategory,
        ...(safeCategory === "summer" && installmentsTotal
          ? {
              installment_index: String(installmentIndex),
              installments_total: String(installmentsTotal),
            }
          : {}),
        player_name: playerName,
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
