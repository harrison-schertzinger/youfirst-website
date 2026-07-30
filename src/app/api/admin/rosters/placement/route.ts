import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import {
  DECISION_TAGS,
  getServiceClient,
  isPlacementTier,
  placedTeamOk,
  regPlacedTeamOk,
  stripDecisionTags,
} from "@/lib/rosters/data";

export const dynamic = "force-dynamic";

// One decision, one write, both fields. placed_team carries the class team,
// placement_tier carries the roster within it. The placed_team CHECK
// constraints are the rails: registrations accept 2027–2034, players accept
// 20[2-3][0-9]. We validate against mirrors of those rails so a failed write
// is an explained no, not a constraint error.

const CHOICES = [
  "elite",
  "blue",
  "elite_youth",
  "elite_training",
  "declined",
  "pending",
  "no_tryout",
  "no_registration",
  "move_down",
  "move_up",
] as const;
type Choice = (typeof CHOICES)[number];

interface Body {
  table?: string;
  id?: string;
  choice?: string;
}

function fail(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}

export async function PATCH(req: Request): Promise<NextResponse> {
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

  const { table, id, choice } = body;
  if (table !== "players" && table !== "tryout_registrations") {
    return fail(400, "Unknown table.");
  }
  if (!id || typeof id !== "string") return fail(400, "Missing id.");
  if (!choice || !(CHOICES as readonly string[]).includes(choice)) {
    return fail(400, "Unknown placement choice.");
  }
  const picked = choice as Choice;

  // ── Load current state — every write validates against live data ────────
  let gradYear: number | null = null;
  let placedTeam: string | null = null;
  let notes: string | null = null;
  let playerId: string | null = null;

  if (table === "players") {
    const { data, error } = await admin
      .from("players")
      .select("id, graduation_year, placed_team, placement_tier")
      .eq("id", id)
      .maybeSingle();
    if (error) return fail(500, `Read failed: ${error.message}`);
    if (!data) return fail(404, "Player not found.");
    gradYear = data.graduation_year as number;
    placedTeam = data.placed_team as string | null;
  } else {
    const { data, error } = await admin
      .from("tryout_registrations")
      .select("id, graduation_year, placed_team, placement_tier, notes, player_id")
      .eq("id", id)
      .maybeSingle();
    if (error) return fail(500, `Read failed: ${error.message}`);
    if (!data) return fail(404, "Registration not found.");
    gradYear = data.graduation_year as number | null;
    placedTeam = data.placed_team as string | null;
    notes = data.notes as string | null;
    playerId = data.player_id as string | null;
  }

  const currentClass =
    placedTeam && /^\d{4}$/.test(placedTeam)
      ? parseInt(placedTeam, 10)
      : gradYear;

  if (picked === "no_tryout" || picked === "no_registration") {
    if (table === "players") {
      return fail(400, "That status applies to registrations, not returning players.");
    }
  }

  // ── Compute the write ───────────────────────────────────────────────────
  const regUpdate: Record<string, string | null> = {};
  const playerUpdate: Record<string, string | null> = {};
  let targetClass: number | null = currentClass;

  const validTeamFor = placedTeamOk;

  if (isPlacementTier(picked) && picked !== "declined") {
    if (currentClass == null) {
      return fail(400, "No graduation year on file — set or merge this athlete before placing.");
    }
    if (!validTeamFor(table, currentClass)) {
      return fail(400, `Class ${currentClass} is outside the ${table === "players" ? "player" : "registration"} team range.`);
    }
    const team = String(currentClass);
    playerUpdate.placed_team = team;
    playerUpdate.placement_tier = picked;
    regUpdate.placed_team = team;
    regUpdate.placement_tier = picked;
    regUpdate.pipeline_status = "placed";
    regUpdate.notes = stripDecisionTags(notes);
  } else if (picked === "declined") {
    playerUpdate.placement_tier = "declined";
    regUpdate.placement_tier = "declined";
    regUpdate.pipeline_status = "passed";
    regUpdate.notes = stripDecisionTags(notes);
  } else if (picked === "pending") {
    playerUpdate.placement_tier = null;
    playerUpdate.placed_team = null;
    regUpdate.placement_tier = null;
    regUpdate.placed_team = null;
    regUpdate.pipeline_status = "new";
    regUpdate.notes = stripDecisionTags(notes);
  } else if (picked === "no_tryout" || picked === "no_registration") {
    const base = stripDecisionTags(notes);
    regUpdate.placement_tier = null;
    regUpdate.placed_team = null;
    regUpdate.pipeline_status = "passed";
    regUpdate.notes = base ? `${base} ${DECISION_TAGS[picked]}` : DECISION_TAGS[picked];
  } else {
    // move_down → the class below (younger = later graduation year);
    // move_up → the class above.
    if (currentClass == null) {
      return fail(400, "No graduation year on file — set or merge this athlete before moving.");
    }
    targetClass = picked === "move_down" ? currentClass + 1 : currentClass - 1;
    if (!validTeamFor(table, targetClass)) {
      return fail(
        400,
        `Can't move to ${targetClass} — the ${table === "players" ? "player" : "registration"} team range stops at ${
          table === "players" ? "2039" : "2027–2034"
        }.`,
      );
    }
    const team = String(targetClass);
    playerUpdate.placed_team = team;
    regUpdate.placed_team = team;
  }

  // ── Write, mirroring a player decision onto her linked registrations ────
  if (table === "players") {
    const { error } = await admin.from("players").update(playerUpdate).eq("id", id);
    if (error) return fail(500, `Save failed: ${error.message}`);

    // Keep the pipeline row truthful for the email system. Registrations only
    // accept 2027–2034 in placed_team, so an out-of-range mirror skips that
    // field rather than failing the whole decision.
    const mirror: Record<string, string | null> = {};
    if ("placement_tier" in playerUpdate) mirror.placement_tier = playerUpdate.placement_tier;
    if ("placed_team" in playerUpdate) {
      const t = playerUpdate.placed_team;
      if (t === null || regPlacedTeamOk(parseInt(t, 10))) mirror.placed_team = t;
    }
    if ("placement_tier" in playerUpdate) {
      const tier = playerUpdate.placement_tier;
      mirror.pipeline_status =
        tier === null ? "new" : tier === "declined" ? "passed" : "placed";
    }
    if (Object.keys(mirror).length > 0) {
      const { error: mirrorErr } = await admin
        .from("tryout_registrations")
        .update(mirror)
        .eq("player_id", id)
        .not("notes", "ilike", "%superseded%");
      // A mirror miss is reported, not fatal — the players row is canonical.
      if (mirrorErr) {
        return NextResponse.json({
          ok: true,
          targetClass,
          warning: `Saved, but the linked registration didn't mirror: ${mirrorErr.message}`,
        });
      }
    }
  } else {
    const { error } = await admin
      .from("tryout_registrations")
      .update(regUpdate)
      .eq("id", id);
    if (error) return fail(500, `Save failed: ${error.message}`);

    // A registration linked to a player mirrors the placement onto her
    // canonical row too — one decision, both records.
    if (playerId && ("placement_tier" in regUpdate || "placed_team" in regUpdate)) {
      const mirror: Record<string, string | null> = {};
      if ("placement_tier" in regUpdate) mirror.placement_tier = regUpdate.placement_tier;
      if ("placed_team" in regUpdate && regUpdate.placed_team !== null) {
        mirror.placed_team = regUpdate.placed_team;
      }
      await admin.from("players").update(mirror).eq("id", playerId);
    }
  }

  return NextResponse.json({ ok: true, targetClass });
}
