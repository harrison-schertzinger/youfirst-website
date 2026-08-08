/**
 * ELIZABETH WOLL — the resend case, proved read-only.
 *
 *   npx tsx scripts/prove-woll.ts
 *
 * She is 2029, so she receives the ELITE letter, not the youth letter tonight's
 * seven receive. Different group, different approval phrase, and a different
 * path: she has already been sent once, so reaching her is a RESEND, not a send.
 *
 * This proves four separate things and writes none of them:
 *   1. the retired duplicate (Liz Woll) is absent from the roster and from the
 *      audience, so she can be neither a second athlete nor a second recipient;
 *   2. Elizabeth is present, in the 2029 Elite group, blocked as already_sent
 *      and offered as a resend;
 *   3. her ELITE letter renders, greeted to Sarah, dated the 15th;
 *   4. her live confirm URL, printed so Harrison can text it to Sarah directly
 *      if the resend path does not deliver.
 *
 * WRITES NOTHING AND SENDS NOTHING. buildRosterData(), buildAudience(),
 * loadTemplates() and renderEmail() are pure reads. The token is READ, never
 * issued — issueToken() would re-stamp recipient_email, and the whole point of
 * this athlete is that her token's address was corrected by hand.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { getServiceClient, confirmUrl } from "../src/lib/placement/config";
import { buildRosterData } from "../src/lib/rosters/data";
import { buildAudience } from "../src/lib/placement/audience";
import { loadTemplates, renderEmail } from "../src/lib/placement/templates";
import {
  approvalPhrase,
  PLACEMENT_DEADLINE,
  placementTemplateFor,
  RESEND_BLOCK_LABEL,
  SKIP_REASON_LABEL,
  YOUTH_LETTER_MIN_CLASS,
} from "../src/lib/placement/shared";

const REAL_REG = "9c48cb11-758d-45a9-b64e-45a5e0764b49";
const DUP_REG = "73e818ee-9983-4191-9dba-c7bdc2fd1cc7";
const SARAH = "sarah.woll@hotmail.com";

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

  let problems = 0;
  const bad = (msg: string) => {
    problems++;
    console.log(`  ✗ ${msg}`);
  };

  const [roster, audience, bundle] = await Promise.all([
    buildRosterData(db),
    buildAudience(db),
    loadTemplates(db),
  ]);

  // ── 1. The duplicate is gone from every surface ─────────────────────────
  console.log("\n══ THE DUPLICATE ══════════════════════════════════════════\n");
  const wolls = roster.athletes.filter((a) => /woll/i.test(a.name));
  console.log(`  Woll rows on the roster: ${wolls.length}`);
  for (const w of wolls) {
    console.log(`    ${w.key}  ${w.name}  class ${w.classYear}  tier ${w.placementTier}`);
  }
  if (wolls.some((w) => w.id === DUP_REG)) bad("Liz Woll is STILL on the roster");
  if (wolls.length !== 1) bad(`expected exactly one Woll on the roster, found ${wolls.length}`);

  const dupInAudience = audience.groups
    .flatMap((g) => [...g.ready, ...g.alreadySent, ...g.cannotContact])
    .concat(audience.noClassYear)
    .filter((c) => c.id === DUP_REG);
  console.log(`  Liz Woll appearances in the send audience: ${dupInAudience.length}`);
  if (dupInAudience.length > 0) bad("Liz Woll is a send candidate");

  // ── 2. Elizabeth, in her group, as a resend ─────────────────────────────
  console.log("\n══ ELIZABETH WOLL — HER GROUP ═════════════════════════════\n");
  let found: { c: (typeof audience.groups)[number]["ready"][number]; g: (typeof audience.groups)[number] } | null =
    null;
  for (const g of audience.groups) {
    for (const c of [...g.ready, ...g.alreadySent, ...g.cannotContact]) {
      if (c.id === REAL_REG) found = { c, g };
    }
  }
  if (!found) {
    bad("Elizabeth Woll is not in the audience at all");
    console.log(`\n✗ ${problems} problem(s). Nothing written, nothing sent.\n`);
    process.exit(1);
  }
  const { c, g } = found;

  console.log(`  group           : Class of ${g.classKey} — ${g.label}`);
  console.log(`  approval phrase : "${approvalPhrase(g.tier, g.classKey)}"`);
  console.log(`  stored tier     : ${c.tier}   ·   class ${c.classYear}`);
  console.log(`  address on file : ${c.email}`);
  console.log(
    `  send status     : ${c.blockedBy ? SKIP_REASON_LABEL[c.blockedBy] : "READY (unsent)"}`,
  );
  console.log(`  originally sent : ${c.history.original?.at ?? "—"} → ${c.history.original?.to ?? "—"}`);
  console.log(`  resends so far  : ${c.history.resends.length}`);
  console.log(
    `  RESEND OFFERED  : ${c.canResend ? "YES" : `NO — ${c.resendBlockedBy ? RESEND_BLOCK_LABEL[c.resendBlockedBy] : "?"}`}`,
  );

  if (c.email?.toLowerCase() !== SARAH) bad(`address on file is not Sarah's (${c.email})`);
  if (c.blockedBy !== "already_sent") bad(`expected already_sent, got ${c.blockedBy}`);
  if (!c.canResend) bad("the resend control is not offered — she cannot be reached this way");
  if (c.history.original?.to?.toLowerCase() === SARAH) {
    bad("the original already went to Sarah — this is not the case we think it is");
  }

  // ── 3. Her letter — the ELITE one ───────────────────────────────────────
  console.log("\n══ HER LETTER ═════════════════════════════════════════════\n");
  const letter = placementTemplateFor(c.tier, c.classYear);
  const why = `graduation year ${c.classYear} < ${YOUTH_LETTER_MIN_CLASS}`;
  const r = renderEmail(
    bundle,
    "placement",
    {
      name: c.name,
      classYear: c.classYear,
      tier: c.tier,
      parentName: c.parentName,
      confirmUrl: "https://www.youfirstlacrosse.com/placement/DRY-RUN-NOT-MINTED",
    },
    "https://www.youfirstlacrosse.com/placement/DRY-RUN-NOT-MINTED",
  );
  console.log(`  TEMPLATE        : ${letter}`);
  console.log(`  chosen because  : ${why}`);
  if (letter !== "Placement — Elite") bad(`expected the Elite letter, got ${letter}`);

  if (!r.ok) {
    bad(`WOULD NOT RENDER — ${r.reason}: ${r.detail}`);
  } else {
    const text = r.email.text;
    console.log(`  subject         : "${r.email.subject}"`);
    console.log(`  greeting        : "${c.greeting}"`);
    console.log(`  team in body    : "${findLine(text, "has a spot")}"`);
    console.log(`  deadline line   : "${findLine(text, "confirm by")}"`);
    if (c.greeting !== "Sarah —") bad(`greeting is "${c.greeting}", not "Sarah —"`);
    if (!text.includes(PLACEMENT_DEADLINE)) bad(`deadline is not ${PLACEMENT_DEADLINE}`);
    if (/August 7/.test(text)) bad("STALE DATE — still says August 7");
    if (!(findLine(text, "has a spot") ?? "").includes(c.placementLabel)) {
      bad(`body does not name her team (${c.placementLabel})`);
    }
  }

  // ── 4. The live link, for the manual path ───────────────────────────────
  console.log("\n══ HER CONFIRM URL — live, already minted ═════════════════\n");
  const { data: tok, error } = await db
    .from("placement_tokens")
    .select("token, recipient_email, expires_at, confirmed_at")
    .eq("athlete_table", "tryout_registrations")
    .eq("athlete_id", REAL_REG)
    .maybeSingle();
  if (error) throw new Error(`Token read failed: ${error.message}`);
  if (!tok) {
    bad("no token on file");
  } else {
    console.log(`  ${confirmUrl(tok.token as string)}`);
    console.log(`\n  token points at : ${tok.recipient_email}`);
    console.log(`  expires         : ${tok.expires_at}`);
    console.log(`  confirmed       : ${tok.confirmed_at ?? "no"}`);
    if ((tok.recipient_email as string)?.toLowerCase() !== SARAH) {
      bad("the token does not point at Sarah");
    }
  }

  console.log(
    problems === 0
      ? "\n✓ Elizabeth Woll verified. Nothing written, nothing sent.\n"
      : `\n✗ ${problems} problem(s) above. Nothing written, nothing sent.\n`,
  );
  process.exit(problems === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
