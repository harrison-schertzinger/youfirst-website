import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { sendAdminNotification, adminSubject } from "@/lib/admin-notify";

export const dynamic = "force-dynamic";

/**
 * Resend delivery-event webhook.
 *
 * Why this exists: a Resend 2xx at send time means "accepted", not "delivered".
 * A hard bounce arrives minutes later. Without this endpoint a dead mailbox is
 * indistinguishable from a family ignoring us — and Wave 1 went out to 30
 * addresses, so that distinction is the difference between chasing the right
 * people and chasing the wrong ones.
 *
 * Configure in Resend → Webhooks:
 *   URL     https://www.youfirstlacrosse.com/api/resend/webhook
 *   Events  email.delivered, email.bounced, email.complained,
 *           email.delivery_delayed
 *   Then put the signing secret in Vercel as RESEND_WEBHOOK_SECRET.
 *
 * SECURITY: fails CLOSED. With no secret configured, or on a bad signature,
 * nothing is written and nothing is emailed — an unauthenticated caller must
 * not be able to make us email Harrison, nor flag a real family's email as
 * bounced. Resend signs with Svix headers; verified here with node:crypto so
 * no extra dependency is needed.
 */

const RELEVANT = new Set([
  "email.delivered",
  "email.bounced",
  "email.complained",
  "email.delivery_delayed",
]);

const STATUS_BY_EVENT: Record<string, string> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.delivery_delayed": "delivery_delayed",
};

/**
 * Svix signature check.
 *
 * Signed content is `${id}.${timestamp}.${rawBody}`, HMAC-SHA256 with the
 * base64-decoded secret (the part after `whsec_`), compared base64. The header
 * may carry several space-separated `v1,<sig>` values during rotation — any
 * match is valid. Comparison is constant-time.
 */
function verifySvix(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string,
): { ok: boolean; reason?: string } {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return { ok: false, reason: "missing svix headers" };

  // Reject stale/skewed timestamps to blunt replay (5 minute window).
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: "bad timestamp" };
  const ageSeconds = Math.abs(Date.now() / 1000 - ts);
  if (ageSeconds > 300) return { ok: false, reason: "timestamp outside tolerance" };

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto
    .createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);

  for (const part of signature.split(" ")) {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) continue;
    const candidate = Buffer.from(value);
    if (
      candidate.length === expectedBuf.length &&
      crypto.timingSafeEqual(candidate, expectedBuf)
    ) {
      return { ok: true };
    }
  }
  return { ok: false, reason: "signature mismatch" };
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend/webhook] RESEND_WEBHOOK_SECRET not set — refusing");
    return NextResponse.json(
      { error: "Webhook not configured." },
      { status: 503 },
    );
  }

  // Raw body, byte-for-byte — the signature covers exactly these bytes.
  const rawBody = await request.text();

  const verdict = verifySvix(
    rawBody,
    {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    },
    secret,
  );
  if (!verdict.ok) {
    console.error("[resend/webhook] rejected:", verdict.reason);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: {
    type?: string;
    data?: {
      email_id?: string;
      to?: string[] | string;
      subject?: string;
      bounce?: { type?: string; subType?: string; message?: string };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const type = event.type ?? "";
  // Ack anything we don't act on so Resend stops retrying.
  if (!RELEVANT.has(type)) {
    return NextResponse.json({ received: true, ignored: type });
  }

  const resendId = event.data?.email_id;
  if (!resendId) {
    return NextResponse.json({ received: true, skipped: "no_email_id" });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    // Transient from Resend's perspective — let it retry.
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const status = STATUS_BY_EVENT[type];
  const bounce = event.data?.bounce;

  const { data: updated, error: updateErr } = await admin
    .from("hermes_email_deliveries")
    .update({
      status,
      bounce_type: bounce?.subType ?? bounce?.type ?? null,
      bounce_message: bounce?.message?.slice(0, 500) ?? null,
      last_event_at: new Date().toISOString(),
    })
    .eq("resend_id", resendId)
    .select("id, recipient_email, player_id, status")
    .maybeSingle();

  if (updateErr) {
    console.error("[resend/webhook] update failed:", updateErr);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  // Wave 1 (cycle_key closeout-w1) was sent before message ids were captured,
  // so its events have no row to land on. Acknowledge rather than retry.
  if (!updated) {
    return NextResponse.json({
      received: true,
      skipped: "unknown_message_id",
      note: "pre-dates delivery tracking (e.g. Wave 1)",
    });
  }

  // Only a real failure is worth interrupting someone for. A delivery
  // confirmation is recorded silently.
  if (type !== "email.bounced" && type !== "email.complained") {
    return NextResponse.json({ received: true, status });
  }

  // Name the family — a bare address is not actionable.
  let playerName = "Unknown player";
  let subhead = "";
  if (updated.player_id) {
    const { data: player } = await admin
      .from("players")
      .select("first_name, last_name, graduation_year, team_name")
      .eq("id", updated.player_id)
      .maybeSingle();
    if (player) {
      playerName = `${player.first_name} ${player.last_name}`;
      subhead = [player.team_name, player.graduation_year ? `Class of ${player.graduation_year}` : null]
        .filter(Boolean)
        .join(" · ");
    }
  }

  const isComplaint = type === "email.complained";
  const action = isComplaint ? "Marked as spam" : "Delivery failed";

  const notify = await sendAdminNotification({
    subject: adminSubject(action, playerName, updated.recipient_email),
    headline: playerName,
    subhead: subhead || undefined,
    rows: [
      { label: "Address", value: updated.recipient_email },
      { label: "Event", value: isComplaint ? "Marked as spam" : "Bounced" },
      ...(bounce?.subType || bounce?.type
        ? [{ label: "Reason", value: bounce.subType ?? bounce.type ?? "" }]
        : []),
    ],
    paragraphs: [
      isComplaint
        ? "This family marked our email as spam. Do not re-send to this address — reach out another way."
        : "This address did not accept the email, so this family has NOT been told what they owe. Check the address and contact them another way.",
      ...(bounce?.message ? [bounce.message] : []),
    ],
    footnote:
      "Recorded in hermes_email_deliveries. Wave 1 was sent before delivery tracking existed, so its bounces cannot be attributed.",
  });

  if (!notify.sent) {
    console.error("[resend/webhook] admin notify failed:", notify.error);
  }

  return NextResponse.json({ received: true, status, notified: notify.sent });
}
