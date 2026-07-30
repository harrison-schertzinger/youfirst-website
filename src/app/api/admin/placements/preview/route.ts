import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { getServiceClient } from "@/lib/placement/config";
import { previewAthlete } from "@/lib/placement/send";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/placements/preview  { athleteKey }
 *
 * One athlete's email, fully rendered with her real merge values and the real
 * confirmation link she would receive. Sends nothing.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user?.email || !isEmailAllowed(user.email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: { athleteKey?: unknown };
  try {
    body = (await req.json()) as { athleteKey?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const athleteKey = body.athleteKey;
  if (typeof athleteKey !== "string" || !athleteKey) {
    return NextResponse.json({ error: "Missing athleteKey." }, { status: 400 });
  }

  const db = getServiceClient();
  if (!db) {
    return NextResponse.json(
      { error: "Service-role env vars not configured." },
      { status: 500 },
    );
  }

  try {
    const preview = await previewAthlete(db, athleteKey);
    if (!preview) {
      return NextResponse.json(
        { error: "That athlete is not in the placed audience." },
        { status: 404 },
      );
    }
    return NextResponse.json(preview);
  } catch (err) {
    console.error("[placements] preview failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Preview failed." },
      { status: 500 },
    );
  }
}
