/**
 * THE CLUB STANDARD — HTML for print.
 *
 * HTML → PDF so the document renders identically every time and can be
 * rewritten in an afternoon: edit content.mjs, run the build, done. No layout
 * program, no font licence, no one-person dependency.
 *
 * Page model: one <section class="page"> per section, each a fixed Letter page
 * with its own footer, so pagination is deterministic rather than whatever the
 * text happens to reflow into.
 */

import { CLUB, SECTIONS, VARIANTS, blocksFor } from "./content.mjs";

const ACCENT = "#4B9CD3";
const INK = "#0A0A0B";

const UNWRITTEN_RE = /\[\[[\s\S]*?\]\]/;

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Wrap unwritten copy so a draft is visible on the page, not just in a log. */
function copy(s) {
  return esc(s).replace(
    /\[\[([\s\S]*?)\]\]/g,
    '<span class="todo">[[$1]]</span>',
  );
}

function renderBlock(b) {
  switch (b.type) {
    case "lede":
      return `<p class="lede">${copy(b.text)}</p>`;
    case "p":
      return `<p>${copy(b.text)}</p>`;
    case "h":
      return `<h3>${copy(b.text)}</h3>`;
    case "note":
      return `<div class="note">${copy(b.text)}</div>`;
    case "list":
      return `<ul>${b.items.map((i) => `<li>${copy(i)}</li>`).join("")}</ul>`;
    case "pillars":
      return `<div class="pillars">${b.items
        .map(
          (p) =>
            `<div class="pillar"><div class="pillar-lead">${copy(p.lead)}</div><div class="pillar-body">${copy(p.body)}</div></div>`,
        )
        .join("")}</div>`;
    case "table":
      return `<table>
        <thead><tr>${b.head.map((h) => `<th>${copy(h)}</th>`).join("")}</tr></thead>
        <tbody>${b.rows
          .map((r) => `<tr>${r.map((c) => `<td>${copy(c)}</td>`).join("")}</tr>`)
          .join("")}</tbody>
      </table>`;
    default:
      return "";
  }
}

/** Every unwritten block in this variant, for the build report. */
export function unwrittenIn(variantKey) {
  const found = [];
  for (const section of SECTIONS) {
    const blocks = blocksFor(section, variantKey);
    const text = JSON.stringify(blocks);
    if (UNWRITTEN_RE.test(text)) found.push(`${section.n}. ${section.title}`);
  }
  return found;
}

