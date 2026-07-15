/**
 * Roster Command Sheet — self-audit harness. Run with:
 *   npx tsx scripts/test-command-sheet.ts
 *
 * Proves, against the live database (with a clearly marked test row that is
 * fully cleaned up):
 *   1. FAIL-SOFT — with no Google credentials the engine returns a plain-
 *      English skip and logs it; nothing throws.
 *   2. PROMOTION IDEMPOTENCY — promoting the same registration twice creates
 *      exactly ONE players row; the loser reports it stood down.
 *   3. UNLINK SAFETY — clearing a placement unlinks but NEVER deletes the
 *      players row.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import {
  addTypedRecruit,
  fetchSnapshot,
  promoteRegistration,
  serviceClient,
  unlinkRegistration,
  type RegistrationRow,
} from "../src/lib/command-sheet/data";
import { runFullSync } from "../src/lib/command-sheet/engine";

const TEST_EMAIL = "sheettest+harness@example.com";
const TEST_PLAYER = "Zz Sheetharness";

function pass(name: string) {
  console.log(`  ✓ ${name}`);
}
function fail(name: string, detail: string): never {
  console.error(`  ✗ ${name} — ${detail}`);
  process.exit(1);
}

async function main() {
  const db = serviceClient();
  if (!db) fail("setup", "missing Supabase env");

  // ── 1. Fail-soft without Google creds ─────────────────────────────
  console.log("1. Fail-soft (no Google credentials set)…");
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  delete process.env.ROSTER_COMMAND_SHEET_ID;
  const softResult = await runFullSync("test");
  if (softResult.ok) fail("fail-soft", "sync claimed ok without credentials");
  if (!softResult.message.includes("isn't connected")) {
    fail("fail-soft", `unexpected message: ${softResult.message}`);
  }
  const { data: skippedRun } = await db
    .from("sheet_sync_runs")
    .select("id, status")
    .eq("trigger", "test")
    .eq("status", "skipped")
    .limit(1);
  if (!skippedRun || skippedRun.length === 0) fail("fail-soft", "no skipped run logged");
  pass("engine skipped in plain English and logged the run");

  // ── 2. Promotion idempotency ──────────────────────────────────────
  console.log("2. Promotion double-run (must not duplicate a girl)…");
  const { data: reg, error: insErr } = await db
    .from("tryout_registrations")
    .insert({
      player_full_name: TEST_PLAYER,
      parent_name: "Harness Parent",
      email: TEST_EMAIL,
      phone: "5135550100",
      graduation_year: 2033,
      position: "Attack",
      tryout_type: "evaluation",
      tryout_group: "youth",
      tryout_date: null,
      amount_cents: 0,
      currency: "usd",
      payment_status: "free",
    })
    .select(
      "id, player_full_name, parent_name, email, phone, graduation_year, position, tryout_type, tryout_date, payment_status, created_at, pipeline_status, placed_team, jersey_number, player_id, roster_confirmation_id, source, school, notes",
    )
    .single();
  if (insErr || !reg) fail("promotion", `test insert failed: ${insErr?.message}`);
  const testReg = reg as RegistrationRow;

  const snapshot = await fetchSnapshot(db);
  const first = await promoteRegistration(db, testReg, "2033", snapshot);
  if (!first.ok) fail("promotion", `first run failed: ${first.line}`);
  pass(`first run: ${first.line}`);

  // Second run with the STALE row (player_id still null) — the racing case.
  const second = await promoteRegistration(db, testReg, "2033", snapshot);
  if (second.ok) fail("idempotency", "second promotion also claimed success");
  pass(`second run stood down: ${second.line}`);

  const { data: players } = await db
    .from("players")
    .select("id")
    .eq("last_name", "Sheetharness");
  if (!players || players.length !== 1) {
    fail("idempotency", `expected exactly 1 players row, found ${players?.length ?? 0}`);
  }
  pass("exactly one players row exists after two runs");
  const playerId = players[0].id as string;

  // ── 3. Unlink never deletes ───────────────────────────────────────
  console.log("3. Clearing the placement (unlink, never delete)…");
  const { data: linked } = await db
    .from("tryout_registrations")
    .select(
      "id, player_full_name, parent_name, email, phone, graduation_year, position, tryout_type, tryout_date, payment_status, created_at, pipeline_status, placed_team, jersey_number, player_id, roster_confirmation_id, source, school, notes",
    )
    .eq("id", testReg.id)
    .single();
  await unlinkRegistration(db, linked as RegistrationRow);
  const { data: after } = await db
    .from("tryout_registrations")
    .select("placed_team, player_id, pipeline_status")
    .eq("id", testReg.id)
    .single();
  if (after?.placed_team !== null || after?.player_id !== null || after?.pipeline_status !== "offered") {
    fail("unlink", `registration not reset: ${JSON.stringify(after)}`);
  }
  const { data: survivor } = await db.from("players").select("id").eq("id", playerId);
  if (!survivor || survivor.length !== 1) fail("unlink", "players row was deleted — unacceptable");
  pass("registration back to Offered; players row survived");

  // ── 4. Add-a-girl idempotency ─────────────────────────────────────
  console.log("4. Add-a-girl (typed intake rows)…");
  const TYPED = "Zz Typedharness";
  const intake = {
    rowNumber: 99,
    name: TYPED,
    gradYear: 2032,
    position: "Attack",
    school: "Harness High",
    notes: null,
    parentName: null,
    email: null,
    phone: null,
    placeAttempted: null,
  };
  const snapBefore = await fetchSnapshot(db);

  const empty = await addTypedRecruit(db, { ...intake, name: "" }, snapBefore);
  if (empty.created || empty.line !== "") fail("intake", "blank name created a ghost");
  pass("blank name with data creates nothing, silently");

  const c1 = await addTypedRecruit(db, intake, snapBefore);
  if (!c1.created || !c1.line.includes("Added recruit")) fail("intake", `first add failed: ${c1.line}`);
  pass(`first sync: ${c1.line}`);

  // Second sync: the typed row is still on the sheet (run 1 crashed before
  // clearing it) — a fresh snapshot must flag, never duplicate.
  const snapAfter = await fetchSnapshot(db);
  const c2 = await addTypedRecruit(db, intake, snapAfter);
  if (c2.created) fail("intake", "second sync duplicated the typed girl");
  pass(`second sync stood down: ${c2.line}`);

  const vsPlayer = await addTypedRecruit(db, { ...intake, name: "Caylee Singleton" }, snapAfter);
  if (vsPlayer.created) fail("intake", "typed name duplicated a rostered player");
  pass(`rostered-player guard: ${vsPlayer.line}`);

  const vsRecruit = await addTypedRecruit(db, { ...intake, name: "Bella Crumb" }, snapAfter);
  if (vsRecruit.created) fail("intake", "typed name duplicated an existing recruit");
  pass(`existing-recruit guard: ${vsRecruit.line}`);

  const { data: typedRows } = await db
    .from("tryout_registrations")
    .select("id")
    .eq("player_full_name", TYPED);
  if (!typedRows || typedRows.length !== 1) {
    fail("intake", `expected exactly 1 typed recruit, found ${typedRows?.length ?? 0}`);
  }
  await db.from("tryout_registrations").delete().eq("player_full_name", TYPED);
  pass("exactly one recruiting row existed; cleaned up");

  // ── Cleanup — remove every trace of the harness ───────────────────
  console.log("5. Cleaning up test rows…");
  await db.from("tryout_registrations").delete().eq("id", testReg.id);
  await db.from("player_guardians").delete().eq("player_id", playerId);
  await db.from("players").delete().eq("id", playerId);
  await db.from("guardians").delete().eq("email", TEST_EMAIL);
  await db.from("sheet_sync_runs").delete().eq("trigger", "test");
  const { data: leftovers } = await db
    .from("players")
    .select("id")
    .eq("last_name", "Sheetharness");
  if (leftovers && leftovers.length > 0) fail("cleanup", "test player still present");
  pass("no test rows remain");

  console.log("\nAll checks passed.");
}

main().catch((err) => {
  console.error("Harness crashed:", err);
  process.exit(1);
});
