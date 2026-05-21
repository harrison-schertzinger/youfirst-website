import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import {
  isProspectStage,
  isProspectStatus,
  type ProspectStage,
  type ProspectStatus,
} from "@/lib/prospects";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PostBody {
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
}

function fail(status: number, error: string, field?: string): NextResponse {
  return NextResponse.json(
    field ? { error, field } : { error },
    { status },
  );
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

// ─── GET — list prospects ─────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
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

  const params = request.nextUrl.searchParams;
  const stage = params.get("stage");
  const statusParam = params.get("status") ?? "active";
  const status: ProspectStatus = isProspectStatus(statusParam)
    ? statusParam
    : "active";

  let q = admin
    .from("prospects")
    .select(
      "id, first_name, last_name, graduation_year, position, school, prospect_email, parent_first_name, parent_last_name, parent_email, parent_phone, source, stage, last_contacted_at, notes, converted_player_id, status, created_at, created_by, updated_at",
    )
    .eq("status", status)
    .order("last_contacted_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (stage && isProspectStage(stage)) q = q.eq("stage", stage);

  const { data: rows, error } = await q;
  if (error) {
    console.error("[admin/prospects GET]", error);
    return fail(500, "Failed to load prospects.");
  }
  return NextResponse.json({ prospects: rows ?? [] });
}

// ─── POST — create prospect ───────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  const first_name = asTrimmedString(body.first_name);
  if (!first_name) return fail(400, "First name is required.", "first_name");
  const last_name = asTrimmedString(body.last_name);
  if (!last_name) return fail(400, "Last name is required.", "last_name");

  let graduation_year: number | null = null;
  if (body.graduation_year !== undefined && body.graduation_year !== null && body.graduation_year !== "") {
    const n = Number(body.graduation_year);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 2024 || n > 2040) {
      return fail(400, "Graduation year must be 2024–2040.", "graduation_year");
    }
    graduation_year = n;
  }

  const position = asTrimmedString(body.position);
  const school = asTrimmedString(body.school);

  const prospect_email = asTrimmedString(body.prospect_email);
  if (prospect_email && !EMAIL_RE.test(prospect_email)) {
    return fail(400, "Prospect email is not valid.", "prospect_email");
  }

  const parent_first_name = asTrimmedString(body.parent_first_name);
  const parent_last_name = asTrimmedString(body.parent_last_name);
  const parent_email_raw = asTrimmedString(body.parent_email);
  const parent_email = parent_email_raw ? parent_email_raw.toLowerCase() : null;
  if (parent_email && !EMAIL_RE.test(parent_email)) {
    return fail(400, "Parent email is not valid.", "parent_email");
  }

  const parent_phone = asTrimmedString(body.parent_phone);
  const source = asTrimmedString(body.source);

  let stage: ProspectStage = "interested";
  if (body.stage !== undefined && body.stage !== null && body.stage !== "") {
    if (!isProspectStage(body.stage)) {
      return fail(400, "Stage is not valid.", "stage");
    }
    stage = body.stage;
  }

  const notes = asTrimmedString(body.notes);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail(500, "Service-role env vars not configured.");
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: inserted, error: insertError } = await admin
    .from("prospects")
    .insert({
      first_name,
      last_name,
      graduation_year,
      position,
      school,
      prospect_email,
      parent_first_name,
      parent_last_name,
      parent_email,
      parent_phone,
      source,
      stage,
      notes,
      created_by: user.email,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[admin/prospects POST]", insertError);
    return fail(500, insertError?.message ?? "Failed to create prospect.");
  }

  return NextResponse.json({ success: true, prospect_id: inserted.id });
}
