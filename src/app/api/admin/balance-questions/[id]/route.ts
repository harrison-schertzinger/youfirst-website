import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const MAX_NOTE_LENGTH = 1000;

/**
 * Mark a balance question resolved (or reopen it). Records WHO resolved it from
 * the authenticated admin session — never from the request body.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing question id." }, { status: 400 });
  }

  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: { status?: unknown; resolution_note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.status !== "resolved" && body.status !== "new") {
    return NextResponse.json(
      { error: "status must be 'resolved' or 'new'." },
      { status: 400 },
    );
  }

  const note =
    typeof body.resolution_note === "string"
      ? body.resolution_note.trim().slice(0, MAX_NOTE_LENGTH) || null
      : null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Service-role env vars not configured." },
      { status: 500 },
    );
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const patch =
    body.status === "resolved"
      ? {
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolved_by: user.email,
          resolution_note: note,
        }
      : {
          status: "new",
          resolved_at: null,
          resolved_by: null,
          resolution_note: null,
        };

  const { data, error } = await admin
    .from("balance_questions")
    .update(patch)
    .eq("id", id)
    .select("id, status, resolved_at, resolved_by, resolution_note")
    .maybeSingle();

  if (error) {
    console.error("[admin/balance-questions PATCH]", error);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  return NextResponse.json({ question: data });
}
