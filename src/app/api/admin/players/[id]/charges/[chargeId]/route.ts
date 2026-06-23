import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function fail(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}

/**
 * Void an open charge (admin). Only 'open' charges can be voided — a 'paid'
 * charge is part of the ledger and is never disturbed.
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; chargeId: string }> },
): Promise<NextResponse> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return fail(403, "Not authorized.");
  }

  const { id: playerId, chargeId } = await context.params;
  if (!playerId || !chargeId) return fail(400, "Missing identifiers.");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail(500, "Service-role env vars not configured.");
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: voided, error } = await admin
    .from("player_charges")
    .update({ status: "void" })
    .eq("id", chargeId)
    .eq("player_id", playerId)
    .eq("status", "open")
    .select("id");

  if (error) {
    console.error("[admin/charges DELETE] failed:", error);
    return fail(500, "Couldn’t void the charge.");
  }
  if (!voided || voided.length === 0) {
    return fail(409, "Only an open charge can be voided.");
  }

  return NextResponse.json({ ok: true });
}
