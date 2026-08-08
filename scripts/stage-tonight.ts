/**
 * TONIGHT'S SEND — read-only staging proof.
 *
 *   npx tsx scripts/stage-tonight.ts
 *
 * Prints exactly who would receive an email if Harrison approved every group on
 * /admin/placements right now, renders each letter to prove it is sendable, and
 * fails loudly if any family would be reached twice.
 *
 * WRITES NOTHING AND SENDS NOTHING. It calls buildAudience() and renderEmail(),
 * both pure reads. It deliberately does NOT call issueToken(), which would mint
 * a row — the four untokened athletes render against a placeholder URL, and the
 * real link is minted by the send itself, idempotently, at the moment Harrison
 * approves.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { getServiceClient } from "../src/lib/placement/config";
import { buildAudience } from "../src/lib/placement/audience";
import { loadTemplates } from "../src/lib/placement/templates";
import { renderEmail } from "../src/lib/placement/templates";
import {
  approvalPhrase,
  SKIP_REASON_LABEL,
  type SendCandidate,
} from "../src/lib/placement/shared";

/** The seven families this sprint exists to reach. */
const TONIGHT = new Map<string, string>([
  ["Elizabeth Vaughn", "token from Aug 6, never sent — leave the token alone"],
  ["Summer Graupe", "token from Aug 6, never sent — leave the token alone"],
  ["Leona Meinerding", "token from Aug 6, never sent — leave the token alone"],
  ["Cam Bahl", "placed, never tokened"],
  ["Piper Brown", "placed, never tokened"],
  ["Grace Lanzillotta", "placed, never tokened"],
  ["Evelyn Lake", "normalized onto her class Elite team, never tokened"],
]);

const PLACEHOLDER_URL = "https://www.youfirstlacrosse.com/placement/DRY-RUN-NOT-MINTED";

function line(c: SendCandidate, tokenExpiry: string | null): string {
  const exp = tokenExpiry ? ` · link expires ${tokenExpiry.slice(0, 10)}` : " · no token yet";
  return `      ${c.name.padEnd(22)} ${(c.email ?? "—").padEnd(34)} ${c.greeting ?? "NO GREETING"}${exp}`;
}

async function main() {
  const db = getServiceClient();
  if (!db) throw new Error("Service-role env vars not configured.");

  const [audience, bundle] = await Promise.all([
    buildAudience(db),
    loadTemplates(db),
  ]);

  // Token expiries, read once. Never written here.
  const { data: tokenRows } = await db
    .from("placement_tokens")
    .select("athlete_table, athlete_id, expires_at, confirmed_at")
    .eq("campaign", audience.campaign);
  const expiryByKey = new Map<string, string>();
  for (const t of (tokenRows ?? []) as {
    athlete_table: string;
    athlete_id: string;
    expires_at: string;
  }[]) {
    expiryByKey.set(
      `${t.athlete_table === "players" ? "player" : "reg"}:${t.athlete_id}`,
      t.expires_at,
    );
  }

  console.log("\n══ WHO WOULD BE EMAILED, BY APPROVABLE GROUP ══════════════\n");

  const everyRecipient: { name: string; email: string; group: string }[] = [];
  let renderFailures = 0;

  for (const g of audience.groups) {
    const cls = g.classKey ? `Class of ${g.classKey}` : "Blue";
    console.log(`  ${cls} — ${g.label}`);
    console.log(`    approval phrase:  "${approvalPhrase(g.tier, g.classKey)}"`);
    console.log(
      `    ready ${g.ready.length} · already sent ${g.alreadySent.length} · cannot contact ${g.cannotContact.length}`,
    );

    if (g.ready.length > 0) {
      console.log("    WOULD RECEIVE AN EMAIL:");
      for (const c of g.ready) {
        console.log(line(c, expiryByKey.get(c.key) ?? null));
        everyRecipient.push({
          name: c.name,
          email: (c.email ?? "").toLowerCase(),
          group: `${cls} ${g.label}`,
        });

        // Prove the letter actually renders for her, with her team's name in it.
        const r = renderEmail(
          bundle,
          "placement",
          {
            name: c.name,
            classYear: c.classYear,
            tier: c.tier,
            parentName: c.parentName,
            confirmUrl: expiryByKey.has(c.key) ? PLACEHOLDER_URL : PLACEHOLDER_URL,
          },
          PLACEHOLDER_URL,
        );
        if (!r.ok) {
          renderFailures++;
          console.log(`         ✗ WOULD NOT RENDER — ${r.reason}: ${r.detail}`);
        } else {
          console.log(`         subject: "${r.email.subject}"`);
        }
      }
    }
    for (const c of g.cannotContact) {
      console.log(
        `      (held back) ${c.name} — ${SKIP_REASON_LABEL[c.blockedBy!] ?? c.blockedBy}`,
      );
    }
    console.log("");
  }

  // ── The seven, accounted for individually ────────────────────────────────
  console.log("══ THE SEVEN THIS SPRINT IS FOR ═══════════════════════════\n");
  const readyNames = new Set(
    audience.groups.flatMap((g) => g.ready.map((c) => c.name)),
  );
  let missing = 0;
  for (const [name, why] of TONIGHT) {
    const ok = readyNames.has(name);
    if (!ok) missing++;
    console.log(`  ${ok ? "✓" : "✗"} ${name.padEnd(22)} ${why}`);
    if (!ok) {
      const found = audience.groups
        .flatMap((g) => [...g.alreadySent, ...g.cannotContact])
        .find((c) => c.name === name);
      console.log(
        `      NOT STAGED — ${
          found
            ? `${found.blockedBy ?? "already sent"}`
            : "not in the placed audience at all"
        }`,
      );
    }
  }

  // ── Nobody twice ─────────────────────────────────────────────────────────
  console.log("\n══ DOUBLE-EMAIL CHECK ═════════════════════════════════════\n");
  const byEmail = new Map<string, string[]>();
  for (const r of everyRecipient) {
    const list = byEmail.get(r.email) ?? [];
    list.push(`${r.name} (${r.group})`);
    byEmail.set(r.email, list);
  }
  const collisions = [...byEmail.entries()].filter(([, v]) => v.length > 1);
  if (collisions.length === 0) {
    console.log(
      `  ✓ ${everyRecipient.length} recipients, ${byEmail.size} distinct addresses — no family reached twice.`,
    );
  } else {
    for (const [email, who] of collisions) {
      console.log(`  ✗ ${email} would receive ${who.length}: ${who.join(" · ")}`);
    }
  }

  const unexpected = everyRecipient.filter((r) => !TONIGHT.has(r.name));
  console.log(
    unexpected.length === 0
      ? "  ✓ No athlete outside tonight's seven is staged to receive anything."
      : `  ✗ UNEXPECTED RECIPIENTS: ${unexpected.map((u) => u.name).join(", ")}`,
  );

  const bad = missing + renderFailures + collisions.length + unexpected.length;
  console.log(
    bad === 0
      ? "\n✓ STAGED AND VERIFIED. Nothing has been sent.\n"
      : `\n✗ ${bad} problem(s) above. Nothing has been sent.\n`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
