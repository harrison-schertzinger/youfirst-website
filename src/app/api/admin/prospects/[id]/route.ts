import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import {
  isProspectStage,
  isProspectStatus,
  PRE_PROGRESS_STAGES,
  PROGRESSED_STAGES,
  type ProspectStage,
  type ProspectStatus,
} from "@/lib/prospects";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PatchBody {
  first_name?: unknown;
  last_name?: unknown;
  graduation_year?: unknown;
  position?: unknown;
  school?: unknown;
  prospect_email?: unknown;
  parent_first_name?: unknown;
  parent_last_name?: unknown;
  parent_email?: unknown;
  parent_phone?: unknown;
  source?: unknown;
  stage?: unknown;
  notes?: unknown;
  last_contacted_at?: unknown;
  status?: unknown;
  mark_contacted?: unknown;
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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!id) return fail(400, "Missing prospect id.");

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

  const { data, error } = await admin
    .from("prospects")
    .select(
      "id, first_name, last_name, graduation_year, position, school, prospect_email, parent_first_name, parent_last_name, parent_email, parent_phone, source, stage, last_contacted_at, notes, converted_player_id, status, created_at, created_by, updated_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[admin/prospects GET id]", error);
    return fail(500, "Failed to load prospect.");
  }
  if (!data) return fail(404, "Prospect not found.");
  return NextResponse.json({ prospect: data });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!id) return fail(400, "Missing prospect id.");

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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail(500, "Service-role env vars not configured.");
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Need the current row to compute stage-transition side effects.
  const { data: existing, error: lookupError } = await admin
    .from("prospects")
    .select("id, stage, status")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) {
    console.error("[admin/prospects PATCH] lookup", lookupError);
    return fail(500, "Lookup failed.");
  }
  if (!existing) return fail(404, "Prospect not found.");

  const updates: Record<string, unknown> = {};

  // Trimmed-string fields — handled identically.
  for (const field of [
    "first_name",
    "last_name",
    "position",
    "school",
    "prospect_email",
    "parent_first_name",
    "parent_last_name",
    "parent_phone",
    "source",
    "notes",
  ] as const) {
    if (field in body) {
      const v = asNullableString(body[field]);
      if (v === undefined) {
        return fail(400, `${field} must be a string or null.`, field);
      }
      updates[field] = v;
    }
  }

  // first_name / last_name can't be cleared.
  if ("first_name" in body && updates.first_name === null) {
    return fail(400, "first_name is required.", "first_name");
  }
  if ("last_name" in body && updates.last_name === null) {
    return fail(400, "last_name is required.", "last_name");
  }

  if ("prospect_email" in body && typeof updates.prospect_email === "string") {
    if (!EMAIL_RE.test(updates.prospect_email as string)) {
      return fail(400, "prospect_email is not valid.", "prospect_email");
    }
  }

  if ("parent_email" in body) {
    const v = asNullableString(body.parent_email);
    if (v === undefined) {
      return fail(400, "parent_email must be a string or null.", "parent_email");
    }
    if (v !== null && !EMAIL_RE.test(v)) {
      return fail(400, "parent_email is not valid.", "parent_email");
    }
    updates.parent_email = v ? v.toLowerCase() : null;
  }

  if ("graduation_year" in body) {
    const raw = body.graduation_year;
    if (raw === null || raw === "") {
      updates.graduation_year = null;
    } else {
      const n = Number(raw);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 2024 || n > 2040) {
        return fail(
          400,
          "Graduation year must be 2024–2040.",
          "graduation_year",
        );
      }
      updates.graduation_year = n;
    }
  }

  let stageChanged = false;
  let nextStage: ProspectStage | null = null;
  if ("stage" in body) {
    if (!isProspectStage(body.stage)) {
      return fail(400, "Stage is not valid.", "stage");
    }
    nextStage = body.stage;
    if (nextStage !== existing.stage) {
      stageChanged = true;
      updates.stage = nextStage;
    }
  }

  if ("status" in body) {
    if (!isProspectStatus(body.status)) {
      return fail(400, "Status must be active or archived.", "status");
    }
    updates.status = body.status as ProspectStatus;
  }

  // Auto-stamp last_contacted_at on a forward move out of interested/contacted.
  if (
    stageChanged &&
    nextStage &&
    PRE_PROGRESS_STAGES.has(existing.stage as ProspectStage) &&
    PROGRESSED_STAGES.has(nextStage)
  ) {
    updates.last_contacted_at = new Date().toISOString();
  }

  // Explicit "Mark Contacted" button just stamps the timestamp without
  // touching stage.
  if (body.mark_contacted === true) {
    updates.last_contacted_at = new Date().toISOString();
  }

  // Allow explicit override of last_contacted_at — null clears.
  if ("last_contacted_at" in body && body.last_contacted_at !== undefined) {
    if (body.last_contacted_at === null) {
      updates.last_contacted_at = null;
    } else if (typeof body.last_contacted_at === "string") {
      const d = new Date(body.last_contacted_at);
      if (Number.isNaN(d.getTime())) {
        return fail(
          400,
          "last_contacted_at must be ISO date string or null.",
          "last_contacted_at",
        );
      }
      updates.last_contacted_at = d.toISOString();
    } else {
      return fail(
        400,
        "last_contacted_at must be ISO date string or null.",
        "last_contacted_at",
      );
    }
  }

  if (Object.keys(updates).length === 0) {
    return fail(400, "No editable fields provided.");
  }

  updates.updated_at = new Date().toISOString();

  const { data: updated, error: updateError } = await admin
    .from("prospects")
    .update(updates)
    .eq("id", id)
    .select(
      "id, first_name, last_name, graduation_year, position, school, prospect_email, parent_first_name, parent_last_name, parent_email, parent_phone, source, stage, last_contacted_at, notes, converted_player_id, status, created_at, created_by, updated_at",
    )
    .maybeSingle();

  if (updateError) {
    console.error("[admin/prospects PATCH] update", updateError);
    return fail(500, updateError.message ?? "Update failed.");
  }
  if (!updated) return fail(404, "Prospect not found.");

  return NextResponse.json({ success: true, prospect: updated });
}
