import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

interface PostBody {
  player_ids?: unknown;
}

interface DeleteBody {
  player_id?: unknown;
}

function fail(status: number, error: string, field?: string): NextResponse {
  return NextResponse.json(
    field ? { error, field } : { error },
    { status },
  );
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

/**
 * Roster endpoint for one tournament.
 *
 *   GET    → array of active players currently on the roster
 *   POST   → bulk-add player_ids (UNIQUE (tournament_id, player_id) protects
 *            against dupes; 23505 conflicts are skipped silently)
 *   DELETE → remove one player from the roster
 */

// PostgREST embeds the FK target as `players`. The supabase-js types are
// conservative and surface it as an array; at runtime with our FK shape
// it's a single record. Cast via unknown after .select() and access the
// singular fields directly.
interface RosterJoinShape {
  id: string;
  player_id: string;
  notes: string | null;
  created_at: string;
  players: {
    id: string;
    first_name: string;
    last_name: string;
    graduation_year: number | null;
    position: string | null;
    status: string;
  };
}

async function loadRoster(admin: SupabaseClient, tournamentId: string) {
  const { data, error } = await admin
    .from("tournament_rosters")
    .select(
      "id, tournament_id, player_id, notes, created_at, players!inner(id, first_name, last_name, graduation_year, position, status)",
    )
    .eq("tournament_id", tournamentId)
    .eq("players.status", "active");
  if (error) {
    console.error("[tournaments/roster loadRoster]", error);
    return { error: error.message };
  }
  const rows = (data ?? []) as unknown as RosterJoinShape[];
  const shaped = rows.map((r) => ({
    roster_id: r.id,
    player_id: r.player_id,
    notes: r.notes,
    created_at: r.created_at,
    first_name: r.players.first_name,
    last_name: r.players.last_name,
    graduation_year: r.players.graduation_year,
    position: r.players.position,
  }));
  shaped.sort((a, b) => {
    const ay = a.graduation_year ?? 9999;
    const by = b.graduation_year ?? 9999;
    if (ay !== by) return ay - by;
    return a.last_name.localeCompare(b.last_name);
  });
  return { roster: shaped };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: tournamentId } = await context.params;
  if (!tournamentId || !isUuid(tournamentId)) {
    return fail(400, "Invalid tournament id.");
  }
  const tid: string = tournamentId;

  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return fail(403, "Not authorized.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail(500, "Service-role env vars not configured.");
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const result = await loadRoster(admin, tid);
  if ("error" in result) return fail(500, result.error ?? "Failed to load roster.");
  return NextResponse.json({ roster: result.roster });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: tournamentId } = await context.params;
  if (!tournamentId || !isUuid(tournamentId)) {
    return fail(400, "Invalid tournament id.");
  }
  const tid: string = tournamentId;

  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return fail(403, "Not authorized.");
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return fail(400, "Invalid JSON.");
  }

  if (!Array.isArray(body.player_ids)) {
    return fail(400, "player_ids must be an array of uuids.", "player_ids");
  }
  // Filter to valid UUIDs and de-dupe up front so we don't waste an insert
  // on garbage.
  const rawIds = body.player_ids;
  const validIds: string[] = [];
  const seen = new Set<string>();
  for (const v of rawIds) {
    if (!isUuid(v)) {
      return fail(400, "Each player_id must be a uuid.", "player_ids");
    }
    if (!seen.has(v)) {
      seen.add(v);
      validIds.push(v);
    }
  }
  if (validIds.length === 0) {
    return fail(400, "player_ids cannot be empty.", "player_ids");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail(500, "Service-role env vars not configured.");
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Tournament must exist — without this check, FK violation would
  // bubble up as a 500 with a less useful message.
  const { data: tournament, error: tourErr } = await admin
    .from("tournaments")
    .select("id")
    .eq("id", tid)
    .maybeSingle();
  if (tourErr) {
    console.error("[tournaments/roster POST] tournament lookup", tourErr);
    return fail(500, "Tournament lookup failed.");
  }
  if (!tournament) return fail(404, "Tournament not found.");

  // Find player_ids already on the roster so we can report a clean
  // "added vs. skipped" count rather than relying on conflict swallowing.
  const { data: existing, error: existErr } = await admin
    .from("tournament_rosters")
    .select("player_id")
    .eq("tournament_id", tid)
    .in("player_id", validIds);
  if (existErr) {
    console.error("[tournaments/roster POST] existing lookup", existErr);
    return fail(500, "Roster lookup failed.");
  }
  const alreadyOn = new Set(
    ((existing ?? []) as { player_id: string }[]).map((r) => r.player_id),
  );
  const toInsert = validIds.filter((pid) => !alreadyOn.has(pid));

  if (toInsert.length === 0) {
    const roster = await loadRoster(admin, tid);
    if ("error" in roster) return fail(500, roster.error ?? "Failed to load roster.");
    return NextResponse.json({
      added: 0,
      skipped: alreadyOn.size,
      roster: roster.roster,
    });
  }

  // Insert. The UNIQUE constraint still protects against any race; on
  // 23505 we ignore that specific row and re-load the truth.
  const { error: insertErr } = await admin
    .from("tournament_rosters")
    .insert(
      toInsert.map((player_id) => ({ tournament_id: tid, player_id })),
    );
  if (insertErr) {
    const code = (insertErr as { code?: string }).code;
    if (code !== "23505") {
      console.error("[tournaments/roster POST] insert", insertErr);
      return fail(500, insertErr.message ?? "Failed to add roster entries.");
    }
    // 23505 — at least one row raced with a concurrent insert. Fall through
    // to re-load the canonical roster and report what's actually there.
  }

  const roster = await loadRoster(admin, tid);
  if ("error" in roster) return fail(500, roster.error ?? "Failed to load roster.");
  return NextResponse.json({
    added: toInsert.length,
    skipped: alreadyOn.size,
    roster: roster.roster,
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: tournamentId } = await context.params;
  if (!tournamentId || !isUuid(tournamentId)) {
    return fail(400, "Invalid tournament id.");
  }
  const tid: string = tournamentId;

  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return fail(403, "Not authorized.");
  }

  let body: DeleteBody;
  try {
    body = (await request.json()) as DeleteBody;
  } catch {
    return fail(400, "Invalid JSON.");
  }
  if (!isUuid(body.player_id)) {
    return fail(400, "player_id must be a uuid.", "player_id");
  }
  const playerId = body.player_id;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail(500, "Service-role env vars not configured.");
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin
    .from("tournament_rosters")
    .delete()
    .eq("tournament_id", tid)
    .eq("player_id", playerId);
  if (error) {
    console.error("[tournaments/roster DELETE]", error);
    return fail(500, error.message ?? "Failed to remove from roster.");
  }

  return NextResponse.json({ success: true });
}
