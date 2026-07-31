/**
 * The placement email — chrome, type and layout.
 *
 * WHY THE DESIGN LIVES IN CODE AND THE COPY LIVES IN THE DATABASE:
 * Harrison rewrites copy often and should never need a deploy to do it, so the
 * words are `email_templates` rows he can edit at /admin/templates. The design
 * is the opposite — it must not drift between five templates, so it is written
 * once, here, and every template gets it.
 *
 * BLUE IS NOT A LESSER EMAIL THAN ELITE. That is the point of the tier, and a
 * comment cannot enforce it, so the enforcement is structural: `buildEmail`
 * accepts no colour, no scale, no photo and no weight argument. There is no
 * parameter a future edit could reach for to make one tier look smaller. The
 * only thing that varies between tiers is the prose.
 *
 * RENDERING TARGET is Outlook (Word engine) and Gmail, not a modern browser:
 *   • table layout with role="presentation", no flex, no grid, no float
 *   • every style inline; no <style> block is relied on for layout
 *   • mso-line-height-rule:exactly so Outlook honours line-height
 *   • the button is VML for Outlook, an anchor everywhere else
 *   • the hero sits on a dark cell, so a blocked image degrades to dark with
 *     alt text rather than a white hole punched in a dark email
 *   • a plain-text alternative is built from the same regions, never omitted
 */

import { paragraphsOf, type Regions } from "@/lib/placement/regions";
import { type EmailShape } from "@/lib/placement/shared";

// ── Tokens ────────────────────────────────────────────────────────────────
// Deep navy, not near-black: the point is to sit against a white inbox as an
// obviously designed object. ACCENT is the site's own Carolina
// (--color-accent-blue); the rest are the navy ramp built around it.
const INK = "#0A1A2F"; // page ground
const ACCENT = "#4B9CD3"; // --color-accent-blue
const WHITE = "#FFFFFF";
const PROSE = "#C6D2DF"; // body copy on navy — ~11:1 on INK
const MUTED = "#8397AC"; // labels, footer
const RULE = "#1E3A56"; // hairlines on navy
const PANEL = "#102741"; // inset panels

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const WIDTH = 600;

export function escapeHtml(s: string): string {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** `**bold**` → <strong>, applied after escaping so copy cannot inject HTML. */
function inline(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${WHITE};font-weight:700">$1</strong>`)
    .replaceAll("\n", "<br>");
}

/** The plain-text alternative shows the words, not the markers. */
export function stripEmphasis(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "$1");
}

export interface EmailChrome {
  shape: EmailShape;
  /** "PLACEMENT · 2026–27 SEASON" — small tracked caps above the headline. */
  eyebrow: string;
  /** The placement, large: "2030 Elite". */
  headline: string;
  /** Her name, under the headline. */
  subhead: string;
  /** Absolute https URL. The primary action. */
  actionUrl: string;
  /**
   * The ONE secondary link, under the button — The You First Standard.
   * Text, never a second button: two buttons is two primary actions, and
   * confirming has to win.
   */
  standardUrl: string;
  standardLabel: string;
  /** Absolute https URL of the hero photograph. */
  heroUrl: string;
  heroAlt: string;
  footer: string;
}

// ── Fragment builders ─────────────────────────────────────────────────────

function row(inner: string): string {
  return `<tr><td style="padding:0 40px">${inner}</td></tr>`;
}

function spacer(px: number): string {
  return `<tr><td style="font-size:0;line-height:0;height:${px}px">&nbsp;</td></tr>`;
}

function rule(): string {
  return row(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height:1px;font-size:0;line-height:0;background:${RULE}">&nbsp;</td></tr></table>`,
  );
}


function prose(region: string | undefined): string {
  const paras = paragraphsOf(region);
  if (!paras.length) return "";
  return paras
    .map(
      (p) =>
        `<tr><td style="padding:0 40px 18px"><div style="font-family:${FONT};font-size:17px;line-height:28px;mso-line-height-rule:exactly;color:${PROSE}">${inline(p)}</div></td></tr>`,
    )
    .join("");
}


function deadlineBlock(region: string | undefined): string {
  if (!region?.trim()) return "";
  return `<tr><td style="padding:0 40px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PANEL}" style="background:${PANEL}">
      <tr><td style="padding:20px 24px">
        <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:${MUTED};mso-line-height-rule:exactly;line-height:16px">Deadline</div>
        <div style="font-family:${FONT};font-size:16px;line-height:26px;mso-line-height-rule:exactly;color:${WHITE};padding-top:6px">${inline(region.trim())}</div>
      </td></tr>
    </table>
  </td></tr>`;
}

/**
 * The only action in the email. VML for Outlook, an anchor everywhere else —
 * the anchor is hidden from Outlook so the button never renders twice.
 */
function button(label: string, url: string): string {
  const safeUrl = escapeHtml(url);
  const safeLabel = escapeHtml(label);
  return `<tr><td align="center" style="padding:0 40px">
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:54px;v-text-anchor:middle;width:${WIDTH - 80}px" arcsize="6%" stroke="f" fillcolor="${ACCENT}">
      <w:anchorlock/>
      <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;letter-spacing:.02em">${safeLabel}</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-- -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td align="center" bgcolor="${ACCENT}" style="background:${ACCENT};border-radius:4px">
        <a href="${safeUrl}" style="display:block;padding:18px 24px;font-family:${FONT};font-size:17px;font-weight:700;letter-spacing:.02em;color:${WHITE};text-decoration:none;mso-line-height-rule:exactly;line-height:20px">${safeLabel}</a>
      </td></tr>
    </table>
    <!--<![endif]-->
  </td></tr>`;
}

