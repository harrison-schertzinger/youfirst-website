import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { runFullSync } from "@/lib/command-sheet/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/admin/roster-sheet — the "Sync Now" button.
 * Same engine as the cron, manual trigger; returns a plain-English result the
 * admin page shows verbatim (not a spinner that lies).
 */
export async function POST(): Promise<NextResponse> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const result = await runFullSync("manual");
  return NextResponse.json(result, { status: 200 });
}
