/**
 * TONIGHT'S SEND — the real one.
 *
 *   npx tsx scripts/send-tonight.ts test        # step 2: one email to Harrison
 *   npx tsx scripts/send-tonight.ts 2031        # step 3.1
 *   npx tsx scripts/send-tonight.ts 2032        # step 3.2
 *   npx tsx scripts/send-tonight.ts 2033/2034   # step 3.3
 *   npx tsx scripts/send-tonight.ts woll        # step 4, alone
 *
 * ONE GROUP PER INVOCATION, ON PURPOSE. Harrison stops and reads after each.
 * There is no "all" argument, so a single mistyped command cannot fire the
 * whole list, and a failure cannot be walked past by a loop that keeps going.
 *
 * This calls sendGroup() and resendPlacement() — the same functions the admin
 * route calls, rendering through the same templates and delivering through the
 * same sendViaResend(). It is not a parallel sender.
 */

import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { getServiceClient } from "../src/lib/placement/config";
import { sendGroup, resendPlacement } from "../src/lib/placement/send";
import { approvalPhrase, SEND_KINDS } from "../src/lib/placement/shared";

const ACTOR = "harrison@theyoufirstproject.com";
const HARRISON = "harrison@theyoufirstproject.com";

/** Elizabeth Woll's registration, and the address that must survive her send. */
const WOLL_KEY = "reg:9c48cb11-758d-45a9-b64e-45a5e0764b49";
const WOLL_REG = "9c48cb11-758d-45a9-b64e-45a5e0764b49";
const WOLL_TOKEN = "05642399-5d09-4749-a3f5-0af70fe14fe3";
const SARAH = "sarah.woll@hotmail.com";

/** Step 2 renders a real athlete's letter but delivers it to Harrison only. */
const TEST_ATHLETE = "reg:d49fcedc-0f11-4b77-8807-a1a41935c009"; // Summer Graupe

type Db = NonNullable<ReturnType<typeof getServiceClient>>;

