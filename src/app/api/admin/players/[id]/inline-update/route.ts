import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { ALLOWED_POSITIONS, type Position } from "@/lib/positions";

export const dynamic = "force-dynamic";

// Spreadsheet-only patch route. Deliberately narrower than
// /api/admin/players/[id] PATCH — name, graduation year, and status
// are never editable from a grid cell. Touch the profile page for those.
interface PatchBody {
  position?: unknown;
  jersey_number?: unknown;
  school?: unknown;
}

function fail(status: number, error: string, field?: string): NextResponse {
  return NextResponse.json(
    field ? { error, field } : { error },
    { status },
  );
}

/** undefined → "not provided"; null/"" → "clear"; bad type → undefined. */
function asNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
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

  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return fail(403, "Not authorized.");
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return fail(400, "Invalid JSON.");
  }

  // Reject any field outside the editable allowlist. Catches the
  // accidental `{ name: "..." }` payload before it can short-circuit
  // validation by sneaking through Object.keys length checks.
  const EDITABLE = new Set(["position", "jersey_number", "school"]);
  for (const key of Object.keys(body)) {
    if (!EDITABLE.has(key)) {
      return fail(400, `Field "${key}" is not editable from spreadsheet.`, key);
    }
  }

  const updates: {
    position?: Position | null;
    jersey_number?: string | null;
    school?: string | null;
  } = {};

  if ("position" in body) {
    const raw = body.position;
    if (raw === null) {
      updates.position = null;
    } else if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed === "") {
        updates.position = null;
      } else if ((ALLOWED_POSITIONS as readonly string[]).includes(trimmed)) {
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
    // jersey_number is TEXT in Supabase — reject numeric payloads outright
    // so callers don't accidentally store "12345" as a number that fails
    // later string comparisons.
    if (body.jersey_number !== null && typeof body.jersey_number !== "string") {
      return fail(
        400,
        "jersey_number must be a string or null.",
        "jersey_number",
      );
    }
    updates.jersey_number = asNullableString(body.jersey_number) ?? null;
  }

  if ("school" in body) {
    if (body.school !== null && typeof body.school !== "string") {
      return fail(400, "school must be a string or null.", "school");
    }
    updates.school = asNullableString(body.school) ?? null;
  }

  if (Object.keys(updates).length === 0) {
    return fail(400, "No editable fields provided.");
  }

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
    .select("id, position, jersey_number, school")
    .maybeSingle();

  if (updateError) {
    console.error("[admin/players inline-update]", updateError);
    return fail(500, updateError.message ?? "Update failed.");
  }
  if (!updated) return fail(404, "Player not found.");

  return NextResponse.json({ success: true, player: updated });
}
