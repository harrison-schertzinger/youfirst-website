import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readPortalSession } from "@/lib/portal-session";

export const dynamic = "force-dynamic";

/**
 * Link the logged-in parent's guardian record to a player. Idempotent: the
 * player_guardians primary key is (player_id, guardian_id), so re-linking is
 * a no-op. A parent may link to more than one player.
 */
export async function POST(request: NextRequest) {
  const session = readPortalSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { playerId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const playerId = typeof body.playerId === "string" ? body.playerId : "";
  if (!playerId) {
    return NextResponse.json({ error: "Missing player." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Confirm the player exists and is active before linking.
  const { data: player, error: playerErr } = await admin
    .from("players")
    .select("id, status")
    .eq("id", playerId)
    .maybeSingle();

  if (playerErr) {
    console.error("[portal/link] player lookup failed:", playerErr);
    return NextResponse.json({ error: "Couldn’t link right now." }, { status: 500 });
  }
  if (!player || player.status !== "active") {
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }

  // Insert the link; ignore if it already exists (composite PK conflict).
  const { error: linkErr } = await admin
    .from("player_guardians")
    .upsert(
      { player_id: playerId, guardian_id: session.guardianId, is_primary: false },
      { onConflict: "player_id,guardian_id", ignoreDuplicates: true },
    );

  if (linkErr) {
    console.error("[portal/link] link insert failed:", linkErr);
    return NextResponse.json({ error: "Couldn’t link your account." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
