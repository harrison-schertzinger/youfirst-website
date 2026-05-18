import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["active", "cancelled", "completed"] as const;
type TournamentStatus = (typeof ALLOWED_STATUSES)[number];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function fail(status: number, error: string, field?: string): NextResponse {
  return NextResponse.json(
    field ? { error, field } : { error },
    { status },
  );
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

interface PatchBody {
  name?: unknown;
  location?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  notes?: unknown;
  status?: unknown;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!id || typeof id !== "string") return fail(400, "Missing tournament id.");

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

  const updates: {
    name?: string;
    location?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    notes?: string | null;
    status?: TournamentStatus;
  } = {};

  if ("name" in body) {
    const v = asNullableString(body.name);
    if (v === undefined || v === null) return fail(400, "name is required.", "name");
    if (v.length > 200) return fail(400, "name must be 200 characters or fewer.", "name");
    updates.name = v;
  }
  if ("location" in body) {
    const v = asNullableString(body.location);
    if (v === undefined) return fail(400, "location must be a string or null.", "location");
    updates.location = v;
  }
  if ("start_date" in body) {
    const v = asNullableString(body.start_date);
    if (v === undefined) return fail(400, "start_date must be a string or null.", "start_date");
    if (v !== null && !isValidDate(v)) {
      return fail(400, "start_date must be YYYY-MM-DD.", "start_date");
    }
    updates.start_date = v;
  }
  if ("end_date" in body) {
    const v = asNullableString(body.end_date);
    if (v === undefined) return fail(400, "end_date must be a string or null.", "end_date");
    if (v !== null && !isValidDate(v)) {
      return fail(400, "end_date must be YYYY-MM-DD.", "end_date");
    }
    updates.end_date = v;
  }
  if ("notes" in body) {
    const v = asNullableString(body.notes);
    if (v === undefined) return fail(400, "notes must be a string or null.", "notes");
    updates.notes = v;
  }
  if ("status" in body) {
    if (
      typeof body.status !== "string" ||
      !(ALLOWED_STATUSES as readonly string[]).includes(body.status)
    ) {
      return fail(
        400,
        `status must be one of: ${ALLOWED_STATUSES.join(", ")}.`,
        "status",
      );
    }
    updates.status = body.status as TournamentStatus;
  }

  if (Object.keys(updates).length === 0) {
    return fail(400, "No editable fields provided.");
  }

  // If both dates end up set, sanity-check ordering (read the merged state).
  if (
    updates.start_date !== undefined &&
    updates.end_date !== undefined &&
    updates.start_date &&
    updates.end_date &&
    updates.start_date > updates.end_date
  ) {
    return fail(400, "end_date must be on or after start_date.", "end_date");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail(500, "Service-role env vars not configured.");
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: updated, error: updateError } = await admin
    .from("tournaments")
    .update(updates)
    .eq("id", id)
    .select(
      "id, name, location, start_date, end_date, season, notes, status, created_at",
    )
    .maybeSingle();

  if (updateError) {
    console.error("[admin/tournaments/[id] PATCH]", updateError);
    return fail(500, updateError.message ?? "Update failed.");
  }
  if (!updated) return fail(404, "Tournament not found.");
  return NextResponse.json({ success: true, tournament: updated });
}