/**
 * The one secondary action, as text. Centred under the button, deliberately
 * quieter — smaller, muted, underlined — so it reads as "and also" rather than
 * as a competing choice.
 */
function secondaryLink(label: string, url: string): string {
  return `<tr><td align="center" style="padding:0 40px">
    <a href="${escapeHtml(url)}" style="font-family:${FONT};font-size:14px;line-height:22px;mso-line-height-rule:exactly;color:${MUTED};text-decoration:underline">${escapeHtml(label)}</a>
  </td></tr>`;
}

// ── The document ──────────────────────────────────────────────────────────

export function buildHtml(chrome: EmailChrome, regions: Regions): string {
  const isPlacement = chrome.shape === "placement";

  const body = [
    // Hero — full width, on a dark cell so a blocked image degrades to dark.
    `<tr><td bgcolor="${INK}" style="background:${INK};font-size:0;line-height:0">
      <img src="${escapeHtml(chrome.heroUrl)}" width="${WIDTH}" alt="${escapeHtml(chrome.heroAlt)}"
        style="display:block;width:100%;max-width:${WIDTH}px;height:auto;border:0;outline:none;text-decoration:none;background:${INK};color:${MUTED};font-family:${FONT};font-size:13px" />
    </td></tr>`,

    spacer(36),
    row(
      `<div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:${MUTED};mso-line-height-rule:exactly;line-height:16px">${escapeHtml(chrome.eyebrow)}</div>`,
    ),
    spacer(14),
    row(
      `<div style="font-family:${FONT};font-size:38px;font-weight:800;letter-spacing:-.02em;line-height:44px;mso-line-height-rule:exactly;color:${WHITE}">${escapeHtml(chrome.headline)}</div>`,
    ),
    spacer(8),
    row(
      `<div style="font-family:${FONT};font-size:18px;line-height:26px;mso-line-height-rule:exactly;color:${ACCENT}">${escapeHtml(chrome.subhead)}</div>`,
    ),
    spacer(30),

    prose(regions.opening),

    // The spine — the club paragraphs, set between hairlines so seven
    // paragraphs read as a block rather than as more of the opening.
    ...(isPlacement && regions.spine
      ? [
          spacer(14),
          rule(),
          spacer(30),
          prose(regions.spine),
          spacer(10),
          rule(),
          spacer(30),
        ]
      : [spacer(4)]),

    prose(regions.closing),
    ...(regions.closing?.trim() ? [spacer(10)] : []),

    deadlineBlock(regions.deadline),
    ...(regions.deadline?.trim() ? [spacer(28)] : []),

    button(regions.button_label?.trim() || "Confirm", chrome.actionUrl),
    // Suppressed when the button already points there — the receipt's primary
    // action IS the Standard, and a link that repeats the button is noise.
    ...(chrome.standardUrl !== chrome.actionUrl
      ? [spacer(18), secondaryLink(chrome.standardLabel, chrome.standardUrl)]
      : []),
    spacer(34),
    rule(),
    spacer(26),

    prose(regions.signature),
    spacer(14),
  ].join("");

  return `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(chrome.headline)}</title>
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<![endif]-->
</head>
<body style="margin:0;padding:0;background:${INK};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
<div style="display:none;font-size:1px;color:${INK};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${escapeHtml(regions.preheader?.trim() ?? "")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${INK}" style="background:${INK}">
  <tr><td align="center" style="padding:0">
    <table role="presentation" width="${WIDTH}" cellpadding="0" cellspacing="0" border="0" bgcolor="${INK}" style="width:${WIDTH}px;max-width:${WIDTH}px;background:${INK}">
      ${body}
    </table>
    <table role="presentation" width="${WIDTH}" cellpadding="0" cellspacing="0" border="0" style="width:${WIDTH}px;max-width:${WIDTH}px">
      <tr><td align="center" style="padding:26px 40px 40px">
        <div style="font-family:${FONT};font-size:12px;line-height:20px;mso-line-height-rule:exactly;color:${MUTED}">${escapeHtml(chrome.footer)}</div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function buildText(chrome: EmailChrome, regions: Regions): string {
  const out: string[] = [];
  const push = (s = "") => out.push(s);

  push(chrome.eyebrow.toUpperCase());
  push(chrome.headline);
  push(chrome.subhead);
  push();

  for (const p of paragraphsOf(regions.opening)) {
    push(stripEmphasis(p));
    push();
  }

  for (const key of ["spine", "closing"] as const) {
    for (const p of paragraphsOf(regions[key])) {
      push(stripEmphasis(p));
      push();
    }
  }

  if (regions.deadline?.trim()) {
    push("DEADLINE");
    push(stripEmphasis(regions.deadline.trim()));
    push();
  }

  push(`${stripEmphasis(regions.button_label?.trim() || "Confirm")}: ${chrome.actionUrl}`);
  push();
  if (chrome.standardUrl !== chrome.actionUrl) {
    push(`${chrome.standardLabel}: ${chrome.standardUrl}`);
    push();
  }

  for (const p of paragraphsOf(regions.signature)) {
    push(stripEmphasis(p));
    push();
  }

  push(chrome.footer);
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
