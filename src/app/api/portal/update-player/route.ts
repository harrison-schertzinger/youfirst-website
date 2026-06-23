import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readPortalSession } from "@/lib/portal-session";

const ALLOWED_SIZES = new Set(["XS", "S", "M", "L", "XL", "XXL"]);

function sanitizeSize(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ALLOWED_SIZES.has(value) ? value : null;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const playerId: string | undefined = body?.playerId;
  if (!playerId) {
    return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
  }

  // Auth — portal token (parents are not on Supabase Auth)
  const session = readPortalSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Service-role admin client for ownership check + update
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Editing a player's profile stays scoped to the parent's linked players.
  const { data: link } = await admin
    .from("player_guardians")
    .select("player_id")
    .eq("guardian_id", session.guardianId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (!link) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, string | null> = {};
  if ("shirtSize" in (body ?? {})) updates.shirt_size = sanitizeSize(body.shirtSize);
  if ("shortSize" in (body ?? {})) updates.short_size = sanitizeSize(body.shortSize);
  if ("sweatshirtSize" in (body ?? {})) updates.sweatshirt_size = sanitizeSize(body.sweatshirtSize);
  if ("shootingShirtSize" in (body ?? {})) updates.shooting_shirt_size = sanitizeSize(body.shootingShirtSize);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  }

  const { error: updateError } = await admin
    .from("players")
    .update(updates)
    .eq("id", playerId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
