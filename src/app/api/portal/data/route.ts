import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readPortalSession } from "@/lib/portal-session";

export const dynamic = "force-dynamic";

/**
 * The parent portal's single read endpoint. Validates the portal token, then
 * loads — via the service role — every player the logged-in guardian is linked
 * to, each enriched with its guardians, payments, most-recent payment plan,
 * and one-off charges. The browser never queries Supabase directly anymore.
 */
export async function GET(request: NextRequest) {
  const session = readPortalSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Which players is this guardian linked to?
  const { data: links, error: linksErr } = await admin
    .from("player_guardians")
    .select("player_id")
    .eq("guardian_id", session.guardianId);

  if (linksErr) {
    console.error("[portal/data] links fetch failed:", linksErr);
    return NextResponse.json({ error: "Couldn’t load your portal." }, { status: 500 });
  }

  const playerIds = [...new Set((links ?? []).map((l) => l.player_id))];
  if (playerIds.length === 0) {
    return NextResponse.json({ email: session.email, players: [] });
  }

  // Deterministic order. Without this the row order is whatever Postgres
  // happens to return, so in a sibling household one child landed above the
  // other arbitrarily from one load to the next.
  const { data: playersData, error: playersErr } = await admin
    .from("players")
    .select(
      "id, first_name, last_name, graduation_year, position, jersey_number, photo_url, team_name, status, shirt_size, short_size, sweatshirt_size, shooting_shirt_size",
    )
    .in("id", playerIds)
    .order("graduation_year", { ascending: true })
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (playersErr) {
    console.error("[portal/data] players fetch failed:", playersErr);
    return NextResponse.json({ error: "Couldn’t load your portal." }, { status: 500 });
  }

  // Who is attached to each of these athletes, by name.
  const { data: guardianRows } = await admin
    .from("player_guardians")
    .select("player_id, guardians(id, first_name, last_name, relationship)")
    .in("player_id", playerIds);

  type GRow = {
    player_id: string;
    guardians:
      | { id: string; first_name: string; last_name: string; relationship: string | null }
      | { id: string; first_name: string; last_name: string; relationship: string | null }[]
      | null;
  };
  const guardianNamesByPlayer = new Map<
    string,
    { id: string; first_name: string; last_name: string; relationship: string | null }[]
  >();
  for (const row of ((guardianRows ?? []) as unknown as GRow[])) {
    const g = Array.isArray(row.guardians) ? row.guardians[0] : row.guardians;
    if (!g) continue;
    const list = guardianNamesByPlayer.get(row.player_id) ?? [];
    list.push(g);
    guardianNamesByPlayer.set(row.player_id, list);
  }

  const players = await Promise.all(
    (playersData ?? []).map(async (player) => {
      const [paymentsRes, balanceRes, seasonsRes, chargesRes] = await Promise.all([
        admin
          .from("payments")
          .select(
            "id, amount_cents, payment_method, payment_category, description, payment_date, season, status",
          )
          .eq("player_id", player.id)
          .order("payment_date", { ascending: false }),
        // THE balance. Derived from money by `player_balances()` and passed
        // through untouched — the browser never computes what is owed, and the
        // collections email reads this same function.
        admin.rpc("player_balances", { p_player_id: player.id }),
        // Every season this athlete has been part of, so the portal can offer a
        // toggle instead of showing only the newest. Proven row-for-row
        // identical to player_balances() for 2025-26 before it shipped.
        admin.rpc("player_season_balances", { p_player_id: player.id }),
        admin
          .from("player_charges")
          .select("id, label, amount_cents, season, status, paid_at, created_at")
          .eq("player_id", player.id)
          .order("created_at", { ascending: true }),
      ]);

      if (balanceRes.error) {
        console.error("[portal/data] player_balances failed:", balanceRes.error);
      }
      if (seasonsRes.error) {
        console.error("[portal/data] player_season_balances failed:", seasonsRes.error);
      }

      return {
        ...player,
        // PII LOCKDOWN: co-guardians' email / phone / home address are NEVER
        // returned to the portal. It only needs the player and the financial
        // fields to pay a balance. (Open self-linking is unchanged — that lives
        // in /api/portal/link and is untouched.)
        // Names and relationship only — enough for a parent to see who is
        // attached to her athlete and to notice someone missing. Email, phone
        // and address are still never returned. The PII lockdown is unchanged;
        // this adds no contact detail to the payload.
        guardians: (guardianNamesByPlayer.get(player.id) ?? []),
        payments: paymentsRes.data ?? [],
        balance: balanceRes.data?.[0] ?? null,
        // Newest season first — that is the one a family wants by default.
        seasons: (seasonsRes.data ?? []).sort(
          (a: { season: string }, b: { season: string }) =>
            b.season.localeCompare(a.season),
        ),
        charges: chargesRes.data ?? [],
      };
    }),
  );

  // The signed-in parent's own record, so the portal can prefill her details.
  // This is HER row and nobody else's — co-guardian PII stays locked down.
  const { data: me } = await admin
    .from("guardians")
    .select("id, first_name, last_name, email, phone, relationship")
    .eq("id", session.guardianId)
    .maybeSingle();

  return NextResponse.json({ email: session.email, guardian: me ?? null, players });
}
