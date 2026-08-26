/**
 * Admin notification for a parent balance question, via Resend's HTTP API.
 *
 * The subject carries the player name so it is triageable from a phone:
 *
 *   💬 Balance question — Riley McMaster ($1,387.50 due)
 *
 * The body carries charged / paid / remaining at the moment of submission, so
 * Harrison or Kathleen can answer without opening anything.
 *
 * SECURITY: the message is parent-supplied free text on a page that handles
 * money. It is HTML-escaped before it ever reaches the HTML body, and the
 * subject is built only from our own numbers plus the player name — never from
 * the message. Newlines are converted after escaping, so injected markup
 * cannot survive.
 *
 * Fails soft: never throws. The row is already committed before this runs, and
 * the admin queue at /admin/questions is the real queue — email is only a ping.
 *
 * Env (shared with the tryout emails):
 *   RESEND_API_KEY
 *   TRYOUT_FROM_EMAIL          — verified sender
 *   BALANCE_QUESTION_EMAILS    — comma-separated recipients; defaults to
 *                                Harrison + Kathleen
 */

export interface BalanceQuestionNotifyInput {
  playerName: string;
  guardianEmail: string;
  message: string;
  chargedCents: number | null;
  paidCents: number | null;
  adjustmentCents: number | null;
  remainingCents: number | null;
  submittedAt: string;
  /**
   * Who the family chose. Already resolved against published club_contacts by
   * the caller — this module must never accept an address from a browser.
   */
  recipients?: string[];
}

/**
 * Kathleen first — she owns fees and parent relations, and a balance question
 * is hers to answer. Harrison is copied, not primary.
 *
 * harrison@theyoufirstproject.com is retired; the club address is the only one
 * used now. Override with BALANCE_QUESTION_EMAILS.
 */
const DEFAULT_RECIPIENTS = [
  "kathleen@youfirstlacrosse.com",
  "harrison@youfirstlacrosse.com",
];

function escapeHtml(s: string): string {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function money(cents: number | null): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Strip anything that could smuggle a header break into the subject line. */
function safeSubjectFragment(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim().slice(0, 120);
}

/**
 * Who gets the ping.
 *
 * `chosen` wins when the family picked someone — it is already validated
 * against published club_contacts by the caller. Otherwise the env override,
 * otherwise the defaults. A browser-supplied address never reaches here.
 */
function recipients(chosen?: string[]): string[] {
  if (chosen && chosen.length > 0) return chosen;
  const raw = process.env.BALANCE_QUESTION_EMAILS;
  if (!raw) return DEFAULT_RECIPIENTS;
  const list = raw
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
  return list.length > 0 ? list : DEFAULT_RECIPIENTS;
}

export async function sendBalanceQuestionNotification(
  input: BalanceQuestionNotifyInput,
): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const verifiedSender = process.env.TRYOUT_FROM_EMAIL;

  if (!apiKey || !verifiedSender) {
    return { sent: false, error: "RESEND_API_KEY or TRYOUT_FROM_EMAIL not set" };
  }

  // Keep the domain-verified address, change the display name. Extract the
  // bare address from whatever form TRYOUT_FROM_EMAIL takes ("Name <a@b>" or
  // "a@b") so we never send from an unverified sender.
  const bareAddress =
    verifiedSender.match(/<([^>]+)>/)?.[1]?.trim() ?? verifiedSender.trim();
  const from =
    process.env.BALANCE_QUESTION_FROM ??
    `Harrison Schertzinger <${bareAddress}>`;

  const player = safeSubjectFragment(input.playerName);
  const subject = `💬 Balance question — ${player} (${money(
    input.remainingCents,
  )} due)`;

  const adjustmentLine =
    input.adjustmentCents && input.adjustmentCents > 0
      ? `Adjustment:  −${money(input.adjustmentCents)}\n`
      : "";

  const text =
    `${player}'s family submitted a question about her balance.\n\n` +
    `From:        ${input.guardianEmail}\n` +
    `Submitted:   ${input.submittedAt}\n\n` +
    `BALANCE AT SUBMISSION\n` +
    `Charged:     ${money(input.chargedCents)}\n` +
    `Paid:        ${money(input.paidCents)}\n` +
    adjustmentLine +
    `Remaining:   ${money(input.remainingCents)}\n\n` +
    `MESSAGE\n${input.message}\n\n` +
    `Reply straight to this email to answer the parent.\n` +
    `Mark it resolved in the admin queue: /admin/questions`;

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:8px">
  <div style="border-top:4px solid #4B9CD3;padding-top:18px">
    <h2 style="margin:0 0 4px;font-size:18px;color:#111">Balance question — ${escapeHtml(
      player,
    )}</h2>
    <p style="margin:0 0 16px;font-size:13px;color:#666">from ${escapeHtml(
      input.guardianEmail,
    )} · ${escapeHtml(input.submittedAt)}</p>

    <table style="border-collapse:collapse;font-size:14px;margin:0 0 18px">
      <tr><td style="padding:3px 18px 3px 0;color:#666">Charged</td><td style="padding:3px 0;font-weight:600">${money(
        input.chargedCents,
      )}</td></tr>
      <tr><td style="padding:3px 18px 3px 0;color:#666">Paid</td><td style="padding:3px 0;font-weight:600">${money(
        input.paidCents,
      )}</td></tr>
      ${
        input.adjustmentCents && input.adjustmentCents > 0
          ? `<tr><td style="padding:3px 18px 3px 0;color:#666">Adjustment</td><td style="padding:3px 0;font-weight:600">−${money(
              input.adjustmentCents,
            )}</td></tr>`
          : ""
      }
      <tr><td style="padding:3px 18px 3px 0;color:#666">Remaining</td><td style="padding:3px 0;font-weight:700;color:#111">${money(
        input.remainingCents,
      )}</td></tr>
    </table>

    <div style="background:#F6F8FA;border-left:3px solid #4B9CD3;padding:12px 14px;border-radius:4px">
      <p style="margin:0;font-size:14px;line-height:1.55;white-space:pre-wrap">${escapeHtml(
        input.message,
      ).replaceAll("\n", "<br>")}</p>
    </div>

    <p style="margin:18px 0 0;font-size:13px;color:#444">
      Reply straight to this email to answer the parent — or mark it resolved in
      the admin queue at <strong>/admin/questions</strong>.
    </p>
    <hr style="border:none;border-top:1px solid #eee;margin:22px 0 10px">
    <p style="margin:0;font-size:12px;color:#888">YOU. FIRST Elite Lacrosse</p>
  </div>
</div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients(input.recipients),
        subject,
        html,
        text,
        // Reply goes straight back to the parent who asked, so Kathleen can
        // answer her family directly by hitting reply. This is deliberately
        // DIFFERENT from the collections email, which replies to Harrison —
        // that one is outbound to a family, this one is inbound to the club.
        reply_to: input.guardianEmail,
      }),
    });
    if (!res.ok) {
      return { sent: false, error: `resend ${res.status}: ${await res.text()}` };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
