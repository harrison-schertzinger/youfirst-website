import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { BODY_MAX, TITLE_MAX, isBoardColumn } from "@/lib/war-room";

export const dynamic = "force-dynamic";

const CARD_COLUMNS = "id, board_column, title, body, added_by, created_at";

function fail(status: number, error: string, field?: string): NextResponse {
  return NextResponse.json(field ? { error, field } : { error }, { status });
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdmin(): Promise<string | null> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user?.email || !isEmailAllowed(user.email)) return null;
  return user.email;
}

// ─── PATCH — move a card between columns, or edit its text ───────────────────
// Moving IS the main verb here: a card is dragged from Ideas into Doing Now
// when it becomes real work, and that is a column change and nothing else.
//
// added_by is NOT patchable. Whoever put the card up put it up; a later editor
// does not inherit authorship, and there is no field in the request that can
// change it.

interface PatchBody {
  board_column?: unknown;
  title?: unknown;
  body?: unknown;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!(await requireAdmin())) return fail(403, "Not authorized.");
  const { id } = await context.params;

  let payload: PatchBody;
  try {
    payload = (await request.json()) as PatchBody;
  } catch {
    return fail(400, "Invalid JSON.");
  }

  const patch: Record<string, string | null> = {};

  if (payload.board_column !== undefined) {
    if (!isBoardColumn(payload.board_column)) {
      return fail(400, "board_column must be a War Room column.", "board_column");
    }
    patch.board_column = payload.board_column;
  }

  if (payload.title !== undefined) {
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    if (title.length === 0) return fail(400, "A card needs a title.", "title");
    if (title.length > TITLE_MAX) {
      return fail(400, `Title must be ${TITLE_MAX} characters or fewer.`, "title");
    }
    patch.title = title;
  }

  if (payload.body !== undefined) {
    const raw = typeof payload.body === "string" ? payload.body.trim() : "";
    if (raw.length > BODY_MAX) {
      return fail(400, `Description must be ${BODY_MAX} characters or fewer.`, "body");
    }
    patch.body = raw.length === 0 ? null : raw;
  }

  if (Object.keys(patch).length === 0) return fail(400, "Nothing to update.");
  patch.updated_at = new Date().toISOString();

  const admin = getAdmin();
  if (!admin) return fail(500, "Service-role env vars not configured.");

  const { data, error } = await admin
    .from("war_room_cards")
    .update(patch)
    .eq("id", id)
    // An already-archived card must not be silently resurrected by an edit.
    .is("archived_at", null)
    .select(CARD_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("[admin/war-room PATCH]", error);
    return fail(500, error.message);
  }
  // A write that matches no row returns no error and no data — the silent
  // failure this codebase treats as a first-class bug. Say so out loud.
  if (!data) return fail(404, "That card no longer exists.");

  return NextResponse.json({ success: true, card: data });
}

// ─── DELETE — archive a card ─────────────────────────────────────────────────
// Soft delete. A shared whiteboard gets cleared by someone else's accident, and
// a stamped archived_at means the row is recoverable by hand.

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!(await requireAdmin())) return fail(403, "Not authorized.");
  const { id } = await context.params;

  const admin = getAdmin();
  if (!admin) return fail(500, "Service-role env vars not configured.");

  const { data, error } = await admin
    .from("war_room_cards")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin/war-room DELETE]", error);
    return fail(500, error.message);
  }
  if (!data) return fail(404, "That card no longer exists.");

  return NextResponse.json({ success: true });
}
