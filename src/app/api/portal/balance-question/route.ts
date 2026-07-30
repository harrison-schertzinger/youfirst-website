import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readPortalSession } from "@/lib/portal-session";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { sendBalanceQuestionNotification } from "@/lib/balance-question-notify";
import type { PlayerBalanceRow } from "@/lib/portal-balance";

export const dynamic = "force-dynamic";

const MAX_MESSAGE_LENGTH = 2000;

// Two buckets. Per-session is the one the spec asks for; per-IP blunts someone
// cycling sessions from one machine.
const limitBySession = createRateLimiter(5, 10 * 60_000);
const limitByIp = createRateLimiter(15, 10 * 60_000);

/**
 * A parent asks about her balance.
 *
 * Hostile-input posture: this is public-facing free text on a page that handles
 * money. The message is length-capped, control characters are stripped, it is
 * stored as-is and HTML-escaped at both render sites (admin queue, notification
 * email). It is never interpolated into an email subject.
 *
 * The balance is snapshotted from `player_balances()` at submission time so the
 * record still makes sense after she pays.
 */
export async function POST(request: NextRequest) {
  const session = readPortalSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (
    limitBySession(session.guardianId) ||
    limitByIp(clientIp(request))
  ) {
    return NextResponse.json(
      { error: "That's a few too many in a row — give it a few minutes." },
      { status: 429 },
    );
  }

  let body: { playerId?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const playerId = typeof body.playerId === "string" ? body.playerId : "";
  if (!playerId) {
    return NextResponse.json({ error: "Missing player." }, { status: 400 });
  }

  const rawMessage = typeof body.message === "string" ? body.message : "";
  // Strip control characters, keeping tab and newline. Then trim and cap.
  const message = Array.from(rawMessage)
    .filter((ch) => {
      const c = ch.codePointAt(0) ?? 0;
      // Keep tab (9) and newline (10) so her line breaks survive; drop every
      // other C0 control char and DEL.
      if (c === 9 || c === 10) return true;
      return c >= 32 && c !== 127;
    })
    .join("")
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);

  if (message.length === 0) {
    return NextResponse.json(
      { error: "Please tell us what looks off." },
      { status: 400 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Scope the insert to this portal session: the guardian must actually be
  // linked to the player she is asking about.
  const { data: link, error: linkErr } = await admin
    .from("player_guardians")
    .select("player_id")
    .eq("player_id", playerId)
    .eq("guardian_id", session.guardianId)
    .maybeSingle();

  if (linkErr) {
    console.error("[portal/balance-question] link check failed:", linkErr);
    return NextResponse.json({ error: "Couldn’t send that." }, { status: 500 });
  }
  if (!link) {
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }

  const [{ data: player }, { data: balances }] = await Promise.all([
    admin
      .from("players")
      .select("first_name, last_name")
      .eq("id", playerId)
      .maybeSingle(),
    admin.rpc("player_balances", { p_player_id: playerId }),
  ]);

  const balance = (balances as PlayerBalanceRow[] | null)?.[0] ?? null;
  const playerName = player
    ? `${player.first_name} ${player.last_name}`
    : "Player";

  const { data: inserted, error: insertErr } = await admin
    .from("balance_questions")
    .insert({
      player_id: playerId,
      guardian_id: session.guardianId,
      guardian_email: session.email,
      message,
      charged_cents: balance?.charged_cents ?? null,
      paid_cents: balance?.paid_cents ?? null,
      adjustment_cents: balance?.adjustment_cents ?? null,
      remaining_cents: balance?.remaining_cents ?? null,
    })
    .select("id, created_at")
    .single();

  if (insertErr || !inserted) {
    console.error("[portal/balance-question] insert failed:", insertErr);
    return NextResponse.json({ error: "Couldn’t send that." }, { status: 500 });
  }

  // The row is committed and visible in the admin queue. The email is a ping,
  // so a Resend failure must not fail the parent's submission.
  const notify = await sendBalanceQuestionNotification({
    playerName,
    guardianEmail: session.email,
    message,
    chargedCents: balance?.charged_cents ?? null,
    paidCents: balance?.paid_cents ?? null,
    adjustmentCents: balance?.adjustment_cents ?? null,
    remainingCents: balance?.remaining_cents ?? null,
    submittedAt: new Date(inserted.created_at).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/New_York",
    }),
  });

  // Record the outcome on the row. Console-only was unauditable in production:
  // if the ping silently failed, the queue was the only thing that knew about
  // the question and nobody knew the email never went.
  const { error: auditErr } = await admin
    .from("balance_questions")
    .update({
      notify_status: notify.sent ? "sent" : "failed",
      notify_error: notify.sent ? null : (notify.error ?? "unknown").slice(0, 500),
      notified_at: new Date().toISOString(),
    })
    .eq("id", inserted.id);

  if (auditErr) {
    console.error("[portal/balance-question] notify audit failed:", auditErr);
  }
  if (!notify.sent) {
    console.error(
      "[portal/balance-question] notification not sent:",
      notify.error,
    );
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}
