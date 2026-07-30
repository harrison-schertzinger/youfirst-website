import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { getServiceClient } from "@/lib/rosters/data";

export const dynamic = "force-dynamic";

// Human-confirmed merge of a duplicate. The dropped side is ALWAYS a
// registration and is never deleted — it's tagged SUPERSEDED (the established
// convention active views filter on) and pointed at the surviving record, so
// the paper trail survives the cleanup. Nothing here runs automatically.

interface Body {
  dropRegId?: string;
  keepTable?: string;
  keepId?: string;
}

function fail(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request): Promise<NextResponse> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return fail(403, "Not authorized.");
  }

  const admin = getServiceClient();
  if (!admin) return fail(500, "Service-role env vars not configured.");

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return fail(400, "Invalid JSON body.");
  }

  const { dropRegId, keepTable, keepId } = body;
  if (!dropRegId || typeof dropRegId !== "string") return fail(400, "Missing dropRegId.");
  if (keepTable !== "players" && keepTable !== "tryout_registrations") {
    return fail(400, "Unknown keep table.");
  }
  if (!keepId || typeof keepId !== "string") return fail(400, "Missing keepId.");
  if (keepTable === "tryout_registrations" && keepId === dropRegId) {
    return fail(400, "A row can't survive its own merge.");
  }

  const { data: drop, error: dropErr } = await admin
    .from("tryout_registrations")
    .select("id, player_full_name, notes, player_id")
    .eq("id", dropRegId)
    .maybeSingle();
  if (dropErr) return fail(500, `Read failed: ${dropErr.message}`);
  if (!drop) return fail(404, "Registration to merge not found.");
  if (drop.notes && String(drop.notes).toUpperCase().includes("SUPERSEDED")) {
    return fail(409, "That registration is already superseded.");
  }

  // Confirm the surviving record exists before pointing anything at it.
  let keepName: string;
  if (keepTable === "players") {
    const { data: keep, error } = await admin
      .from("players")
      .select("id, first_name, last_name")
      .eq("id", keepId)
      .maybeSingle();
    if (error) return fail(500, `Read failed: ${error.message}`);
    if (!keep) return fail(404, "Surviving player not found.");
    keepName = `${keep.first_name} ${keep.last_name}`;
  } else {
    const { data: keep, error } = await admin
      .from("tryout_registrations")
      .select("id, player_full_name")
      .eq("id", keepId)
      .maybeSingle();
    if (error) return fail(500, `Read failed: ${error.message}`);
    if (!keep) return fail(404, "Surviving registration not found.");
    keepName = keep.player_full_name as string;
  }

  const tag = `SUPERSEDED — duplicate registration, do not contact. Surviving record id ${keepId}.`;
  const notes = drop.notes ? `${drop.notes} | ${tag}` : tag;

  const update: Record<string, string | null> = { notes };
  if (keepTable === "players" && !drop.player_id) update.player_id = keepId;

  const { error: updateErr } = await admin
    .from("tryout_registrations")
    .update(update)
    .eq("id", dropRegId);
  if (updateErr) return fail(500, `Merge failed: ${updateErr.message}`);

  return NextResponse.json({
    ok: true,
    superseded: drop.player_full_name,
    keptName: keepName,
  });
}
