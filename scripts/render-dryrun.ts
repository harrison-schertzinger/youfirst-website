/**
 * Renderer dry-run: build every tab grid + the formatting payload from the
 * LIVE snapshot without touching Google. Catches renderer crashes and shape
 * bugs before the first real sync. Run: npx tsx scripts/render-dryrun.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { fetchSnapshot, serviceClient, TEAM_TABS } from "../src/lib/command-sheet/data";
import {
  buildDashboardGrid,
  buildFormattingRequests,
  buildPipelineGrid,
  buildSyncGrid,
  buildTeamGrid,
} from "../src/lib/command-sheet/render";

async function main() {
  const db = serviceClient();
  if (!db) throw new Error("missing Supabase env");
  const snapshot = await fetchSnapshot(db);
  const now = new Date();

  const pipeline = buildPipelineGrid(snapshot, now);
  console.log(`PIPELINE: ${pipeline.length - 1} rows × ${pipeline[0].length} cols`);
  console.log(`  header: ${pipeline[0].join(" | ")}`);
  if (pipeline[1]) {
    const preview = [...pipeline[1]];
    preview[3] = "«player»"; preview[8] = "«parent»"; preview[9] = "«email»"; preview[10] = "«phone»"; preview[11] = "«phone»";
    console.log(`  row 1 (PII masked): ${preview.join(" | ")}`);
  }

  for (const team of TEAM_TABS) {
    const grid = buildTeamGrid(team, snapshot);
    const isEmpty = grid.length === 2 && grid[1][1] === "No players placed yet";
    console.log(`TEAM ${team}: ${isEmpty ? "empty (quiet note)" : `${grid.length - 1} players`}`);
  }

  const dash = buildDashboardGrid(snapshot, now);
  console.log(`DASHBOARD: ${dash.length} rows; title = "${dash[0][0]}"`);
  const needsAttention = dash.findIndex((r) => r[0] === "NEEDS ATTENTION");
  console.log(`  attention items: ${dash.slice(needsAttention + 1).map((r) => r[0]).join(" // ") || "none"}`);

  const sync = buildSyncGrid(snapshot.runs);
  console.log(`_SYNC: ${sync.length - 1} run rows`);

  const fakeTabs = ["PIPELINE", ...TEAM_TABS, "DASHBOARD", "_SYNC"].map((title, i) => ({
    sheetId: i + 100,
    title,
    rowCount: 1000,
    columnCount: 26,
    conditionalFormatCount: 2,
  }));
  const tabIds = Object.fromEntries(fakeTabs.map((t) => [t.title, t.sheetId]));
  const fmt = buildFormattingRequests(fakeTabs, tabIds);
  JSON.stringify(fmt); // must serialize cleanly
  console.log(`FORMATTING: ${fmt.length} requests, serializes OK`);

  console.log("\nRenderer dry-run passed.");
}

main().catch((err) => {
  console.error("Dry-run failed:", err);
  process.exit(1);
});
