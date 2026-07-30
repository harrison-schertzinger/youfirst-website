import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readPortalSession } from "@/lib/portal-session";
import {
  isSelfLinkEnabled,
  SELF_LINK_DISABLED_MESSAGE,
} from "@/lib/portal-self-link";

export const dynamic = "force-dynamic";

/**
 * Roster directory for the "find your athlete" picker. Returns every active
 * player (non-PII: name, class year, team, position) so a logged-in parent
 * can locate and link to theirs. Requires a valid portal token.
 */
export async function GET(request: NextRequest) {
  const session = readPortalSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // With self-linking off there is nothing to pick, so the roster is not handed
  // out at all. This endpoint returned every active player's name, class year,
  // team and position to anyone holding the universal password — that directory
  // was the first half of the hole, and linking was the second.
  if (!isSelfLinkEnabled()) {
    return NextResponse.json({
      players: [],
      self_link_disabled: true,
      message: SELF_LINK_DISABLED_MESSAGE,
    });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin
    .from("players")
    .select("id, first_name, last_name, graduation_year, team_name, position")
    .eq("status", "active")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    console.error("[portal/players] fetch failed:", error);
    return NextResponse.json({ error: "Couldn’t load the roster." }, { status: 500 });
  }

  return NextResponse.json({ players: data ?? [] });
}
