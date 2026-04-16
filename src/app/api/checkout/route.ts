import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";

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

  const body = await request.json();
  const {
    playerId,
    ticketId,
    category,
    stripePriceId,
    installmentIndex,
    installmentsTotal,
  } = body as {
    playerId: string;
    ticketId: string;
    category: "roster" | "summer";
    stripePriceId: string;
    installmentIndex?: number;
    installmentsTotal?: number;
  };

  if (!playerId || !ticketId || !category || !stripePriceId) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

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

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: stripePriceId, quantity: 1 }],
    customer_email: guardian.email || user.email || undefined,
    metadata: {
      player_id: playerId,
      guardian_id: guardian.id,
      ticket_id: ticketId,
      category,
      ...(installmentIndex != null ? { installment_index: String(installmentIndex) } : {}),
      ...(installmentsTotal != null ? { installments_total: String(installmentsTotal) } : {}),
      player_name: playerName,
    },
    success_url: `${origin}/portal?paid=${encodeURIComponent(ticketId)}`,
    cancel_url: `${origin}/portal?canceled=${encodeURIComponent(ticketId)}`,
  });

  return NextResponse.json({ url: session.url });
}
