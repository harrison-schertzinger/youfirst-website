import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { isExpenseCategory } from "@/lib/expense-categories";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["active", "archived"] as const;
type ExpenseStatus = (typeof ALLOWED_STATUSES)[number];

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

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface PatchBody {
  expense_date?: unknown;
  category?: unknown;
  description?: unknown;
  amount_cents?: unknown;
  vendor?: unknown;
  tournament_id?: unknown;
  player_id?: unknown;
  notes?: unknown;
  status?: unknown;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!id || typeof id !== "string") return fail(400, "Missing expense id.");

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
    expense_date?: string;
    category?: string;
    description?: string;
    amount_cents?: number;
    vendor?: string | null;
    tournament_id?: string | null;
    player_id?: string | null;
    notes?: string | null;
    status?: ExpenseStatus;
  } = {};

  if ("expense_date" in body) {
    const v = asNullableString(body.expense_date);
    if (v === undefined || v === null) {
      return fail(400, "expense_date must be YYYY-MM-DD.", "expense_date");
    }
    if (!isValidDate(v)) {
      return fail(400, "expense_date must be a valid YYYY-MM-DD date.", "expense_date");
    }
    updates.expense_date = v;
  }
  if ("category" in body) {
    if (!isExpenseCategory(body.category)) {
      return fail(400, "category must be a known expense category.", "category");
    }
    updates.category = body.category;
  }
  if ("description" in body) {
    const v = asNullableString(body.description);
    if (v === undefined || v === null) {
      return fail(400, "description is required.", "description");
    }
    if (v.length > 300) {
      return fail(400, "description must be 1–300 characters.", "description");
    }
    updates.description = v;
  }
  if ("amount_cents" in body) {
    const n = Number(body.amount_cents);
    if (
      !Number.isFinite(n) ||
      !Number.isInteger(n) ||
      n <= 0
    ) {
      return fail(400, "amount_cents must be a positive integer.", "amount_cents");
    }
    if (n > 5_000_000) {
      return fail(400, "amount_cents cannot exceed $50,000.", "amount_cents");
    }
    updates.amount_cents = n;
  }
  if ("vendor" in body) {
    const v = asNullableString(body.vendor);
    if (v === undefined) return fail(400, "vendor must be a string or null.", "vendor");
    updates.vendor = v;
  }
  if ("tournament_id" in body) {
    const v = asNullableString(body.tournament_id);
    if (v === undefined) {
      return fail(400, "tournament_id must be a string or null.", "tournament_id");
    }
    updates.tournament_id = v;
  }
  if ("player_id" in body) {
    const v = asNullableString(body.player_id);
    if (v === undefined) {
      return fail(400, "player_id must be a string or null.", "player_id");
    }
    updates.player_id = v;
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
    updates.status = body.status as ExpenseStatus;
  }

  if (Object.keys(updates).length === 0) {
    return fail(400, "No editable fields provided.");
  }

  const admin = getAdmin();
  if (!admin) return fail(500, "Service-role env vars not configured.");

  const { data: updated, error: updateError } = await admin
    .from("expenses")
    .update(updates)
    .eq("id", id)
    .select(
      "id, expense_date, category, description, amount_cents, vendor, season, tournament_id, player_id, notes, status, created_by, created_at",
    )
    .maybeSingle();

  if (updateError) {
    console.error("[admin/expenses/[id] PATCH]", updateError);
    return fail(500, updateError.message ?? "Update failed.");
  }
  if (!updated) return fail(404, "Expense not found.");
  return NextResponse.json({ success: true, expense: updated });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!id || typeof id !== "string") return fail(400, "Missing expense id.");

  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return fail(403, "Not authorized.");
  }

  const admin = getAdmin();
  if (!admin) return fail(500, "Service-role env vars not configured.");

  // Look up first so we can return 404 cleanly instead of "0 rows deleted, ok".
  const { data: existing } = await admin
    .from("expenses")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return fail(404, "Expense not found.");

  const { error: deleteError } = await admin
    .from("expenses")
    .delete()
    .eq("id", id);
  if (deleteError) {
    console.error("[admin/expenses/[id] DELETE]", deleteError);
    return fail(500, deleteError.message ?? "Delete failed.");
  }
  return NextResponse.json({ success: true, deleted: id });
}
