import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const MAX_AMOUNT_CENTS = 1_000_000; // $10,000 cap, matching payment-link route.

function fail(status: number, error: string, field?: string): NextResponse {
  return NextResponse.json(field ? { error, field } : { error }, { status });
}

async function requireAdmin(): Promise<NextResponse | null> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return fail(403, "Not authorized.");
  }
  return null;
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** List a player's charges (admin). */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id: playerId } = await context.params;
  if (!playerId) return fail(400, "Missing player id.");

  const admin = getAdmin();
  if (!admin) return fail(500, "Service-role env vars not configured.");

  const { data, error } = await admin
    .from("player_charges")
    .select("id, label, amount_cents, season, status, paid_at, created_at")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/charges GET] failed:", error);
    return fail(500, "Couldn’t load charges.");
  }
  return NextResponse.json({ charges: data ?? [] });
}

/** Create a one-off charge against a player (admin). */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id: playerId } = await context.params;
  if (!playerId) return fail(400, "Missing player id.");

  let body: { label?: unknown; amount_cents?: unknown; season?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid JSON.");
  }

  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (label.length < 1 || label.length > 200) {
    return fail(400, "Label is required (1–200 characters).", "label");
  }

  const amount_cents = Number(body.amount_cents);
  if (
    !Number.isFinite(amount_cents) ||
    !Number.isInteger(amount_cents) ||
    amount_cents <= 0
  ) {
    return fail(400, "amount_cents must be a positive integer.", "amount_cents");
  }
  if (amount_cents > MAX_AMOUNT_CENTS) {
    return fail(400, "Amount cannot exceed $10,000.", "amount_cents");
  }

  const season =
    typeof body.season === "string" && body.season.trim()
      ? body.season.trim()
      : "2025-26";

  const admin = getAdmin();
  if (!admin) return fail(500, "Service-role env vars not configured.");

  // Confirm the player exists before charging.
  const { data: player, error: playerErr } = await admin
    .from("players")
    .select("id")
    .eq("id", playerId)
    .maybeSingle();
  if (playerErr) {
    console.error("[admin/charges POST] player lookup failed:", playerErr);
    return fail(500, "Player lookup failed.");
  }
  if (!player) return fail(404, "Player not found.");

  const { data: charge, error: insertErr } = await admin
    .from("player_charges")
    .insert({
      player_id: playerId,
      label,
      amount_cents,
      season,
      status: "open",
    })
    .select("id, label, amount_cents, season, status, paid_at, created_at")
    .single();

  if (insertErr) {
    console.error("[admin/charges POST] insert failed:", insertErr);
    return fail(500, "Couldn’t create the charge.");
  }

  return NextResponse.json({ charge }, { status: 201 });
}
