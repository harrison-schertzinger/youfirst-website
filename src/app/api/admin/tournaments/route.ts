import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["active", "cancelled", "completed"] as const;

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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

interface PostBody {
  name?: unknown;
  location?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  season?: unknown;
  notes?: unknown;
}

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
  // Default: active only, ordered by start_date.
  const statusFilter = params.get("status") ?? "active";

  let q = admin
    .from("tournaments")
    .select(
      "id, name, location, start_date, end_date, season, notes, status, created_at",
    )
    .order("start_date", { ascending: true, nullsFirst: false });

  if (statusFilter !== "all") {
    q = q.eq("status", statusFilter);
  }

  const { data: rows, error } = await q;
  if (error) {
    console.error("[admin/tournaments GET]", error);
    return fail(500, "Failed to load tournaments.");
  }
  return NextResponse.json({ tournaments: rows ?? [] });
}

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

  const name = asTrimmedString(body.name);
  if (!name) return fail(400, "name is required.", "name");
  if (name.length > 200) {
    return fail(400, "name must be 200 characters or fewer.", "name");
  }

  const location = asTrimmedString(body.location);

  let start_date: string | null = null;
  if (body.start_date !== undefined && body.start_date !== null && body.start_date !== "") {
    const v = asTrimmedString(body.start_date);
    if (!v || !isValidDate(v)) {
      return fail(400, "start_date must be YYYY-MM-DD.", "start_date");
    }
    start_date = v;
  }

  let end_date: string | null = null;
  if (body.end_date !== undefined && body.end_date !== null && body.end_date !== "") {
    const v = asTrimmedString(body.end_date);
    if (!v || !isValidDate(v)) {
      return fail(400, "end_date must be YYYY-MM-DD.", "end_date");
    }
    end_date = v;
  }

  if (start_date && end_date && start_date > end_date) {
    return fail(400, "end_date must be on or after start_date.", "end_date");
  }

  const season = asTrimmedString(body.season) ?? "2025-26";
  const notes = asTrimmedString(body.notes);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail(500, "Service-role env vars not configured.");
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: inserted, error: insertError } = await admin
    .from("tournaments")
    .insert({ name, location, start_date, end_date, season, notes })
    .select(
      "id, name, location, start_date, end_date, season, notes, status, created_at",
    )
    .single();

  if (insertError || !inserted) {
    console.error("[admin/tournaments POST]", insertError);
    return fail(500, insertError?.message ?? "Failed to create tournament.");
  }

  return NextResponse.json({ success: true, tournament: inserted });
}

export { ALLOWED_STATUSES };
