import { NextRequest, NextResponse } from "next/server";
import { runFullSync } from "@/lib/command-sheet/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * GET /api/cron/roster-sheet
 * Vercel Cron target — 10:00 and 22:00 UTC (6 AM / 6 PM Eastern through the
 * season; one hour of winter drift is accepted, see the setup doc). The cron
 * is the safety net; registration/confirmation/webhook pings mirror rows in
 * real time between runs.
 *
 * When CRON_SECRET is set in Vercel, requests must carry it — Vercel's cron
 * invoker does this automatically. Without the env var the route still runs
 * (fail-open is fine: a stray GET just triggers an idempotent sync).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    }
  }

  const result = await runFullSync("cron");
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
