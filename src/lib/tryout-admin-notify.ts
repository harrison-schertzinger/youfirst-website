/**
 * Admin-facing tryout notification via Resend's HTTP API.
 *
 * This is the "someone just registered" ping to the club (Harrison), distinct
 * from the parent-facing confirmation in tryout-email.ts. The subject line
 * carries the real record so a glance tells the whole story:
 *
 *   🥍 New tryout #29 — Caylee Singleton (2029, D) · Older · Aug 3 · PAID
 *
 * Self-contained on purpose (no app imports) so it can be unit-previewed with
 * a real DB row. Fails soft: never throws; returns { sent:false } on any error
 * so the payment webhook is never blocked on email.
 *
 * Env:
 *   RESEND_API_KEY        — Resend key (shared with the confirmation email)
 *   TRYOUT_FROM_EMAIL     — verified sender, e.g. "YOU. FIRST Lacrosse <noreply@youfirstlacrosse.com>"
 *   TRYOUT_ADMIN_EMAILS   — comma-separated recipients (default harrison@theyoufirstproject.com)
 */

export interface TryoutNotifyRecord {
  player_full_name: string;
  parent_name: string;
  email: string;
  phone: string;
  graduation_year: number;
  position: string;      // Attack | Defense | Midfield | Undecided
  tryout_group: string;  // older | youth
  tryout_type: string;   // scheduled | makeup | evaluation
  tryout_date: string | null; // ISO date, e.g. 2026-08-03; null = open evaluation
  payment_status: string; // paid | pending | expired | free
  amount_cents: number;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function abbrevPosition(pos: string): string {
  const p = (pos ?? "").trim().toLowerCase();
  if (p.startsWith("attack")) return "A";
  if (p.startsWith("mid")) return "M";
  if (p.startsWith("def")) return "D";
  if (p.startsWith("goal")) return "G";
  if (p.startsWith("undecided") || p === "" ) return "U";
  return pos.trim().charAt(0).toUpperCase();
}

function titleCase(s: string): string {
  return (s ?? "").charAt(0).toUpperCase() + (s ?? "").slice(1);
}

// Deterministic date formatting from an ISO date, immune to server timezone.
function parseIsoDateUTC(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}
// Evaluation rows have no fixed date — render the open-morning window instead.
function monthDay(iso: string | null): string {
  if (!iso) return "Any morning";
  const d = parseIsoDateUTC(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
function longDate(iso: string | null): string {
  if (!iso) return "Any morning, now through August 7";
  const d = parseIsoDateUTC(iso);
  return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function formatPhone(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith("1"))
    return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return raw ?? "";
}

function formatMoney(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** The one-line subject that carries the whole record. */
export function buildTryoutAdminSubject(reg: TryoutNotifyRecord, count: number): string {
  const status = (reg.payment_status ?? "").toUpperCase();
  return `🥍 New tryout #${count} — ${reg.player_full_name} (${reg.graduation_year}, ${abbrevPosition(reg.position)})`
    + ` · ${titleCase(reg.tryout_group)} · ${monthDay(reg.tryout_date)} · ${status}`;
}

export function buildTryoutAdminNotification(
  reg: TryoutNotifyRecord,
  count: number,
): { subject: string; text: string; html: string } {
  const subject = buildTryoutAdminSubject(reg, count);
  const status = (reg.payment_status ?? "").toUpperCase();

  const text = [
    `New tryout registration — #${count} in the system.`,
    ``,
    `PLAYER`,
    `  ${reg.player_full_name}  ·  Class of ${reg.graduation_year}  ·  ${reg.position}`,
    `  Group:  ${titleCase(reg.tryout_group)}   (${reg.tryout_type})`,
    `  Tryout: ${longDate(reg.tryout_date)}`,
    `  Fee:    ${reg.amount_cents === 0 ? "Free" : formatMoney(reg.amount_cents)} — ${status}`,
    ``,
    `PARENT`,
    `  ${reg.parent_name}`,
    `  ${formatPhone(reg.phone)}`,
    `  ${reg.email}`,
    ``,
    `— sent by Hermes`,
  ].join("\n");

  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top">${label}</td>`
    + `<td style="padding:4px 0;color:#111;font-size:14px;font-weight:600">${escapeHtml(value)}</td></tr>`;

  const statusColor =
    status === "PAID" || status === "FREE"
      ? "#0F7B3E"
      : status === "PENDING"
        ? "#B45309"
        : "#6b7280";

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:8px">
  <div style="border-top:4px solid #4B9CD3;padding-top:18px">
    <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#4B9CD3;font-weight:700">New Tryout · #${count}</div>
    <h2 style="margin:6px 0 4px;font-size:20px;color:#111">${escapeHtml(reg.player_full_name)}
      <span style="font-weight:500;color:#6b7280;font-size:15px"> (${reg.graduation_year}, ${abbrevPosition(reg.position)})</span></h2>
    <div style="display:inline-block;margin:2px 0 16px;padding:2px 10px;border-radius:999px;background:${statusColor}1a;color:${statusColor};font-size:12px;font-weight:700;letter-spacing:0.04em">${status}${reg.amount_cents === 0 ? "" : ` · ${formatMoney(reg.amount_cents)}`}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">
      ${row("Group", `${titleCase(reg.tryout_group)}  (${reg.tryout_type})`)}
      ${row("Tryout", longDate(reg.tryout_date))}
      ${row("Position", reg.position)}
      ${row("Parent", reg.parent_name)}
      ${row("Phone", formatPhone(reg.phone))}
      ${row("Email", reg.email)}
    </table>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0 10px">
    <p style="margin:0;font-size:12px;color:#888">YOU. FIRST Elite Lacrosse · sent by Hermes</p>
  </div>
</div>`;

  return { subject, text, html };
}

export async function sendTryoutAdminNotification(
  reg: TryoutNotifyRecord,
  count: number,
): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping tryout admin notification.");
    return { sent: false, reason: "no_api_key" };
  }
  const from = process.env.TRYOUT_FROM_EMAIL || "YOU. FIRST Lacrosse <onboarding@resend.dev>";
  const to = (process.env.TRYOUT_ADMIN_EMAILS || "harrison@theyoufirstproject.com")
    .split(",").map((s) => s.trim()).filter(Boolean);

  const { subject, text, html } = buildTryoutAdminNotification(reg, count);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      // Reply-to the parent so the club can respond to the family directly.
      body: JSON.stringify({ from, to, subject, html, text, reply_to: reg.email }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Resend tryout admin notification failed:", res.status, detail);
      return { sent: false, reason: `resend_${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("Resend tryout admin notification threw:", err);
    return { sent: false, reason: "exception" };
  }
}
