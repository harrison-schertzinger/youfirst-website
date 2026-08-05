import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { getServiceClient } from "@/lib/placement/config";
import { sendableAthletes } from "@/lib/placement/audience";
import { describeAddressSource } from "@/lib/placement/address";
import { buildRosterData } from "@/lib/rosters/data";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/placements/address?athleteKey=…
 *
 * Which record supplies this athlete's email, and who else reads it. Pure read.
 *
 * THIS EXISTS SO THE DISCLOSURE ARRIVES BEFORE THE DECISION. Correcting an
 * address can change it for a sibling — Madi and Elise Swartz share both
 * guardian rows — and until this route existed the operator was told so in the
 * result panel, after the write had already been committed. That is a receipt,
 * not a choice. The drawer now calls this when it opens, so "this also changes
 * it for Elise Swartz" is on screen while the address field is still editable.
 *
 * A GET, deliberately, where the sibling routes are POSTs. Everything reachable
 * from here is a read, and the method is the cheapest way to say so to a
 * reviewer, to a replayed request, and to anyone reaching for this route later
 * looking for somewhere convenient to hang a write. It is not the place.
 *
 * FAILS LOUD. describeAddressSource throws when it cannot enumerate who shares a
 * guardian row, and this route passes that through as a 500 rather than
 * answering with an empty list. An empty alsoAffects has to mean "nobody else
 * reads this record", never "we could not find out" — the drawer renders the two
 * very differently, and the second one must not be able to impersonate the first.
 */
export async function GET(req: Request): Promise<NextResponse> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user?.email || !isEmailAllowed(user.email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const athleteKey = (
    new URL(req.url).searchParams.get("athleteKey") ?? ""
  ).trim();
  if (!athleteKey) {
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
    const roster = await buildRosterData(db);
    const athlete = sendableAthletes(roster.athletes).find(
      (a) => a.key === athleteKey,
    );
    if (!athlete) {
      return NextResponse.json(
        { error: "That athlete is not in the placed audience." },
        { status: 404 },
      );
    }

    const source = await describeAddressSource(db, athlete);
    return NextResponse.json({
      kind: source.kind,
      label: source.label,
      alsoAffects: source.alsoAffects,
      onFile: athlete.email,
    });
  } catch (err) {
    console.error("[placements] address source failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not read the address source.",
      },
      { status: 500 },
    );
  }
}
