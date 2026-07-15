/**
 * The duplicate test case, on a REAL girl: Caylee Singleton (2029) appears on
 * the legacy Sheet's 2029 roster (players row exists) AND in
 * tryout_registrations (paid make-up registration). Placing her must LINK the
 * existing players row — never spawn a twin — and doing it twice must change
 * nothing. The placement is left in place afterwards because it is TRUE: she
 * is on the 2029 team. Run: npx tsx scripts/prove-duplicate-case.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import {
  fetchSnapshot,
  normName,
  promoteRegistration,
  serviceClient,
  type RegistrationRow,
} from "../src/lib/command-sheet/data";
import { buildTeamGrid, buildPipelineGrid } from "../src/lib/command-sheet/render";

const REG_COLS =
  "id, player_full_name, parent_name, email, phone, graduation_year, position, tryout_type, tryout_date, payment_status, created_at, pipeline_status, placed_team, jersey_number, player_id, roster_confirmation_id, source, school, notes";

function fail(msg: string): never {
  console.error(`  ✗ ${msg}`);
  process.exit(1);
}

async function main() {
  const db = serviceClient();
  if (!db) fail("missing Supabase env");

  const { data: regs } = await db
    .from("tryout_registrations")
    .select(REG_COLS)
    .ilike("player_full_name", "Caylee Singleton");
  if (!regs || regs.length !== 1) fail(`expected 1 Caylee registration, found ${regs?.length ?? 0}`);
  const reg = regs[0] as RegistrationRow;

  const before = await db
    .from("players")
    .select("id")
    .eq("last_name", "Singleton")
    .eq("graduation_year", 2029);
  const playersBefore = before.data?.length ?? 0;
  console.log(`Before: ${playersBefore} Singleton (2029) players row(s); registration player_id = ${reg.player_id ?? "null"}`);

  const snapshot = await fetchSnapshot(db);
  const first = await promoteRegistration(db, reg, "2029", snapshot);
  console.log(`  run 1: ${first.line}`);
  if (reg.player_id === null && !first.ok) fail("first promotion failed");
  if (first.ok && !first.line.includes("Linked existing player")) {
    fail(`expected to LINK the existing row, got: ${first.line}`);
  }

  // Run 2 with the same stale row — the racing/double-run case.
  const second = await promoteRegistration(db, reg, "2029", snapshot);
  console.log(`  run 2: ${second.line}`);
  if (second.ok) fail("second promotion also claimed success — not idempotent");

  const after = await db
    .from("players")
    .select("id")
    .eq("last_name", "Singleton")
    .eq("graduation_year", 2029);
  if ((after.data?.length ?? 0) !== playersBefore) {
    fail(`players count changed ${playersBefore} → ${after.data?.length} — a twin was created`);
  }
  console.log(`  ✓ still exactly ${playersBefore} players row — no twin`);

  // She must appear exactly once on the 2029 tab and once in PIPELINE.
  const fresh = await fetchSnapshot(db);
  const teamGrid = buildTeamGrid("2029", fresh);
  const teamHits = teamGrid.filter((row) => normName(String(row[1])).includes("caylee singleton"));
  if (teamHits.length !== 1) fail(`she renders ${teamHits.length}× on the 2029 tab`);
  const pipeGrid = buildPipelineGrid(fresh, new Date());
  const pipeHits = pipeGrid.filter((row) => normName(String(row[3])).includes("caylee singleton"));
  if (pipeHits.length !== 1) fail(`she renders ${pipeHits.length}× on PIPELINE`);
  const linked = fresh.registrations.find((r) => r.id === reg.id);
  if (!linked?.player_id) fail("registration is not linked to her players row");
  if (linked.pipeline_status !== "placed") fail(`pipeline_status is ${linked.pipeline_status}, expected placed`);
  console.log(`  ✓ renders once on the 2029 tab, once on PIPELINE (status Placed, linked via player_id)`);

  console.log("\nDuplicate test case passed — one girl, one row, everywhere.");
}

main().catch((err) => { console.error("Proof crashed:", err); process.exit(1); });
