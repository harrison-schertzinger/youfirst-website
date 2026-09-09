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

/**
 * The signed-in admin, or null. The allowlist is checked BEFORE the
 * service-role key is ever picked up, so an unauthorized caller never reaches
 * a client that bypasses RLS. Same order as every other /api/admin route.
 */
async function requireAdmin(): Promise<string | null> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user?.email || !isEmailAllowed(user.email)) return null;
  return user.email;
}

// ─── GET — the whole board ───────────────────────────────────────────────────
// All three columns in one read. The board is a few dozen cards at most; there
// is nothing here worth paginating and a partial board is a misleading board.

export async function GET(): Promise<NextResponse> {
  if (!(await requireAdmin())) return fail(403, "Not authorized.");

  const admin = getAdmin();
  if (!admin) return fail(500, "Service-role env vars not configured.");

  const { data, error } = await admin
    .from("war_room_cards")
    .select(CARD_COLUMNS)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/war-room GET]", error);
    return fail(500, "Failed to load the board.");
  }
  return NextResponse.json({ cards: data ?? [] });
}

// ─── POST — add a card ───────────────────────────────────────────────────────

interface PostBody {
  board_column?: unknown;
  title?: unknown;
  body?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const email = await requireAdmin();
  if (!email) return fail(403, "Not authorized.");

  let payload: PostBody;
  try {
    payload = (await request.json()) as PostBody;
  } catch {
    return fail(400, "Invalid JSON.");
  }

  if (!isBoardColumn(payload.board_column)) {
    return fail(400, "board_column must be a War Room column.", "board_column");
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  if (title.length === 0) {
    return fail(400, "A card needs a title.", "title");
  }
  if (title.length > TITLE_MAX) {
    return fail(400, `Title must be ${TITLE_MAX} characters or fewer.`, "title");
  }

  const rawBody = typeof payload.body === "string" ? payload.body.trim() : "";
  if (rawBody.length > BODY_MAX) {
    return fail(400, `Description must be ${BODY_MAX} characters or fewer.`, "body");
  }
  const body = rawBody.length === 0 ? null : rawBody;

  const admin = getAdmin();
  if (!admin) return fail(500, "Service-role env vars not configured.");

  const { data, error } = await admin
    .from("war_room_cards")
    // added_by comes from the SESSION, never from the request body — otherwise
    // anyone on the allowlist could post a card as someone else.
    .insert({ board_column: payload.board_column, title, body, added_by: email })
    .select(CARD_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[admin/war-room POST]", error);
    return fail(500, error?.message ?? "Failed to add the card.");
  }
  return NextResponse.json({ success: true, card: data });
}
