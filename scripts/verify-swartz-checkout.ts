/**
 * Sibling-household checkout proof.
 *
 * Signs in as the Swartz guardian email, reads the portal exactly as the
 * browser does, then starts a checkout for ELISE and asserts the amount is her
 * $1,550 and the player_id is hers — never her settled sister's.
 *
 * The Stripe key in .env.local is LIVE, so the session this creates is real.
 * It is EXPIRED immediately after the assertion, so nothing is ever payable.
 *
 * Run (dev server must be up on :3000):
 *   npx tsx scripts/verify-swartz-checkout.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { signPortalToken, PORTAL_COOKIE_NAME } from "../src/lib/portal-session";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const HOUSEHOLD_EMAIL = "cswartz17@yahoo.com";

function money(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: guardian, error: gErr } = await db
    .from("guardians")
    .select("id, email, first_name")
    .eq("email", HOUSEHOLD_EMAIL)
    .maybeSingle();
  if (gErr || !guardian) throw new Error(`guardian ${HOUSEHOLD_EMAIL} not found`);

  const token = signPortalToken({
    email: guardian.email,
    guardianId: guardian.id,
  });
  const cookie = `${PORTAL_COOKIE_NAME}=${token}`;

  // ── 1. Read the portal as this household ──────────────────────────
  const dataRes = await fetch(`${BASE}/api/portal/data`, {
    headers: { cookie },
  });
  if (!dataRes.ok) {
    throw new Error(`/api/portal/data ${dataRes.status}: ${await dataRes.text()}`);
  }
  const portal = (await dataRes.json()) as {
    players: {
      id: string;
      first_name: string;
      last_name: string;
      graduation_year: number;
      status: string;
      balance: {
        charged_cents: number;
        paid_cents: number;
        remaining_cents: number;
        percent_paid: number;
        is_settled: boolean;
        quarter_eligible: boolean;
      } | null;
    }[];
  };

  console.log(`\nPORTAL AS ${HOUSEHOLD_EMAIL}`);
  console.log(`  players returned: ${portal.players.length}`);
  for (const p of portal.players) {
    const b = p.balance;
    console.log(
      `  • ${p.first_name} ${p.last_name} (${p.graduation_year}, ${p.status}) — ` +
        `charged ${money(b?.charged_cents)} · paid ${money(b?.paid_cents)} · ` +
        `remaining ${money(b?.remaining_cents)} · bar ${b?.percent_paid ?? "—"}% · ` +
        `${b?.is_settled ? "SETTLED" : "OWES"}`,
    );
  }

  const elise = portal.players.find((p) => p.first_name === "Elise");
  const madi = portal.players.find((p) => p.first_name === "Madi");
  if (!elise) throw new Error("Elise not returned to this household");
  if (!madi) throw new Error("Madi not returned to this household");

  // ── 2. Checkout for ELISE ─────────────────────────────────────────
  const coRes = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      playerId: elise.id,
      category: "summer",
      intent: "full",
    }),
  });
  const coBody = (await coRes.json()) as { url?: string; error?: string };
  if (!coRes.ok || !coBody.url) {
    throw new Error(`/api/checkout ${coRes.status}: ${JSON.stringify(coBody)}`);
  }

  // ── 3. Read back what Stripe was actually told ────────────────────
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const sessionId = new URL(coBody.url).pathname.split("/").pop() ??
    coBody.url.split("#")[0].split("/").pop()!;
  // The redirect URL carries the session id in its fragment for hosted
  // checkout; fall back to listing the most recent session for this player.
  let session: Stripe.Checkout.Session | null = null;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    const list = await stripe.checkout.sessions.list({ limit: 5 });
    session =
      list.data.find((s) => s.metadata?.player_id === elise.id) ?? null;
  }
  if (!session) throw new Error("could not retrieve the created Stripe session");

  console.log(`\nSTRIPE SESSION ${session.id}`);
  console.log(`  amount_total:        ${money(session.amount_total)}`);
  console.log(`  metadata.player_id:  ${session.metadata?.player_id}`);
  console.log(`  metadata.category:   ${session.metadata?.category}`);
  console.log(`  metadata.intent:     ${session.metadata?.intent}`);
  console.log(`  Elise's player_id:   ${elise.id}`);
  console.log(`  Madi's player_id:    ${madi.id}`);

  const checks: [string, boolean][] = [
    ["amount is Elise's $1,550.00", session.amount_total === 155000],
    ["player_id is Elise's", session.metadata?.player_id === elise.id],
    ["player_id is NOT Madi's", session.metadata?.player_id !== madi.id],
    ["Madi reads settled", madi.balance?.is_settled === true],
    ["Elise reads owing", elise.balance?.is_settled === false],
    ["Elise remaining is 155000", elise.balance?.remaining_cents === 155000],
  ];

  // ── 4. Expire the live session so nothing is payable ──────────────
  let expired = false;
  try {
    const e = await stripe.checkout.sessions.expire(session.id);
    expired = e.status === "expired";
  } catch (err) {
    console.error("  !! could not expire session:", err);
  }
  console.log(`  session expired:     ${expired ? "yes" : "NO — EXPIRE MANUALLY"}`);

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
