import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { isExpenseCategory } from "@/lib/expense-categories";

export const dynamic = "force-dynamic";

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
  expense_date?: unknown;
  category?: unknown;
  description?: unknown;
  amount_cents?: unknown;
  vendor?: unknown;
  season?: unknown;
  tournament_id?: unknown;
  player_id?: unknown;
  notes?: unknown;
}

// ─── GET — list expenses ──────────────────────────────────────────────────────

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
  const season = params.get("season") ?? "2025-26";
  const status = params.get("status") ?? "active";
  const category = params.get("category");
  const tournamentId = params.get("tournament_id");
  const playerId = params.get("player_id");

  let q = admin
    .from("expenses")
    .select(
      "id, expense_date, category, description, amount_cents, vendor, season, tournament_id, player_id, notes, status, created_by, created_at",
    )
    .eq("season", season)
    .eq("status", status)
    .order("expense_date", { ascending: false });

  if (category) q = q.eq("category", category);
  if (tournamentId) q = q.eq("tournament_id", tournamentId);
  if (playerId) q = q.eq("player_id", playerId);

  const { data: rows, error } = await q;
  if (error) {
    console.error("[admin/expenses GET]", error);
    return fail(500, "Failed to load expenses.");
  }
  return NextResponse.json({ expenses: rows ?? [] });
}

// ─── POST — create expense ────────────────────────────────────────────────────

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

  const expense_date = asTrimmedString(body.expense_date);
  if (!expense_date) {
    return fail(400, "expense_date is required (YYYY-MM-DD).", "expense_date");
  }
  if (!isValidDate(expense_date)) {
    return fail(400, "expense_date must be a valid YYYY-MM-DD date.", "expense_date");
  }

  if (!isExpenseCategory(body.category)) {
    return fail(400, "category must be a known expense category.", "category");
  }
  const category = body.category;

  const description = asTrimmedString(body.description);
  if (!description) {
    return fail(400, "description is required.", "description");
  }
  if (description.length > 300) {
    return fail(400, "description must be 1–300 characters.", "description");
  }

  const amount_cents = Number(body.amount_cents);
  if (
    !Number.isFinite(amount_cents) ||
    !Number.isInteger(amount_cents) ||
    amount_cents <= 0
  ) {
    return fail(400, "amount_cents must be a positive integer.", "amount_cents");
  }
  if (amount_cents > 5_000_000) {
    return fail(400, "amount_cents cannot exceed $50,000.", "amount_cents");
  }

  const vendor = asTrimmedString(body.vendor);

  const season = asTrimmedString(body.season) ?? "2025-26";

  const tournament_id =
    body.tournament_id === null || body.tournament_id === undefined
      ? null
      : typeof body.tournament_id === "string"
        ? asTrimmedString(body.tournament_id)
        : "__bad__";
  if (tournament_id === "__bad__") {
    return fail(400, "tournament_id must be a string or null.", "tournament_id");
  }

  const player_id =
    body.player_id === null || body.player_id === undefined
      ? null
      : typeof body.player_id === "string"
        ? asTrimmedString(body.player_id)
        : "__bad__";
  if (player_id === "__bad__") {
    return fail(400, "player_id must be a string or null.", "player_id");
  }

  const notes = asTrimmedString(body.notes);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail(500, "Service-role env vars not configured.");
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: inserted, error: insertError } = await admin
    .from("expenses")
    .insert({
      expense_date,
      category,
      description,
      amount_cents,
      vendor,
      season,
      tournament_id,
      player_id,
      notes,
      created_by: user.email,
      // status defaults to 'active' in the DB
    })
    .select(
      "id, expense_date, category, description, amount_cents, vendor, season, tournament_id, player_id, notes, status, created_by, created_at",
    )
    .single();

  if (insertError || !inserted) {
    console.error("[admin/expenses POST]", insertError);
    return fail(500, insertError?.message ?? "Failed to create expense.");
  }
  return NextResponse.json({ success: true, expense: inserted });
}
