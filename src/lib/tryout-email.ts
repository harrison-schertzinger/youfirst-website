/**
 * Tryout confirmation email via Resend's HTTP API (no SDK dependency).
 * Fails soft: if RESEND_API_KEY is absent or the send errors, we log and
 * return { sent:false } so the payment + DB write still succeed. The parent
 * is never blocked on email.
 *
 * Required env to actually send:
 *   RESEND_API_KEY        — your Resend API key
 *   TRYOUT_FROM_EMAIL     — verified sender, e.g. "YOU. FIRST Lacrosse <noreply@youfirstlacrosse.com>"
 *                           (falls back to onboarding@resend.dev for testing)
 */

import { TRYOUT_FEE_LABEL, type TryoutDisplay } from "@/lib/tryouts";

// Replies land in a real inbox (Kathleen handles registration questions).
const REPLY_TO = "kathleen@youfirstlacrosse.com";

interface SendArgs {
  to: string;
  parentName: string;
  playerFullName: string;
  display: TryoutDisplay;
}

export async function sendTryoutConfirmationEmail({
  to,
  parentName,
  playerFullName,
  display,
}: SendArgs): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping tryout confirmation email.");
    return { sent: false, reason: "no_api_key" };
  }

  const from =
    process.env.TRYOUT_FROM_EMAIL ||
    "YOU. FIRST Lacrosse <onboarding@resend.dev>";

  const subject = `You're registered: ${playerFullName}'s YOU. FIRST tryout, ${display.dateLine}`;

  const html = buildHtml({ parentName, playerFullName, display });
  const text = buildText({ parentName, playerFullName, display });

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html, text, reply_to: REPLY_TO }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Resend tryout email failed:", res.status, detail);
      return { sent: false, reason: `resend_${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("Resend tryout email threw:", err);
    return { sent: false, reason: "exception" };
  }
}

function buildText({
  parentName,
  playerFullName,
  display,
}: Omit<SendArgs, "to">): string {
  return [
    `Hi ${parentName},`,
    ``,
    `We are glad to have her. ${playerFullName} is officially registered for YOU. FIRST 2026 tryouts, and your ${TRYOUT_FEE_LABEL} payment went through. Her spot is secured.`,
    ``,
    `TRYOUT (${display.typeLabel}): ${display.dateLine}`,
    `TIME: ${display.time}`,
    `LOCATION: ${display.location}`,
    ``,
    `What to expect: check-in opens 15 minutes early. She will warm up, play, and compete with our college-player coaching staff. Bring her stick, cleats, goggles, mouthguard, water, and a light and a dark shirt.`,
    ``,
    `We will be in touch with placement and next steps within a few days of her tryout. If anything comes up before then, just reply to this email and it will reach us.`,
    ``,
    `See you on the field,`,
    `YOU. FIRST Elite Lacrosse`,
  ].join("\n");
}

function buildHtml({
  parentName,
  playerFullName,
  display,
}: Omit<SendArgs, "to">): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
            <!-- Dark header -->
            <tr>
              <td style="background:#0a0a0b;padding:32px 32px 28px;text-align:center;">
                <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#ffffff;">
                  YOU<span style="color:#4B9CD3;">.</span> FIRST
                </div>
                <div style="margin-top:6px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.5);">
                  Elite Lacrosse · 2026 Tryouts
                </div>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${escapeHtml(parentName)},</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">
                  We are glad to have her. <strong>${escapeHtml(playerFullName)}</strong> is officially
                  registered for YOU. FIRST 2026 tryouts, and your <strong>${TRYOUT_FEE_LABEL}</strong>
                  payment went through. Her spot is secured.
                </p>

                <!-- Date card -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDF5FB;border:1px solid rgba(75,156,211,0.25);border-radius:12px;margin-bottom:24px;">
                  <tr>
                    <td style="padding:20px 24px;">
                      <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#4B9CD3;font-weight:600;">${escapeHtml(display.typeLabel)} Tryout</div>
                      <div style="font-size:24px;font-weight:800;color:#1a1a1a;margin-top:4px;">${escapeHtml(display.dateLine)}</div>
                      <div style="font-size:14px;color:#6b7280;margin-top:4px;">${escapeHtml(display.time)} · ${escapeHtml(display.location)}</div>
                    </td>
                  </tr>
                </table>

                <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#9ca3af;font-weight:600;margin-bottom:8px;">What to expect</div>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#374151;">
                  Check-in opens 15 minutes early. She will warm up, play, and compete with our
                  college-player coaching staff. Bring her stick, cleats, goggles, mouthguard,
                  water, and a light and a dark shirt.
                </p>

                <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#374151;">
                  We will be in touch with placement and next steps within a few days of her
                  tryout. If anything comes up before then, just reply to this email and it
                  will reach us.
                </p>

                <p style="margin:0;font-size:15px;line-height:1.6;color:#1a1a1a;">
                  See you on the field,<br/>
                  <strong>YOU. FIRST Elite Lacrosse</strong>
                </p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#0a0a0b;padding:18px 32px;text-align:center;">
                <div style="font-size:12px;color:rgba(255,255,255,0.4);">
                  YOU. FIRST Elite Lacrosse Club · Cincinnati, Ohio
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
