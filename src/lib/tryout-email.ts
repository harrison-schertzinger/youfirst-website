/**
 * Tryout confirmation email via Resend's HTTP API (no SDK dependency).
 * Fails soft: if RESEND_API_KEY is absent or the send errors, we log and
 * return { sent:false } so the payment + DB write still succeed. The parent
 * is never blocked on email.
 *
 * Required env to actually send:
 *   RESEND_API_KEY        — your Resend API key
 *   TRYOUT_FROM_EMAIL     — verified sender, e.g. "YOU. FIRST Lacrosse <tryouts@youfirstlacrosse.com>"
 *                           (falls back to onboarding@resend.dev for testing)
 */

import { TRYOUT_FEE_LABEL, type TryoutDate } from "@/lib/tryouts";

interface SendArgs {
  to: string;
  parentName: string;
  playerFullName: string;
  tryout: TryoutDate;
}

export async function sendTryoutConfirmationEmail({
  to,
  parentName,
  playerFullName,
  tryout,
}: SendArgs): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping tryout confirmation email.");
    return { sent: false, reason: "no_api_key" };
  }

  const from =
    process.env.TRYOUT_FROM_EMAIL ||
    "YOU. FIRST Lacrosse <onboarding@resend.dev>";

  const subject = `You're registered — ${playerFullName}'s YOU. FIRST tryout (${tryout.fullLabel})`;

  const html = buildHtml({ parentName, playerFullName, tryout });
  const text = buildText({ parentName, playerFullName, tryout });

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html, text }),
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
  tryout,
}: Omit<SendArgs, "to">): string {
  return [
    `Hi ${parentName},`,
    ``,
    `${playerFullName} is registered for YOU. FIRST Elite Lacrosse 2026 tryouts. Your ${TRYOUT_FEE_LABEL} registration is confirmed.`,
    ``,
    `TRYOUT: ${tryout.fullLabel} (${tryout.group})`,
    `WHO: ${tryout.audience}`,
    ``,
    `What to bring: lacrosse stick, cleats, goggles, mouthguard, water, and a light + dark shirt. Arrive 15 minutes early to check in.`,
    ``,
    `We'll email the field location and exact arrival time before tryout day. Questions? Just reply or email kathleen@youfirstlacrosse.com.`,
    ``,
    `Build & bring the best together.`,
    `— YOU. FIRST Elite Lacrosse`,
  ].join("\n");
}

function buildHtml({
  parentName,
  playerFullName,
  tryout,
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
                  YOU<span style="color:#4a90d9;">.</span> FIRST
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
                  <strong>${escapeHtml(playerFullName)}</strong> is registered for tryouts. Your
                  <strong>${TRYOUT_FEE_LABEL}</strong> registration is confirmed — her spot is secured.
                </p>

                <!-- Date card -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f6fc;border:1px solid rgba(74,144,217,0.25);border-radius:12px;margin-bottom:24px;">
                  <tr>
                    <td style="padding:20px 24px;">
                      <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#4a90d9;font-weight:600;">Her Tryout</div>
                      <div style="font-size:24px;font-weight:800;color:#1a1a1a;margin-top:4px;">${escapeHtml(tryout.fullLabel)}</div>
                      <div style="font-size:14px;color:#6b7280;margin-top:4px;">${escapeHtml(tryout.group)} · ${escapeHtml(tryout.audience)}</div>
                    </td>
                  </tr>
                </table>

                <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#9ca3af;font-weight:600;margin-bottom:8px;">What to bring</div>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#374151;">
                  Lacrosse stick, cleats, goggles, mouthguard, water, and a light + dark shirt.
                  Arrive 15 minutes early to check in.
                </p>

                <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#374151;">
                  We'll email the field location and exact arrival time before tryout day.
                  Questions? Just reply, or email
                  <a href="mailto:kathleen@youfirstlacrosse.com" style="color:#4a90d9;text-decoration:none;">kathleen@youfirstlacrosse.com</a>.
                </p>

                <p style="margin:0;font-size:15px;line-height:1.6;color:#1a1a1a;">
                  Build &amp; bring the best together.<br/>
                  <strong>— YOU. FIRST Elite Lacrosse</strong>
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
