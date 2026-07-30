import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { getServiceClient } from "@/lib/placement/config";
import { buildAudience } from "@/lib/placement/audience";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/placements
 * Every placed athlete, grouped by what she was placed into, with the exact
 * recipient list for each group and a named list of everyone being skipped.
 * Read-only.
 */
export async function GET(): Promise<NextResponse> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user?.email || !isEmailAllowed(user.email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const db = getServiceClient();
  if (!db) {
    return NextResponse.json(
      { error: "Service-role env vars not configured." },
      { status: 500 },
    );
  }

  try {
    const audience = await buildAudience(db);
    return NextResponse.json({ ...audience, actor: user.email });
  } catch (err) {
    console.error("[placements] audience failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Audience build failed." },
      { status: 500 },
    );
  }
}
