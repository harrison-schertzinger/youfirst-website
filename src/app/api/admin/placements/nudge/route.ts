import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { getServiceClient, resendConfig } from "@/lib/placement/config";
import { sendNudges, type SendMode } from "@/lib/placement/send";
import { NUDGE_DAYS, type NudgeDay } from "@/lib/placement/shared";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/placements/nudge  { day, mode, confirmation? }
 *
 * The day-4 and day-7 reminder to anyone still unconfirmed. Deliberately NOT
 * on a schedule: there is no cron entry anywhere in this sprint. Harrison
 * decides a nudge goes out, the same way he decides a placement does.
 *
 * A family that has confirmed is excluded by placement_tokens.confirmed_at,
 * so a confirmation always beats a nudge no matter when it arrived.
 */
const MODES: readonly SendMode[] = ["dry_run", "test", "live"];

const APPROVAL = "SEND NUDGE";

export async function POST(req: Request): Promise<NextResponse> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user?.email || !isEmailAllowed(user.email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const actor = user.email;

  let body: { day?: unknown; mode?: unknown; confirmation?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const day = Number(body.day) as NudgeDay;
  if (!(NUDGE_DAYS as readonly number[]).includes(day)) {
    return NextResponse.json(
      { error: `Nudge day must be one of: ${NUDGE_DAYS.join(", ")}.` },
      { status: 400 },
    );
  }

  const mode = body.mode as SendMode;
  if (!MODES.includes(mode)) {
    return NextResponse.json({ error: "Unknown send mode." }, { status: 400 });
  }

  if (mode === "live") {
    const typed =
      typeof body.confirmation === "string" ? body.confirmation.trim() : "";
    if (typed !== APPROVAL) {
      return NextResponse.json(
        { error: `To send the nudge, type exactly: ${APPROVAL}` },
        { status: 400 },
      );
    }
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
    const report = await sendNudges(db, {
      day,
      mode,
      testTo: mode === "test" ? actor : undefined,
      actor,
    });
    return NextResponse.json(report);
  } catch (err) {
    console.error("[placements] nudge failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Nudge failed." },
      { status: 500 },
    );
  }
}
