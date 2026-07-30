import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { buildRosterData, getServiceClient } from "@/lib/rosters/data";

export const dynamic = "force-dynamic";

// Snapshot read for the roster screen's quiet refresh — same assembly the
// server page uses, so a poll can never disagree with a full load.
export async function GET(): Promise<NextResponse> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const admin = getServiceClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Service-role env vars not configured." },
      { status: 500 },
    );
  }

  try {
    const data = await buildRosterData(admin);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
