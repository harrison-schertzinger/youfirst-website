/**
 * THE SEVEN LETTERS — what each family actually receives.
 *
 *   npx tsx scripts/prove-seven-letters.ts
 *
 * Renders each of tonight's seven through the REAL send path: the same
 * buildAudience() the screen reads, the same renderEmail() sendGroup() calls,
 * the same templates loaded from the database. Not previewAthlete(), which
 * mints a token; not a sample body; not a hand-built context.
 *
 * For each recipient it prints the four things a wrong letter would show up in
 * — subject, greeting, the team named in the body, the confirmation deadline —
 * and names the template that was selected and the reason it was selected.
 *
 * WRITES NOTHING AND SENDS NOTHING. buildAudience(), loadTemplates() and
 * renderEmail() are pure reads; issueToken() is deliberately not called, so the
 * link rendered here is a placeholder and the real one is minted by the send.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { getServiceClient } from "../src/lib/placement/config";
import { buildAudience } from "../src/lib/placement/audience";
import { loadTemplates, renderEmail } from "../src/lib/placement/templates";
import {
  PLACEMENT_DEADLINE,
  placementTemplateFor,
  YOUTH_LETTER_MIN_CLASS,
} from "../src/lib/placement/shared";

const TONIGHT = [
  "Summer Graupe",
  "Evelyn Lake",
  "Cam Bahl",
  "Elizabeth Vaughn",
  "Grace Lanzillotta",
  "Piper Brown",
  "Leona Meinerding",
];

const PLACEHOLDER_URL = "https://www.youfirstlacrosse.com/placement/DRY-RUN-NOT-MINTED";

/** The plain-text paragraph containing a phrase, for quoting in the report. */
function findLine(text: string, needle: string): string | null {
  const hit = text
    .split(/\n+/)
    .map((l) => l.trim())
    .find((l) => l.includes(needle));
  return hit ?? null;
}

async function main() {
  const db = getServiceClient();
  if (!db) throw new Error("Service-role env vars not configured.");

  const [audience, bundle] = await Promise.all([buildAudience(db), loadTemplates(db)]);

  const ready = audience.groups.flatMap((g) =>
    g.ready.map((c) => ({ c, group: g })),
  );

  let problems = 0;

  for (const name of TONIGHT) {
    const found = ready.find((r) => r.c.name === name);
    console.log(`\n${"═".repeat(74)}`);
    if (!found) {
      problems++;
      console.log(`✗ ${name} — NOT STAGED. No letter to prove.`);
      continue;
    }
    const { c, group } = found;

    const letter = placementTemplateFor(c.tier, c.classYear);
    const why =
      c.tier === "blue" || c.tier === "elite_training"
        ? `tier '${c.tier}' — a situation, not a class`
        : `graduation year ${c.classYear} ${
            (c.classYear ?? 0) >= YOUTH_LETTER_MIN_CLASS ? "≥" : "<"
          } ${YOUTH_LETTER_MIN_CLASS}`;

    const r = renderEmail(
      bundle,
      "placement",
      {
        name: c.name,
        classYear: c.classYear,
        tier: c.tier,
        parentName: c.parentName,
        confirmUrl: PLACEHOLDER_URL,
      },
      PLACEHOLDER_URL,
    );

    console.log(`${c.name}   ·   class ${c.classYear}   ·   ${c.email}`);
    console.log(`  group on screen : ${group.classKey} — ${group.label}`);
    console.log(`  stored tier     : ${c.tier}`);
    console.log(`  TEMPLATE        : ${letter}`);
    console.log(`  chosen because  : ${why}`);

    if (!r.ok) {
      problems++;
      console.log(`  ✗ WOULD NOT RENDER — ${r.reason}: ${r.detail}`);
      continue;
    }

    const text = r.email.text;
    console.log(`  subject         : "${r.email.subject}"`);
    console.log(`  greeting        : "${c.greeting}"`);
    console.log(`  team in body    : "${findLine(text, "has a spot")}"`);
    console.log(`  deadline line   : "${findLine(text, "confirm by")}"`);

    // The four failure modes named in the brief, asserted rather than eyeballed.
    const teamLine = findLine(text, "has a spot") ?? "";
    if (!teamLine.includes(c.placementLabel)) {
      problems++;
      console.log(`  ✗ body does not name her team (${c.placementLabel})`);
    }
    if (/development program|development platform|development team/i.test(text)) {
      console.log(
        `  ⚠ still contains retired "development" prose — see the sweep below`,
      );
    }
    if (!text.includes(PLACEMENT_DEADLINE)) {
      problems++;
      console.log(`  ✗ deadline is not ${PLACEMENT_DEADLINE}`);
    }
    if (/August 7/.test(text)) {
      problems++;
      console.log(`  ✗ STALE DATE — still says August 7`);
    }
  }

  // ── The sweep, over exactly the letters tonight's seven receive ──────────
  console.log(`\n${"═".repeat(74)}`);
  console.log('RETIRED "DEVELOPMENT" PROSE — in tonight\'s letters only\n');
  const tonightLetters = new Set(
    ready
      .filter((r) => TONIGHT.includes(r.c.name))
      .map((r) => placementTemplateFor(r.c.tier, r.c.classYear))
      .filter((n): n is string => n != null),
  );
  for (const name of tonightLetters) {
    const tpl = bundle.byName.get(name);
    if (!tpl) continue;
    console.log(`  ${name}`);
    for (const line of tpl.body.split(/\n+/)) {
      if (/development (program|platform|team)/i.test(line)) {
        console.log(`    · ${line.trim()}`);
      }
    }
  }

  console.log(
    problems === 0
      ? "\n✓ Seven letters proved. Nothing has been sent.\n"
      : `\n✗ ${problems} problem(s) above. Nothing has been sent.\n`,
  );
  process.exit(problems === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
