import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { getServiceClient, resendConfig } from "@/lib/placement/config";
import { approvalPhrase, sendGroup, type SendMode } from "@/lib/placement/send";
import { isSendableTier } from "@/lib/placement/shared";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/placements/send  { tier, mode, confirmation? }
 *
 * The ONLY path that puts a placement email in front of a family, and it is
 * reachable only by an authenticated admin who clicked a button.
 *
 * WHAT THE CLIENT MAY DECIDE: which tier, and which of the three modes.
 * WHAT THE CLIENT MAY NOT DECIDE: who is in that tier. The recipient list is
 * derived from the database inside sendGroup on every call, so a stale or
 * tampered browser cannot add a name — including a declined or unplaced one.
 *
 * MODES:
 *   dry_run — writes the full log, calls nobody. No approval phrase needed.
 *   test    — renders every athlete in the group but delivers only to the
 *             signed-in admin. The destination is taken from the session, never
 *             from the request, so a test cannot be aimed at a family.
 *   live    — requires the exact approval phrase, typed.
 */
const MODES: readonly SendMode[] = ["dry_run", "test", "live"];

export async function POST(req: Request): Promise<NextResponse> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user?.email || !isEmailAllowed(user.email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const actor = user.email;

  let body: {
    tier?: unknown;
    mode?: unknown;
    confirmation?: unknown;
    athleteKey?: unknown;
    headerVariant?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const tier = typeof body.tier === "string" ? body.tier : "";
  if (!isSendableTier(tier)) {
    return NextResponse.json(
      { error: "Unknown or unsendable placement group." },
      { status: 400 },
    );
  }

  const mode = body.mode as SendMode;
  if (!MODES.includes(mode)) {
    return NextResponse.json({ error: "Unknown send mode." }, { status: 400 });
  }

  // The typed approval. Compared exactly, after trimming — a single button
  // click can never reach this branch.
  if (mode === "live") {
    const typed =
      typeof body.confirmation === "string" ? body.confirmation.trim() : "";
    if (typed !== approvalPhrase(tier)) {
      return NextResponse.json(
        {
          error: `To send this group, type exactly: ${approvalPhrase(tier)}`,
        },
        { status: 400 },
      );
    }
  }

  // A real send with no mail configured would silently log failures for the
  // whole group. Refuse up front instead, with the reason.
  if (mode !== "dry_run") {
    const cfg = resendConfig();
    if (!cfg.ok) {
      return NextResponse.json(
        { error: `Email is not configured: ${cfg.reason}` },
        { status: 503 },
      );
    }
  }

  const db = getServiceClient();
  if (!db) {
    return NextResponse.json(
      { error: "Service-role env vars not configured." },
      { status: 500 },
    );
  }

  try {
    const report = await sendGroup(db, {
      tier,
      mode,
      // Test sends land on the signed-in admin, taken from the session.
      testTo: mode === "test" ? actor : undefined,
      // Honoured in test mode only — sendGroup enforces that too, so a live
      // send can never be narrowed to one athlete and still look complete.
      athleteKey:
        mode === "test" && typeof body.athleteKey === "string"
          ? body.athleteKey
          : undefined,
      headerVariant:
        mode === "test" && typeof body.headerVariant === "string"
          ? body.headerVariant
          : null,
      actor,
    });
    return NextResponse.json(report);
  } catch (err) {
    console.error("[placements] send failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed." },
      { status: 500 },
    );
  }
}
