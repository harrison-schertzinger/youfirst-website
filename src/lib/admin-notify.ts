/**
 * Internal notifications to the club, via Resend.
 *
 * SUBJECT GRAMMAR — every internal notification is `Action — Player — Detail`:
 *
 *   Balance question — Elise Swartz — $1,550 due
 *   Payment received — Riley McMaster — $462.50
 *   Delivery failed — Skylar Mardis — mardisjr@gmail.com
 *   Wave 1 sent — 24 families — 0 failed
 *
 * Action first so a notification stack is scannable, player second so the name
 * is never buried behind a prefix, detail third. Filterable in Gmail on the
 * leading action.
 *
 * Fails soft, always. These are pings about something that already happened —
 * a payment that already landed, an email that already bounced. A notification
 * failure must never fail the thing it is reporting on.
 */

const DEFAULT_RECIPIENTS = [
  "harrison@theyoufirstproject.com",
  "kathleen@youfirstlacrosse.com",
];

const BRAND_BLUE = "#4B9CD3";

export function escapeHtml(s: string): string {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function money(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Strip anything that could smuggle a header break into a subject line. */
export function subjectSafe(s: string): string {
  return String(s).replace(/[\r\n]+/g, " ").trim().slice(0, 120);
}

/**
 * Build a subject in house grammar. Every part is CRLF-stripped, so no caller
 * can inject a header even with fully attacker-controlled input.
 */
export function adminSubject(
  action: string,
  player: string,
  detail: string,
): string {
  return [action, player, detail].map(subjectSafe).join(" — ");
}

export interface AdminNotifyRow {
  label: string;
  value: string;
  emphasise?: boolean;
}

export interface AdminNotifyInput {
  subject: string;
  /** Big line at the top of the card — usually the player's name. */
  headline: string;
  /** Small line under the headline — team, class year, timestamp. */
  subhead?: string;
  /** Label/value rows rendered as a table with right-aligned values. */
  rows?: AdminNotifyRow[];
  /** Free-form paragraphs after the rows. */
  paragraphs?: string[];
  /** Someone else's words — rendered as a visually distinct quote block. */
  quote?: string;
  button?: { label: string; url: string };
  footnote?: string;
  to?: string[];
  replyTo?: string;
}

function buildHtml(input: AdminNotifyInput): string {
  const rows = (input.rows ?? [])
    .map(
      (r) => `<tr>
        <td style="padding:5px 20px 5px 0;color:#6B7280;font-size:14px;white-space:nowrap">${escapeHtml(r.label)}</td>
        <td align="right" style="padding:5px 0;font-size:${r.emphasise ? "17px" : "14px"};font-weight:${r.emphasise ? "700" : "600"};color:#111;white-space:nowrap">${escapeHtml(r.value)}</td>
      </tr>`,
    )
    .join("");

  const paragraphs = (input.paragraphs ?? [])
    .map(
      (p) =>
        `<p style="margin:0 0 12px;font-size:14px;line-height:1.55;color:#374151">${escapeHtml(p)}</p>`,
    )
    .join("");

  const quote = input.quote
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px">
        <tr><td style="background:#F6F8FA;border-left:3px solid ${BRAND_BLUE};padding:14px 16px;border-radius:4px">
          <div style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#6B7280;margin:0 0 6px">In their words</div>
          <div style="font-size:15px;line-height:1.6;color:#111;white-space:pre-wrap">${escapeHtml(input.quote).replaceAll("\n", "<br>")}</div>
        </td></tr>
      </table>`
    : "";

  const button = input.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px">
        <tr><td style="border-radius:8px;background:${BRAND_BLUE}">
          <a href="${escapeHtml(input.button.url)}" style="display:inline-block;padding:11px 20px;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:.04em">${escapeHtml(input.button.label)}</a>
        </td></tr>
      </table>`
    : "";

  // Table-based, inline CSS, no web fonts, no external stylesheets — Gmail
  // strips everything else.
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff">
  <tr><td align="center" style="padding:12px">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
      <tr><td style="border-top:4px solid ${BRAND_BLUE};padding-top:16px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${BRAND_BLUE};margin:0 0 14px">YOU. FIRST Lacrosse</div>
        <div style="font-size:24px;font-weight:700;line-height:1.2;color:#111;margin:0 0 2px">${escapeHtml(input.headline)}</div>
        ${input.subhead ? `<div style="font-size:13px;color:#6B7280;margin:0 0 18px">${escapeHtml(input.subhead)}</div>` : `<div style="height:14px"></div>`}
        ${rows ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border-collapse:collapse">${rows}</table>` : ""}
        ${quote}
        ${paragraphs}
        ${button}
        ${input.footnote ? `<hr style="border:none;border-top:1px solid #E5E7EB;margin:18px 0 10px"><p style="margin:0;font-size:12px;line-height:1.5;color:#9CA3AF">${escapeHtml(input.footnote)}</p>` : ""}
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

function buildText(input: AdminNotifyInput): string {
  const parts: string[] = [input.headline];
  if (input.subhead) parts.push(input.subhead);
  parts.push("");
  for (const r of input.rows ?? []) {
    parts.push(`${r.label.padEnd(12)} ${r.value}`);
  }
  if (input.quote) {
    parts.push("", "IN THEIR WORDS", input.quote);
  }
  if (input.paragraphs?.length) parts.push("", ...input.paragraphs);
  if (input.button) parts.push("", `${input.button.label}: ${input.button.url}`);
  if (input.footnote) parts.push("", input.footnote);
  return parts.join("\n");
}

function recipients(override?: string[]): string[] {
  if (override?.length) return override;
  const raw = process.env.ADMIN_NOTIFY_EMAILS;
  if (!raw) return DEFAULT_RECIPIENTS;
  const list = raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return list.length ? list : DEFAULT_RECIPIENTS;
}

export async function sendAdminNotification(
  input: AdminNotifyInput,
): Promise<{ sent: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const verifiedSender = process.env.TRYOUT_FROM_EMAIL;
  if (!apiKey || !verifiedSender) {
    return { sent: false, error: "RESEND_API_KEY or TRYOUT_FROM_EMAIL not set" };
  }

  // Keep the domain-verified address, change only the display name.
  const bare =
    verifiedSender.match(/<([^>]+)>/)?.[1]?.trim() ?? verifiedSender.trim();
  const from = `YOU. FIRST Lacrosse <${bare}>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients(input.to),
        subject: subjectSafe(input.subject),
        html: buildHtml(input),
        text: buildText(input),
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      return { sent: false, error: `resend ${res.status}: ${await res.text()}` };
    }
    const data = await res.json().catch(() => ({}));
    return { sent: true, id: data?.id };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
