/**
 * Local HTML preview of the Roster Command Sheet — rendered from the LIVE
 * database through the exact grid builders the sync engine uses, styled to
 * mirror the Google Sheet formatting (white/gray column law, Carolina
 * headers, position sections, flags). PII stays local: the file is written
 * to the Desktop and never leaves the machine.
 *
 * Run: npx tsx scripts/preview-command-sheet.ts [outPath]
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import {
  fetchSnapshot,
  serviceClient,
  TEAM_TABS,
} from "../src/lib/command-sheet/data";
import {
  buildDashboardGrid,
  buildPipelineGrid,
  buildSyncGrid,
  buildTeamGrid,
  CONFIRMED_CHECK,
  FOLLOW_UP_FLAG,
  SECTION_HEADER_LABELS,
  TAB_DASHBOARD,
  TAB_PIPELINE,
  TAB_SYNC,
} from "../src/lib/command-sheet/render";

const esc = (v: string | number) =>
  String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ── Palette (mirrors render.ts formatting) ────────────────────────────────
const C = {
  nearBlack: "#0B0E12",
  carolina: "#4B9CD3",
  carolinaDark: "#3B7EAC",
  gray: "#F4F5F7",
  grayEdge: "#E3E6EA",
  quiet: "#98A1AB",
  coral: "#E4573D",
  coralBg: "#FDE9E4",
  green: "#177245",
  greenBg: "#E8F5EE",
  warnBg: "#FCF1EC",
  recruitWash: "#EFF6FB",
};

function tableFor(
  grid: (string | number)[][],
  opts: {
    whiteCols: number[];
    stickyCols: number;
    rowClass?: (row: (string | number)[]) => string;
    cellClass?: (row: (string | number)[], col: number) => string;
  },
): string {
  const header = grid[0];
  const body = grid.slice(1);
  const th = header
    .map(
      (h, i) =>
        `<th class="${opts.whiteCols.includes(i) ? "white-col" : ""} ${i < opts.stickyCols ? `sticky s${i}` : ""}">${esc(h)}</th>`,
    )
    .join("");
  const rows = body
    .map((row) => {
      const rc = opts.rowClass?.(row) ?? "";
      const tds = header
        .map((_, i) => {
          const v = row[i] ?? "";
          const cc = opts.cellClass?.(row, i) ?? "";
          const wc = opts.whiteCols.includes(i) ? "white-col" : "";
          const sc = i < opts.stickyCols ? `sticky s${i}` : "";
          return `<td class="${wc} ${sc} ${cc}">${esc(v)}</td>`;
        })
        .join("");
      return `<tr class="${rc}">${tds}</tr>`;
    })
    .join("\n");
  return `<div class="grid-wrap"><table><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function dashboardHtml(grid: (string | number)[][]): string {
  const out: string[] = ['<div class="dash">'];
  grid.forEach((row, idx) => {
    const a = String(row[0] ?? "");
    const rest = row.slice(1).filter((v) => v !== "");
    if (idx === 0) {
      out.push(`<div class="dash-title">${esc(a)}</div>`);
    } else if (idx === 1) {
      out.push(`<div class="dash-stamp">${esc(a)}</div>`);
    } else if (a === "") {
      out.push('<div class="dash-gap"></div>');
    } else if (/^[A-Z][A-Z0-9 /$()+—-]+$/.test(a) && a === a.toUpperCase() && /[A-Z]{2,}/.test(a)) {
      const count = rest.length > 0 ? `<span class="dash-count">${esc(rest.join(" · "))}</span>` : "";
      out.push(`<div class="dash-section">${esc(a)}${count}</div>`);
    } else if (rest.length > 0) {
      out.push(
        `<div class="dash-row"><span>${esc(a)}</span><span class="dash-val">${rest.map(esc).join(" · ")}</span></div>`,
      );
    } else {
      const linky = a.includes("https://")
        ? esc(a).replace(/(https:\/\/\S+)/, '<a href="$1">$1</a>')
        : esc(a);
      out.push(`<div class="dash-line">${linky}</div>`);
    }
  });
  out.push("</div>");
  return out.join("\n");
}

async function main() {
  const db = serviceClient();
  if (!db) throw new Error("missing Supabase env");
  const snapshot = await fetchSnapshot(db);
  const now = new Date();
  const stamp = now.toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
  });

  const pipelineGrid = buildPipelineGrid(snapshot, now);
  const SRC = 6, PAY = 14, FLAG = 17, STATUS = 1;

  const panels: Array<{ id: string; label: string; tabColor: string; html: string }> = [];

  panels.push({
    id: "PIPELINE",
    label: TAB_PIPELINE,
    tabColor: C.carolina,
    html:
      tableFor(pipelineGrid, {
        whiteCols: [1, 2],
        stickyCols: 1,
        rowClass: (r) =>
          [
            r[STATUS] === "Placed" ? "placed" : "",
            r[PAY] === "Pending" ? "pending" : "",
            r[SRC] === "Recruiting" ? "recruiting" : "",
          ].join(" "),
        cellClass: (r, i) => (i === FLAG && r[FLAG] === FOLLOW_UP_FLAG ? "flag" : ""),
      }) +
      `<div class="legend">
        <span><i style="background:${C.coralBg};color:${C.coral}">CALL</i> Follow-Up — Evaluated/Offered &gt; 5 days</span>
        <span><i style="background:${C.recruitWash}">&nbsp;&nbsp;&nbsp;</i> Recruiting row</span>
        <span><i style="background:${C.warnBg}">&nbsp;&nbsp;&nbsp;</i> Pending payment ($50 era)</span>
        <span><i style="color:${C.quiet}">Aa</i> Placed — gone quiet</span>
        <span><i class="white-chip">&nbsp;</i> White = Harrison types here</span>
      </div>`,
  });

  for (const team of TEAM_TABS) {
    const grid = buildTeamGrid(team, snapshot);
    panels.push({
      id: `T${team}`,
      label: team,
      tabColor: C.nearBlack,
      html: tableFor(grid, {
        whiteCols: [2],
        stickyCols: 2,
        rowClass: (r) =>
          r[0] === "" && SECTION_HEADER_LABELS.includes(String(r[1]))
            ? "section"
            : r[1] === "No players placed yet"
              ? "empty-note"
              : "",
        cellClass: (r, i) => (i === 3 && r[3] === CONFIRMED_CHECK ? "check" : ""),
      }),
    });
  }

  panels.push({
    id: "DASHBOARD",
    label: TAB_DASHBOARD,
    tabColor: C.carolina,
    html: dashboardHtml(buildDashboardGrid(snapshot, now)),
  });

  const syncGrid = buildSyncGrid(snapshot.runs);
  const syncSample =
    syncGrid.length === 1
      ? `<div class="sync-note">No syncs have run yet — every run lands here in plain English. Example of what a line will look like:</div>` +
        tableFor(
          [
            syncGrid[0],
            ["Jul 15, 6:00 PM", "full", "cron", "ok", "4.2s", 47, 118, 3,
              "Promoted Caylee Singleton (2029) → 2029 roster. Linked existing player. · Kamden McCane: New → Contacted."],
          ],
          { whiteCols: [], stickyCols: 0 },
        )
      : tableFor(syncGrid, { whiteCols: [], stickyCols: 0 });
  panels.push({ id: "SYNC", label: TAB_SYNC, tabColor: C.quiet, html: syncSample });

  const tabs = panels
    .map(
      (p, i) =>
        `<button class="tab ${i === 0 ? "active" : ""}" data-panel="${p.id}"><span class="dot" style="background:${p.tabColor}"></span>${esc(p.label)}</button>`,
    )
    .join("");
  const sections = panels
    .map((p, i) => `<section id="${p.id}" class="panel ${i === 0 ? "active" : ""}">${p.html}</section>`)
    .join("\n");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>YOU. FIRST — Roster Command (preview)</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font: 12.5px/1.45 Inter, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
         background: #E9ECEF; color: #16191D; height: 100vh; display: flex; flex-direction: column; }
  .appbar { background: ${C.nearBlack}; color: #fff; padding: 12px 20px; display: flex; align-items: baseline; gap: 14px; }
  .appbar h1 { font-size: 15px; font-weight: 700; letter-spacing: .04em; }
  .appbar h1 b { color: ${C.carolina}; }
  .appbar .pill { font-size: 11px; font-weight: 600; color: ${C.nearBlack}; background: ${C.carolina};
                  border-radius: 99px; padding: 2px 10px; }
  .appbar .note { font-size: 11px; color: #ffffff99; margin-left: auto; }
  main { flex: 1; overflow: hidden; padding: 14px 16px 0; }
  .panel { display: none; height: 100%; }
  .panel.active { display: block; }
  .grid-wrap { height: calc(100% - 44px); overflow: auto; background: #fff; border: 1px solid ${C.grayEdge};
               border-radius: 6px 6px 0 0; box-shadow: 0 1px 4px rgba(11,14,18,.08); }
  table { border-collapse: separate; border-spacing: 0; width: max-content; min-width: 100%; }
  th, td { padding: 5px 9px; border-bottom: 1px solid ${C.grayEdge}; border-right: 1px solid #EDF0F2;
           white-space: nowrap; background: ${C.gray}; text-align: left; font-weight: 400; max-width: 380px;
           overflow: hidden; text-overflow: ellipsis; }
  thead th { position: sticky; top: 0; z-index: 3; background: ${C.nearBlack}; color: #fff;
             font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: 8px 9px; }
  td:first-child { color: ${C.quiet}; font-size: 10px; max-width: 84px; }
  .sticky { position: sticky; z-index: 2; }
  .s0 { left: 0; } .s1 { left: 84px; }
  thead .sticky { z-index: 4; }
  .white-col { background: #fff !important; border-left: 2px solid ${C.carolina}; }
  thead .white-col { background: ${C.nearBlack} !important; border-left: 2px solid ${C.carolina}; }
  tr.section td { background: ${C.carolina} !important; color: #fff; font-weight: 700; font-size: 10.5px;
                  letter-spacing: .08em; border-left: none; padding: 4px 9px; }
  tr.placed td { color: ${C.quiet}; }
  tr.pending td { background: ${C.warnBg}; }
  tr.recruiting td { background: ${C.recruitWash}; }
  tr.recruiting td.white-col { background: #fff !important; }
  tr.empty-note td { color: ${C.quiet}; font-style: italic; background: #fff; }
  td.flag { background: ${C.coralBg} !important; color: ${C.coral}; font-weight: 700; }
  td.check { background: ${C.greenBg} !important; color: ${C.green}; font-weight: 700; text-align: center; }
  .legend { display: flex; flex-wrap: wrap; gap: 18px; padding: 10px 4px; font-size: 11px; color: #444;
            align-items: center; height: 44px; }
  .legend i { font-style: normal; font-weight: 700; padding: 1px 7px; border-radius: 3px; margin-right: 5px; font-size: 10px; }
  .legend .white-chip { background: #fff; border: 1px solid ${C.grayEdge}; border-left: 2px solid ${C.carolina}; padding: 1px 10px; }
  .tabbar { display: flex; gap: 2px; padding: 6px 14px 10px; background: #E9ECEF; overflow-x: auto; flex-shrink: 0; }
  .tab { border: 1px solid ${C.grayEdge}; border-radius: 0 0 8px 8px; border-top: none; background: #DDE2E7;
         padding: 7px 16px; font: 600 12px Inter, sans-serif; color: #3A4149; cursor: pointer;
         display: flex; align-items: center; gap: 7px; }
  .tab .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
  .tab.active { background: #fff; color: ${C.nearBlack}; box-shadow: 0 2px 5px rgba(11,14,18,.12); }
  .dash { background: #fff; border: 1px solid ${C.grayEdge}; border-radius: 6px; height: 100%; overflow: auto;
          padding: 0 0 30px; max-width: 880px; }
  .dash-title { background: ${C.nearBlack}; color: #fff; font-size: 16px; font-weight: 800;
                letter-spacing: .05em; padding: 16px 22px; }
  .dash-stamp { color: ${C.carolinaDark}; font-weight: 700; font-size: 13px; padding: 12px 22px; }
  .dash-section { font-size: 11px; font-weight: 800; letter-spacing: .1em; color: #fff; background: ${C.carolina};
                  padding: 6px 22px; margin-top: 18px; display: flex; justify-content: space-between; }
  .dash-count { background: #fff; color: ${C.carolinaDark}; border-radius: 99px; padding: 0 10px; font-weight: 800; }
  .dash-row { display: flex; justify-content: space-between; padding: 5px 22px; border-bottom: 1px solid #F1F3F5; }
  .dash-val { font-weight: 700; }
  .dash-line { padding: 5px 22px; color: #3A4149; }
  .dash-line a { color: ${C.carolinaDark}; font-weight: 600; }
  .dash-gap { height: 6px; }
  .sync-note { padding: 10px 4px; color: #555; font-size: 12px; }
</style></head><body>
<div class="appbar">
  <h1>YOU<b>.</b> FIRST — ROSTER COMMAND</h1>
  <span class="pill">PREVIEW</span>
  <span class="note">Live data · rendered ${esc(stamp)} ET · exactly what the Google Sheet will hold — gray regenerates, white is yours</span>
</div>
<main>${sections}</main>
<nav class="tabbar">${tabs}</nav>
<script>
  document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    document.getElementById(t.dataset.panel).classList.add("active");
  }));
</script>
</body></html>`;

  const out = process.argv[2] ?? join(homedir(), "Desktop", "roster-command-preview.html");
  writeFileSync(out, html);
  console.log(`Preview written: ${out} (${(html.length / 1024).toFixed(0)} KB, ${panels.length} tabs)`);
}

main().catch((err) => { console.error("Preview failed:", err); process.exit(1); });
