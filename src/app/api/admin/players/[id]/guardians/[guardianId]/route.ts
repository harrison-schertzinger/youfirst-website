import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function fail(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; guardianId: string }> },
): Promise<NextResponse> {
  const { id: player_id, guardianId: guardian_id } = await context.params;
  if (
    !player_id ||
    !guardian_id ||
    typeof player_id !== "string" ||
    typeof guardian_id !== "string"
  ) {
    return fail(400, "Missing player_id or guardian_id.");
  }

  // ── Auth ────────────────────────────────────────────────────────────────
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return fail(403, "Not authorized.");
  }

  // ── Service-role client ────────────────────────────────────────────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail(500, "Service-role env vars not configured.");
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Look up the link first so we know whether to re-elect a primary.
  const { data: link, error: lookupErr } = await admin
    .from("player_guardians")
    .select("player_id, guardian_id, is_primary")
    .eq("player_id", player_id)
    .eq("guardian_id", guardian_id)
    .maybeSingle();
  if (lookupErr) {
    console.error("[admin/.../guardians/[id] DELETE] lookup failed:", lookupErr);
    return fail(500, "Lookup failed.");
  }
  if (!link) return fail(404, "Link not found.");

  // NEVER delete the guardian row itself — guardians can be shared across
  // siblings, and the row may be referenced by payment history. We only
  // unlink the player ↔ guardian relationship.
  const { error: deleteErr } = await admin
    .from("player_guardians")
    .delete()
    .eq("player_id", player_id)
    .eq("guardian_id", guardian_id);
  if (deleteErr) {
    console.error("[admin/.../guardians/[id] DELETE] delete failed:", deleteErr);
    return fail(500, deleteErr.message ?? "Delete failed.");
  }

  let new_primary_id: string | null = null;
  if (link.is_primary) {
    // Re-elect: pick the oldest remaining link as the new primary.
    const { data: remaining } = await admin
      .from("player_guardians")
      .select("guardian_id, created_at")
      .eq("player_id", player_id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (remaining && remaining.length > 0) {
      new_primary_id = remaining[0].guardian_id;
      const { error: promoteErr } = await admin
        .from("player_guardians")
        .update({ is_primary: true })
        .eq("player_id", player_id)
        .eq("guardian_id", new_primary_id);
      if (promoteErr) {
        console.error("[admin/.../guardians/[id] DELETE] promote failed:", promoteErr);
        // The unlink itself succeeded; surface promotion failure but
        // don't roll back. UI will show no-primary state until fixed.
        return NextResponse.json({
          unlinked: true,
          new_primary_id: null,
          promote_failed: true,
        });
      }
    }
  }

  return NextResponse.json({ unlinked: true, new_primary_id });
}
