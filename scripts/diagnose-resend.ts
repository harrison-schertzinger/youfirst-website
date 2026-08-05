/**
 * Placement RESEND — read-only diagnostic.
 *
 *   npx tsx scripts/diagnose-resend.ts
 *
 * Proves, against the live database, that the resend path offers itself to
 * exactly the right families and refuses everyone else. It exercises the guard
 * chain by calling the real resendPlacement() — but only ever against athletes
 * it has first confirmed will be REFUSED, and every refusal returns before the
 * function writes, claims, mints or corrects anything.
 *
 * Two independent reasons nothing can be emailed by running this:
 *   1. Every target is chosen because it is already blocked.
 *   2. RESEND_API_KEY lives only in Vercel, so sendViaResend has no key to send
 *      with locally even if a guard were wrong.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { getServiceClient, confirmUrl } from "../src/lib/placement/config";
import { buildAudience } from "../src/lib/placement/audience";
import { resendPlacement } from "../src/lib/placement/send";
import { RESEND_BLOCK_LABEL, deliveryLabel } from "../src/lib/placement/shared";
import type { SendAudience, SendCandidate } from "../src/lib/placement/shared";

const WOLL_TOKEN_ID = "05642399-5d09-4749-a3f5-0af70fe14fe3";

function everyone(data: SendAudience): SendCandidate[] {
  const out: SendCandidate[] = [];
  for (const g of data.groups) {
    out.push(...g.ready, ...g.alreadySent, ...g.cannotContact);
  }
  out.push(...data.noClassYear);
  return out;
}

async function main() {
  const db = getServiceClient();
  if (!db) throw new Error("Service-role env vars not configured.");

  const audience = await buildAudience(db);
  const all = everyone(audience);

  // ── 1. Who is offered a resend ────────────────────────────────────────
  const offered = all.filter((a) => a.canResend);
  const blocked = all.filter((a) => !a.canResend);
  const byReason = new Map<string, number>();
  for (const a of blocked) {
    const k = a.resendBlockedBy ?? "unknown";
    byReason.set(k, (byReason.get(k) ?? 0) + 1);
  }

  console.log("\n── RESEND AVAILABILITY ──────────────────────────────────");
  console.log(`${all.length} placed athletes · ${offered.length} can be resent to`);
  for (const [reason, count] of byReason) {
    console.log(`  ${count} blocked — ${reason}`);
  }

  // The rule the whole screen turns on.
  const confirmedOffered = all.filter((a) => a.confirmedAt && a.canResend);
  console.log(
    confirmedOffered.length === 0
      ? "  ✓ No confirmed family is offered a resend."
      : `  ✗ ${confirmedOffered.length} CONFIRMED families are offered a resend — STOP.`,
  );

  const neverSentOffered = all.filter((a) => !a.sentAt && a.canResend);
  console.log(
    neverSentOffered.length === 0
      ? "  ✓ No athlete who never received the original is offered a resend."
      : `  ✗ ${neverSentOffered.length} never-sent athletes are offered a resend — STOP.`,
  );

  // ── 2. Where an email actually went vs where the roster points ────────
  const mismatched = all.filter(
    (a) => a.history.lastSentTo && a.history.lastSentTo !== a.email,
  );
  console.log("\n── SENT SOMEWHERE OTHER THAN THE ADDRESS ON FILE ────────");
  if (mismatched.length === 0) {
    console.log("  none");
  }
  for (const a of mismatched) {
    console.log(
      `  ${a.name}: on file ${a.email ?? "—"} · went to ${a.history.lastSentTo}`,
    );
  }

  // ── 3. Elizabeth Woll ─────────────────────────────────────────────────
  const woll = all.find((a) => a.name.toLowerCase().includes("woll"));
  console.log("\n── ELIZABETH WOLL ──────────────────────────────────────");
  if (!woll) {
    console.log("  not found in the placed audience");
  } else {
    console.log(`  ${woll.name} · ${woll.placementLabel}`);
    console.log(`  address on file: ${woll.email ?? "—"}`);
    console.log(`  confirmed:       ${woll.confirmedAt ?? "no"}`);
    console.log(
      `  resend offered:  ${woll.canResend ? "yes" : `no — ${woll.resendBlockedBy}`}`,
    );
    for (const e of [
      ...(woll.history.original ? [woll.history.original] : []),
      ...woll.history.resends,
    ]) {
      console.log(
        `    ${e.kind === "resend" ? "resent" : "sent"} ${e.at} → ${e.to} · ${deliveryLabel(e.delivery)}`,
      );
    }
  }

  // ── 4. The guards, fired for real ─────────────────────────────────────
  console.log("\n── GUARDS ──────────────────────────────────────────────");

  const confirmedTarget = all.find((a) => a.resendBlockedBy === "confirmed");
  const neverSentTarget = all.find((a) => a.resendBlockedBy === "never_sent");

  const check = async (label: string, key: string, expect: string) => {
    const r = await resendPlacement(db, {
      athleteKey: key,
      mode: "live",
      actor: "diagnose-resend.ts",
    });
    const got = r.refusalCode ?? (r.ok ? "SENT" : "refused");
    console.log(
      `  ${got === expect ? "✓" : "✗"} ${label}: ${got}` +
        (r.refusal ? ` — ${r.refusal}` : ""),
    );
  };

  if (confirmedTarget) {
    await check(
      `a confirmed family (${confirmedTarget.name})`,
      confirmedTarget.key,
      "confirmed",
    );
  }
  if (neverSentTarget) {
    await check(
      `never received the original (${neverSentTarget.name})`,
      neverSentTarget.key,
      "never_sent",
    );
  }
  await check("an athlete who does not exist", "reg:not-a-real-key", "not_found");

  console.log("\n── BLOCK VOCABULARY ────────────────────────────────────");
  for (const [k, v] of Object.entries(RESEND_BLOCK_LABEL)) {
    console.log(`  ${k.padEnd(14)} ${v}`);
  }

  // ── 5. The link Harrison can text ─────────────────────────────────────
  const { data: token } = await db
    .from("placement_tokens")
    .select("token, athlete_name, recipient_email, confirmed_at, expires_at")
    .eq("id", WOLL_TOKEN_ID)
    .maybeSingle();
  if (token) {
    console.log("\n── CONFIRM URL ─────────────────────────────────────────");
    console.log(`  ${token.athlete_name} → ${token.recipient_email}`);
    console.log(`  confirmed: ${token.confirmed_at ?? "no"} · expires ${token.expires_at}`);
    console.log(`  ${confirmUrl(token.token as string)}`);
  }

  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
