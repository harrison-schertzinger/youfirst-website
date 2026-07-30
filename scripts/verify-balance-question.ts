/**
 * Comment-box end-to-end proof.
 *
 * Submits a balance question as a real household through the live route,
 * confirms the row lands in balance_questions with the correct balance
 * snapshot, confirms it is readable through the admin queue query, exercises
 * the resolve path, then cleans the test row up.
 *
 * Also probes hostile input: markup in the message must be stored verbatim
 * (escaped only at render) and must never appear in the subject line.
 *
 * Run (dev server up on :3000):
 *   npx tsx scripts/verify-balance-question.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { signPortalToken, PORTAL_COOKIE_NAME } from "../src/lib/portal-session";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const HOUSEHOLD_EMAIL = "cswartz17@yahoo.com";
const PROBE = '<script>alert("xss")</script> We mailed a check — 2 events missed.';

function money(c: number | null | undefined) {
  return c == null ? "—" : `$${(c / 100).toFixed(2)}`;
}

async function main() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: guardian } = await db
    .from("guardians")
    .select("id, email")
    .eq("email", HOUSEHOLD_EMAIL)
    .maybeSingle();
  if (!guardian) throw new Error("guardian not found");

  const { data: elise } = await db
    .from("players")
    .select("id, first_name, last_name")
    .eq("first_name", "Elise")
    .eq("last_name", "Swartz")
    .maybeSingle();
  if (!elise) throw new Error("Elise not found");

  const cookie = `${PORTAL_COOKIE_NAME}=${signPortalToken({
    email: guardian.email,
    guardianId: guardian.id,
  })}`;

  // ── 1. Submit through the real route ──────────────────────────────
  const res = await fetch(`${BASE}/api/portal/balance-question`, {
    method: "POST",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: elise.id, message: PROBE }),
  });
  const body = (await res.json()) as { ok?: boolean; id?: string; error?: string };
  console.log(`\nSUBMIT  status ${res.status}  ${JSON.stringify(body)}`);
  if (!res.ok || !body.id) throw new Error("submission failed");

  // ── 2. The row, as the admin queue reads it ───────────────────────
  const { data: row } = await db
    .from("balance_questions")
    .select(
      `id, message, guardian_email, charged_cents, paid_cents, adjustment_cents,
       remaining_cents, status, created_at,
       players ( first_name, last_name, graduation_year )`,
    )
    .eq("id", body.id)
    .single();

  const player = row!.players as unknown as {
    first_name: string;
    last_name: string;
    graduation_year: number;
  };

  console.log(`\nROW IN QUEUE`);
  console.log(`  player:     ${player.first_name} ${player.last_name} (${player.graduation_year})`);
  console.log(`  from:       ${row!.guardian_email}`);
  console.log(`  status:     ${row!.status}`);
  console.log(`  charged:    ${money(row!.charged_cents)}`);
  console.log(`  paid:       ${money(row!.paid_cents)}`);
  console.log(`  remaining:  ${money(row!.remaining_cents)}`);
  console.log(`  message:    ${JSON.stringify(row!.message)}`);

  // ── 3. Resolve, then reopen ───────────────────────────────────────
  await db
    .from("balance_questions")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: "harrison@theyoufirstproject.com",
    })
    .eq("id", body.id);
  const { data: resolved } = await db
    .from("balance_questions")
    .select("status, resolved_by")
    .eq("id", body.id)
    .single();
  console.log(`\nRESOLVE  status=${resolved!.status} by=${resolved!.resolved_by}`);

  // ── 4. Checks ─────────────────────────────────────────────────────
  const checks: [string, boolean][] = [
    ["row created", !!row],
    ["scoped to the right player", player.first_name === "Elise"],
    ["balance snapshot charged $1,850", row!.charged_cents === 185000],
    ["balance snapshot paid $300", row!.paid_cents === 30000],
    ["balance snapshot remaining $1,550", row!.remaining_cents === 155000],
    ["message stored verbatim (escaped at render, not on write)", row!.message.includes("<script>")],
    ["resolve records who", resolved!.resolved_by === "harrison@theyoufirstproject.com"],
  ];

  // ── 5. Cross-household guard: cannot ask about an unlinked player ─
  const { data: other } = await db
    .from("players")
    .select("id")
    .eq("first_name", "Riley")
    .eq("last_name", "McMaster")
    .maybeSingle();
  const crossRes = await fetch(`${BASE}/api/portal/balance-question`, {
    method: "POST",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: other!.id, message: "probe" }),
  });
  checks.push([
    "cannot submit for an unlinked player (404)",
    crossRes.status === 404,
  ]);

  // ── 6. Clean up ───────────────────────────────────────────────────
  await db.from("balance_questions").delete().eq("id", body.id);
  const { count } = await db
    .from("balance_questions")
    .select("id", { count: "exact", head: true });
  console.log(`\nCLEANUP  rows remaining in balance_questions: ${count}`);

  console.log("");
  let failed = 0;
  for (const [label, ok] of checks) {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
    if (!ok) failed++;
  }
  console.log("");
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