/** The log rows this run wrote, read back out of the database. */
async function showLog(db: Db, kinds: string[], since: string) {
  const { data, error } = await db
    .from("hermes_send_log")
    .select("id, kind, status, recipient_email, cycle_key, subject, created_at, detail")
    .in("kind", kinds)
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Log read failed: ${error.message}`);
  const rows = data ?? [];

  console.log(`\n  hermes_send_log rows written (${rows.length}):`);
  const ids: string[] = [];
  for (const r of rows as Record<string, string>[]) {
    ids.push(r.id);
    const resendId = (r.detail as unknown as { resend_id?: string })?.resend_id ?? "—";
    console.log(
      `    ${r.kind.padEnd(17)} ${r.status.padEnd(8)} ${String(r.recipient_email).padEnd(32)} resend_id ${resendId}`,
    );
  }
  if (ids.length === 0) return;

  const { data: dels, error: dErr } = await db
    .from("hermes_email_deliveries")
    .select("send_log_id, recipient_email, status, resend_id, last_event_at")
    .in("send_log_id", ids);
  if (dErr) throw new Error(`Delivery read failed: ${dErr.message}`);
  console.log(`\n  hermes_email_deliveries rows (${(dels ?? []).length}):`);
  for (const d of (dels ?? []) as Record<string, string>[]) {
    console.log(
      `    ${String(d.recipient_email).padEnd(32)} ${String(d.status).padEnd(12)} last_event ${d.last_event_at ?? "—"}`,
    );
  }
}

async function main() {
  const which = process.argv[2];
  if (!which) throw new Error("Name the group: test | 2031 | 2032 | 2033/2034 | woll");

  const db = getServiceClient();
  if (!db) throw new Error("Service-role env vars not configured.");
  const since = new Date(Date.now() - 5_000).toISOString();

  // ── STEP 4: Elizabeth Woll, alone ───────────────────────────────────────
  if (which === "woll") {
    // Read her address FIRST and pass exactly that. resendPlacement only calls
    // correctAddress when the requested address DIFFERS from the one on file —
    // passing the address already on file means correctionRequested is null and
    // the write never happens. Belt and braces: it is re-read and asserted after.
    const { data: before, error: bErr } = await db
      .from("tryout_registrations")
      .select("email")
      .eq("id", WOLL_REG)
      .single();
    if (bErr) throw new Error(`Address read failed: ${bErr.message}`);
    const onFile = (before.email as string) ?? "";
    if (onFile.toLowerCase() !== SARAH) {
      throw new Error(
        `REFUSING: her address on file is "${onFile}", not ${SARAH}. Nothing sent.`,
      );
    }

    console.log(`\nELIZABETH WOLL — resend, alone`);
    console.log(`  address on file : ${onFile}`);
    console.log(`  passing         : ${onFile}  (identical → no address write)\n`);

    const r = await resendPlacement(db, {
      athleteKey: WOLL_KEY,
      mode: "live",
      email: onFile,
      actor: ACTOR,
    });

    console.log(`  result   : ${r.ok ? "SENT" : "REFUSED"}`);
    if (!r.ok) console.log(`  reason   : ${r.refusalCode} — ${r.refusal}`);
    if (r.ok) {
      console.log(`  to       : ${r.to}`);
      console.log(`  attempt  : #${r.attempt}`);
    }
    if (r.correction) {
      console.log(`  ⚠ ADDRESS WAS REWRITTEN: ${r.correction.from} → ${r.correction.to}`);
    } else {
      console.log(`  address write : none (correctAddress not called)`);
    }

    // ── The assertion that matters ────────────────────────────────────────
    const [{ data: regAfter }, { data: tokAfter }] = await Promise.all([
      db.from("tryout_registrations").select("email").eq("id", WOLL_REG).single(),
      db.from("placement_tokens").select("recipient_email").eq("id", WOLL_TOKEN).single(),
    ]);
    const regEmail = (regAfter?.email as string) ?? "";
    const tokEmail = (tokAfter?.recipient_email as string) ?? "";
    console.log(`\n  AFTER THE SEND:`);
    console.log(
      `    reg.email             : ${regEmail}  ${regEmail.toLowerCase() === SARAH ? "✓" : "✗ CHANGED"}`,
    );
    console.log(
      `    token.recipient_email : ${tokEmail}  ${tokEmail.toLowerCase() === SARAH ? "✓" : "✗ CHANGED"}`,
    );

    await showLog(db, [SEND_KINDS.resend, SEND_KINDS.test], since);

    const bad =
      !r.ok || regEmail.toLowerCase() !== SARAH || tokEmail.toLowerCase() !== SARAH;
    console.log(bad ? "\n✗ PROBLEM — read the lines above.\n" : "\n✓ Sent. Her address is unchanged.\n");
    process.exit(bad ? 1 : 0);
  }

  // ── STEP 2 + STEP 3: group sends ────────────────────────────────────────
  const isTest = which === "test";
  const classKey = isTest ? "2031" : which;
  if (!["2031", "2032", "2033/2034"].includes(classKey)) {
    throw new Error(`Unknown group "${which}".`);
  }

  console.log(
    isTest
      ? `\nSTEP 2 — TEST. One letter, rendered for real, delivered to ${HARRISON} only.\n`
      : `\nLIVE SEND — Class of ${classKey} Elite   ·   "${approvalPhrase("elite", classKey)}"\n`,
  );

  const report = await sendGroup(db, {
    tier: "elite",
    classKey,
    mode: isTest ? "test" : "live",
    testTo: isTest ? HARRISON : undefined,
    // Honoured in test mode only — live ignores it by design, so a live run can
    // never look complete while most of the group silently went nowhere.
    athleteKey: isTest ? TEST_ATHLETE : undefined,
    actor: ACTOR,
  });

  if (report.refusal) {
    console.log(`  REFUSED: ${report.refusal}`);
    process.exit(1);
  }

  console.log(`  attempted : ${report.attempted}`);
  console.log(`  sent      : ${report.sent.length}`);
  for (const s of report.sent) console.log(`      ✓ ${s.name.padEnd(22)} ${s.email}`);
  console.log(`  failed    : ${report.failed.length}`);
  for (const f of report.failed) console.log(`      ✗ ${f.name.padEnd(22)} ${f.email} — ${f.error}`);
  console.log(`  skipped   : ${report.skipped.length}`);
  for (const s of report.skipped) console.log(`      · ${s.name.padEnd(22)} ${s.detail}`);

  await showLog(db, isTest ? [SEND_KINDS.test] : [SEND_KINDS.placement], since);

  const bad = report.failed.length > 0 || report.sent.length === 0;
  console.log(bad ? "\n✗ STOP — do not continue to the next group.\n" : "\n✓ Group complete.\n");
  process.exit(bad ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
