/**
 * Placement send — read-only diagnostic.
 *
 *   npx tsx scripts/diagnose-placements.ts
 *
 * Builds the exact audience the send screen shows, straight off the live
 * database, and proves the hard blocks fire. Writes nothing, sends nothing,
 * mints no tokens.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { getServiceClient } from "../src/lib/placement/config";
import { buildAudience } from "../src/lib/placement/audience";
import { loadTemplates, renderEmail } from "../src/lib/placement/templates";
import {
  approvalPhrase,
  bannedLanguageIn,
  isSendableTier,
  SENDABLE_TIERS,
} from "../src/lib/placement/shared";
import { PLACEMENT_TIERS } from "../src/lib/rosters/shared";

async function main() {
  const db = getServiceClient();
  if (!db) throw new Error("Missing Supabase env.");

  // Every value the roster vocabulary allows, and whether it can be emailed.
  // This is the check that catches a tier being added upstream without the
  // send path being told about it.
  console.log("\nTIER VOCABULARY");
  for (const t of [...PLACEMENT_TIERS, null]) {
    console.log(
      `  ${String(t ?? "(not placed)").padEnd(18)} ${isSendableTier(t) ? "SENDABLE" : "blocked"}`,
    );
  }

  // Addendum B3. The critical case is the LAST one: B1 permits "development"
  // for an activity — the club's own first pillar is "Own development in this
  // area" — so a checker that blocks the bare word would block the pillar.
  console.log("\nADDENDUM B3 WORD LIST");
  const cases: [string, boolean][] = [
    ["She is on our developmental squad.", true],
    ["Welcome to the development team.", true],
    ["She has been placed on the B team.", true],
    ["This is our second team.", true],
    ["She is on the lower team this year.", true],
    ["Tier 2 plays in June.", true],
    ["She didn't make it this time.", true],
    ["Unfortunately, we had hard decisions.", true],
    ["Own development in this area.", false],
    ["2030 Blue plays the same schedule.", false],
  ];
  let failures = 0;
  for (const [text, shouldBlock] of cases) {
    const hits = bannedLanguageIn(text);
    const blocked = hits.length > 0;
    const ok = blocked === shouldBlock;
    if (!ok) failures++;
    console.log(
      `  ${ok ? "PASS" : "FAIL"}  ${blocked ? "blocked" : "allowed"}  "${text}"${
        hits.length ? `  [${hits.join(", ")}]` : ""
      }`,
    );
  }
  if (failures) console.log(`  ${failures} FAILURE(S) — the B3 checker is wrong.`);

  const audience = await buildAudience(db);

  console.log(`\nCAMPAIGN  ${audience.campaign} · ${audience.season} season`);
  console.log(
    `EXCLUDED  ${
      audience.excluded.map((e) => `${e.count} ${e.label.toLowerCase()}`).join(" · ") ||
      "nobody"
    } — never in any send\n`,
  );

  console.log("GROUPS");
  for (const g of audience.groups) {
    console.log(
      `  ${g.label.padEnd(22)} ready ${String(g.ready.length).padStart(3)} · sent ${String(
        g.alreadySent.length,
      ).padStart(3)} · cannot contact ${String(g.cannotContact.length).padStart(3)}   [type "${approvalPhrase(g.tier)}"]`,
    );
    for (const a of g.cannotContact) {
      console.log(`      skip  ${a.name} — ${a.blockedBy}`);
    }
  }

  console.log("\nTEMPLATES");
  for (const t of audience.templateHealth) {
    const problems: string[] = [];
    if (t.unwritten.length) problems.push(`unwritten: ${t.unwritten.join(", ")}`);
    if (t.missingRegions.length) problems.push(`missing: ${t.missingRegions.join(", ")}`);
    if (t.banned.length) problems.push(`ADDENDUM B BANS: ${t.banned.join(", ")}`);
    const state = !t.found
      ? "NOT FOUND"
      : problems.length
        ? `blocked — ${problems.join("; ")}`
        : "ready";
    console.log(`  ${t.templateName.padEnd(38)} ${state}`);
  }

  // Prove the block: render a real athlete shape against the live templates.
  console.log("\nHARD-BLOCK PROOF (a fictional athlete, nothing written)");
  const bundle = await loadTemplates(db);
  for (const tier of SENDABLE_TIERS) {
    const r = renderEmail(
      bundle,
      "placement",
      {
        name: "Test Athlete",
        classYear: 2030,
        tier,
        parentName: "Test Parent",
        confirmUrl: "https://example.invalid/placement/TEST",
      },
      "https://example.invalid/placement/TEST",
    );
    console.log(
      `  ${tier.padEnd(16)} ${r.ok ? "WOULD SEND" : `REFUSED (${r.reason}) — ${r.detail}`}`,
    );
  }
  console.log();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