export function renderDocument(variantKey, coverImageUrl) {
  const variant = VARIANTS[variantKey];
  if (!variant) throw new Error(`Unknown variant: ${variantKey}`);

  const isDraft = unwrittenIn(variantKey).length > 0;

  const pages = SECTIONS.map((section) => {
    const blocks = blocksFor(section, variantKey);
    if (!blocks.length) return "";
    return `<section class="page">
      ${isDraft ? '<div class="draft-bar">Draft — copy not final</div>' : ""}
      <header class="running">
        <span>${esc(CLUB.name)}</span>
        <span>${esc(variant.title)} · ${esc(CLUB.season)}</span>
      </header>
      <div class="body">
        <div class="sec-n">${section.n}</div>
        <h2>${esc(section.title)}</h2>
        ${blocks.map(renderBlock).join("\n")}
      </div>
      <footer class="running">
        <span>The Club Standard</span>
        <span>${section.n} / ${SECTIONS.length}</span>
      </footer>
    </section>`;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>The Club Standard — ${esc(variant.title)}</title>
<style>
  @page { size: Letter; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: ${INK};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 8.5in; height: 11in;
    padding: 0.72in 0.85in 0.6in;
    display: flex; flex-direction: column;
    page-break-after: always; break-after: page;
    position: relative;
    background: #fff;
  }
  .page:last-child { page-break-after: auto; break-after: auto; }

  .running {
    display: flex; justify-content: space-between;
    font-size: 8.5pt; letter-spacing: .06em; text-transform: uppercase;
    color: #9CA3AF;
  }
  header.running { border-bottom: 1px solid #E5E7EB; padding-bottom: 10px; }
  footer.running { border-top: 1px solid #E5E7EB; padding-top: 10px; margin-top: auto; }

  .body { padding-top: 34px; }

  .sec-n {
    font-size: 10pt; font-weight: 800; letter-spacing: .18em;
    color: ${ACCENT};
  }
  h2 {
    font-size: 30pt; font-weight: 800; letter-spacing: -0.02em;
    line-height: 1.1; margin: 6px 0 20px;
  }
  h3 {
    font-size: 11pt; font-weight: 800; letter-spacing: .14em;
    text-transform: uppercase; color: ${ACCENT};
    margin: 26px 0 10px;
  }
  p { font-size: 11.5pt; line-height: 1.62; margin: 0 0 13px; color: #26272B; }
  p.lede { font-size: 14pt; line-height: 1.5; font-weight: 600; color: ${INK}; margin-bottom: 18px; }

  ul { margin: 0 0 14px; padding-left: 18px; }
  li { font-size: 11.5pt; line-height: 1.62; margin-bottom: 7px; color: #26272B; }

  .note {
    border-left: 3px solid ${ACCENT};
    background: #EDF5FB;
    padding: 14px 18px; margin: 16px 0;
    font-size: 11pt; line-height: 1.6; color: #26272B;
  }

  .pillars { margin-top: 6px; }
  .pillar { border-left: 3px solid ${ACCENT}; padding: 2px 0 2px 16px; margin-bottom: 18px; }
  .pillar-lead { font-size: 12.5pt; font-weight: 800; line-height: 1.35; }
  .pillar-body { font-size: 11pt; line-height: 1.6; color: #4B5563; margin-top: 4px; }

  table { width: 100%; border-collapse: collapse; margin: 14px 0 16px; }
  th {
    text-align: left; font-size: 8.5pt; letter-spacing: .12em; text-transform: uppercase;
    color: #6B7280; border-bottom: 1.5px solid ${INK}; padding: 0 10px 7px 0;
  }
  td {
    font-size: 10.5pt; line-height: 1.5; color: #26272B;
    border-bottom: 1px solid #E5E7EB; padding: 9px 10px 9px 0; vertical-align: top;
  }
  th:last-child, td:last-child { padding-right: 0; }

  .todo {
    background: #FEF3C7; color: #92400E;
    padding: 0 3px; border-radius: 2px;
    font-style: italic;
  }
  .draft-bar {
    position: absolute; top: 0; left: 0; right: 0;
    background: #B45309; color: #fff;
    font-size: 8.5pt; font-weight: 800; letter-spacing: .18em; text-transform: uppercase;
    text-align: center; padding: 5px 0;
  }

  /* ── Cover ────────────────────────────────────────────────────────── */
  .cover {
    width: 8.5in; height: 11in;
    page-break-after: always; break-after: page;
    position: relative; overflow: hidden;
    background: ${INK};
    display: flex; flex-direction: column; justify-content: flex-end;
    padding: 0.85in;
  }
  .cover img {
    position: absolute; inset: 0;
    width: 100%; height: 100%; object-fit: cover;
    opacity: 0.55;
  }
  .cover .veil {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(10,10,11,.35) 0%, rgba(10,10,11,.55) 45%, rgba(10,10,11,.94) 100%);
  }
  .cover .stack { position: relative; }
  .cover .club {
    font-size: 10pt; font-weight: 800; letter-spacing: .22em; text-transform: uppercase;
    color: ${ACCENT}; margin-bottom: 20px;
  }
  .cover h1 {
    font-size: 52pt; font-weight: 800; letter-spacing: -0.03em; line-height: 1;
    color: #fff; margin: 0;
  }
  .cover .variant {
    font-size: 18pt; font-weight: 600; color: #fff; opacity: .92; margin-top: 14px;
  }
  .cover .season {
    font-size: 10pt; letter-spacing: .18em; text-transform: uppercase;
    color: rgba(255,255,255,.6); margin-top: 26px;
    border-top: 1px solid rgba(255,255,255,.22); padding-top: 16px;
  }
</style>
</head>
<body>
  <div class="cover">
    ${coverImageUrl ? `<img src="${esc(coverImageUrl)}" alt="">` : ""}
    <div class="veil"></div>
    ${isDraft ? '<div class="draft-bar">Draft — copy not final</div>' : ""}
    <div class="stack">
      <div class="club">${esc(CLUB.name)}</div>
      <h1>The Club<br>Standard</h1>
      <div class="variant">${esc(variant.title)}</div>
      <div class="season">${esc(CLUB.season)} season · ${esc(CLUB.location)}</div>
    </div>
  </div>
  ${pages}
</body>
</html>`;
}
