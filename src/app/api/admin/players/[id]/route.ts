import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const ALLOWED_POSITIONS = ["Attack", "Midfield", "Defense", "Goalie"] as const;
type Position = (typeof ALLOWED_POSITIONS)[number];

// NEVER hard-delete a player. Cascade rules on player_guardians, payments,
// and payment_plans would destroy the financial record. Use status
// transitions only. The DB's players_status_check constraint allows
// exactly these three values; anything else is rejected by Postgres.
const ALLOWED_STATUSES = ["active", "inactive", "alumni"] as const;
type PlayerStatus = (typeof ALLOWED_STATUSES)[number];

interface PatchBody {
  position?: unknown;
  jersey_number?: unknown;
  school?: unknown;
  status?: unknown;
}

function fail(status: number, error: string, field?: string): NextResponse {
  return NextResponse.json(
    field ? { error, field } : { error },
    { status },
  );
}

/** Treat undefined / null / "" as "leave blank" and return null. Trimmed. */
function asNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined; // surface as missing
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return fail(400, "Missing player id.");
  }

  // ── Auth: read the session via the anon-key server client ──────────────
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return fail(403, "Not authorized.");
  }

  // ── Parse + validate body ──────────────────────────────────────────────
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return fail(400, "Invalid JSON.");
  }

  // Build the update payload one field at a time so a typo in any field
  // surfaces before we touch the DB.
  const updates: {
    position?: Position | null;
    jersey_number?: string | null;
    school?: string | null;
    status?: PlayerStatus;
  } = {};

  if ("position" in body) {
    const raw = body.position;
    if (raw === null) {
      updates.position = null;
    } else if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed === "") {
        updates.position = null;
      } else if (
        (ALLOWED_POSITIONS as readonly string[]).includes(trimmed)
      ) {
        updates.position = trimmed as Position;
      } else {
        return fail(
          400,
          `Position must be one of: ${ALLOWED_POSITIONS.join(", ")}.`,
          "position",
        );
      }
    } else {
      return fail(400, "Position must be a string or null.", "position");
    }
  }

  if ("jersey_number" in body) {
    const value = asNullableString(body.jersey_number);
    if (value === undefined) {
      return fail(400, "jersey_number must be a string or null.", "jersey_number");
    }
    updates.jersey_number = value;
  }

  if ("school" in body) {
    const value = asNullableString(body.school);
    if (value === undefined) {
      return fail(400, "school must be a string or null.", "school");
    }
    updates.school = value;
  }

  if ("status" in body) {
    const raw = body.status;
    if (typeof raw !== "string" || !(ALLOWED_STATUSES as readonly string[]).includes(raw)) {
      return fail(
        400,
        `status must be one of: ${ALLOWED_STATUSES.join(", ")}.`,
        "status",
      );
    }
    updates.status = raw as PlayerStatus;
  }

  if (Object.keys(updates).length === 0) {
    return fail(400, "No editable fields provided.");
  }

  // ── Service-role client for the write ──────────────────────────────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return fail(500, "Service-role env vars not configured.");
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: updated, error: updateError } = await admin
    .from("players")
    .update(updates)
    .eq("id", id)
    .select(
      "id, first_name, last_name, graduation_year, position, jersey_number, school, photo_url, team_name, status, created_at",
    )
    .maybeSingle();

  if (updateError) {
    console.error("[admin/players PATCH] update failed:", updateError);
    return fail(500, updateError.message ?? "Update failed.");
  }
  if (!updated) {
    return fail(404, "Player not found.");
  }

  return NextResponse.json({ success: true, player: updated });
}
