import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const CATEGORY_VALUES = ["roster", "summer", "fall", "custom"] as const;
type PaymentCategory = (typeof CATEGORY_VALUES)[number];

interface PostBody {
  amount_cents?: unknown;
  description?: unknown;
  payment_category?: unknown;
}

function fail(status: number, error: string, field?: string): NextResponse {
  return NextResponse.json(
    field ? { error, field } : { error },
    { status },
  );
}

/** Map admin-supplied category to what the existing /api/stripe/webhook
 *  accepts. The webhook only routes 'roster' and 'summer' — anything else
 *  is silently skipped. Mapping here keeps the webhook code untouched and
 *  ensures custom-amount payments still record in `payments`. */
function webhookCategory(adminCategory: PaymentCategory): "roster" | "summer" {
  return adminCategory === "roster" ? "roster" : "summer";
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: player_id } = await context.params;
  if (!player_id || typeof player_id !== "string") {
    return fail(400, "Missing player id.");
  }

  // ── Auth ────────────────────────────────────────────────────────────────
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return fail(403, "Not authorized.");
  }

  // ── Parse + validate body ──────────────────────────────────────────────
  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return fail(400, "Invalid JSON.");
  }

  const amount_cents = Number(body.amount_cents);
  if (
    !Number.isFinite(amount_cents) ||
    !Number.isInteger(amount_cents) ||
    amount_cents <= 0
  ) {
    return fail(
      400,
      "amount_cents must be a positive integer.",
      "amount_cents",
    );
  }
  if (amount_cents > 1_000_000) {
    return fail(
      400,
      "amount_cents cannot exceed $10,000 (1,000,000 cents).",
      "amount_cents",
    );
  }

  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (description.length < 1 || description.length > 200) {
    return fail(
      400,
      "description is required (1–200 characters).",
      "description",
    );
  }

  let admin_category: PaymentCategory = "custom";
  if (body.payment_category !== undefined) {
    if (
      typeof body.payment_category !== "string" ||
      !(CATEGORY_VALUES as readonly string[]).includes(body.payment_category)
    ) {
      return fail(
        400,
        `payment_category must be one of: ${CATEGORY_VALUES.join(", ")}.`,
        "payment_category",
      );
    }
    admin_category = body.payment_category as PaymentCategory;
  }

  // ── Service-role + Stripe clients (after auth + validation) ────────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail(500, "Service-role env vars not configured.");
  const supabaseAdmin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const stripe = getStripe();
  if (!stripe) {
    return fail(
      503,
      "Stripe is not configured. Set STRIPE_SECRET_KEY and redeploy.",
    );
  }

  // ── Look up player + primary guardian for metadata ─────────────────────
  const { data: player, error: playerErr } = await supabaseAdmin
    .from("players")
    .select("id, first_name, last_name")
    .eq("id", player_id)
    .maybeSingle();
  if (playerErr) {
    console.error("[admin/.../payment-link] player lookup failed:", playerErr);
    return fail(500, "Player lookup failed.");
  }
  if (!player) return fail(404, "Player not found.");

  const { data: primaryLink } = await supabaseAdmin
    .from("player_guardians")
    .select("guardian_id")
    .eq("player_id", player_id)
    .eq("is_primary", true)
    .maybeSingle();
  const primary_guardian_id: string = primaryLink?.guardian_id ?? "";

  // ── Stripe: Price → Payment Link ───────────────────────────────────────
  const playerName = `${player.first_name} ${player.last_name}`;
  const ticket_id = `custom_${Date.now()}_${player_id.slice(0, 8)}`;

  try {
    const price = await stripe.prices.create({
      currency: "usd",
      unit_amount: amount_cents,
      product_data: {
        name: `You. First Lacrosse Payment — ${playerName}`,
      },
    });

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: {
        player_id: player.id,
        guardian_id: primary_guardian_id,
        ticket_id,
        // `category` is the value the existing webhook reads; map admin's
        // intent to the two values the webhook accepts so the payment
        // actually records in `payments`. Admin intent preserved in
        // `payment_category` + `description`.
        category: webhookCategory(admin_category),
        payment_category: admin_category,
        player_name: playerName,
        description,
      },
      after_completion: {
        type: "redirect",
        redirect: { url: "https://youfirstlacrosse.com/portal?paid=custom" },
      },
    });

    return NextResponse.json({
      url: paymentLink.url,
      payment_link_id: paymentLink.id,
      ticket_id,
      mapped_webhook_category: webhookCategory(admin_category),
    });
  } catch (err) {
    console.error("[admin/.../payment-link] Stripe call failed:", err);
    return fail(
      502,
      "We couldn't create the payment link. Check Stripe configuration and try again.",
    );
  }
}
