import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readPortalSession } from "@/lib/portal-session";

/**
 * Sizes the portal's own dropdown offers. It MUST stay a superset of the
 * option list in PlayerProfileTile.tsx — a value the parent can pick but the
 * server refuses is not a validation error, it is a silent wipe: sanitizeSize
 * returns null and the column is cleared to blank. YS/YM/YL were offered by
 * the dropdown and rejected here, which is why a youth club's database holds
 * zero youth sizes.
 */
const ALLOWED_SIZES = new Set([
  "YS", "YM", "YL",
  "XS", "S", "M", "L", "XL", "XXL",
]);

function sanitizeSize(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toUpperCase();
  return ALLOWED_SIZES.has(v) ? v : null;
}

/**
 * The four gear fields, each with both spellings this codebase uses.
 *
 * The portal (PlayerProfileTile) posts snake_case because it holds sizes in
 * the same shape as the player row it spreads them back into; /api/register
 * posts camelCase. This route only ever read camelCase, so every portal save
 * matched nothing, produced an empty update, and came back 400 "No updatable
 * fields" — a parent has never once been able to change a size. Accept both
 * spellings so neither caller can miss again.
 */
const SIZE_FIELDS: Array<{ column: string; keys: string[] }> = [
  { column: "shirt_size", keys: ["shirtSize", "shirt_size"] },
  { column: "short_size", keys: ["shortSize", "short_size"] },
  { column: "sweatshirt_size", keys: ["sweatshirtSize", "sweatshirt_size"] },
  { column: "shooting_shirt_size", keys: ["shootingShirtSize", "shooting_shirt_size"] },
];

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

  const payload = (body ?? {}) as Record<string, unknown>;
  const updates: Record<string, string | null> = {};
  for (const { column, keys } of SIZE_FIELDS) {
    const key = keys.find((k) => k in payload);
    if (key === undefined) continue;
    const raw = payload[key];
    // "" is the dropdown's own "—" option: an intentional clear, kept as null.
    if (typeof raw === "string" && raw.trim() === "") {
      updates[column] = null;
      continue;
    }
    const size = sanitizeSize(raw);
    // A value the server does not recognise is rejected outright rather than
    // written as null — refusing the save is recoverable, wiping is not.
    if (size === null) {
      return NextResponse.json(
        { error: `\u201C${String(raw)}\u201D is not a size we can order.` },
        { status: 400 },
      );
    }
    updates[column] = size;
  }

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
