/**
 * seed-players.ts
 * ───────────────
 * Seeds Supabase with the 59 existing You. First Elite players, their
 * parent guardian auth accounts, payment history, and 2026-summer payment
 * plans. Idempotent: safely re-runnable — looks up existing auth users and
 * guardians by email instead of creating duplicates.
 *
 * Run:
 *   npx tsx -r dotenv/config scripts/seed-players.ts dotenv_config_path=.env.local
 */
import "dotenv/config";
import { createClient, type User } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { randomBytes } from "crypto";

// ── Config ─────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing env vars. Run with:\n  npx tsx -r dotenv/config scripts/seed-players.ts dotenv_config_path=.env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_FILE = resolve(process.cwd(), "scripts/seed-data.json");
const SEASON = "2025-2026";
const SUMMER_SEASON = "summer-2026";
const TEAM_NAME = "You. First Elite";

// ── Types ──────────────────────────────────────────────
type SeedPlayer = {
  name: string;
  team: string;
  primary_email: string;
  additional_emails: string[];
  jersey_number: number | null;
  shirt_size: string | null;
  short_size: string | null;
  sweatshirt_size: string | null;
  shooting_shirt_size: string | null;
  position: string | null;
  school: string | null;
  parent1_name: string | null;
  parent1_cell: string | null;
  parent2_name: string | null;
  parent2_cell: string | null;
  roster_paid: number;
  fall_paid: number;
  summer_paid: number;
  summer_total: number;
  balance_summer: number;
};

type GuardianInfo = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

// ── Helpers ────────────────────────────────────────────
function normEmail(e: string | null | undefined): string | null {
  if (!e) return null;
  const trimmed = e.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/** Strip parenthetical suffixes like "(32)" or "(X)" then split into first/last. */
function parsePlayerName(raw: string): { first_name: string; last_name: string } {
  // Remove parenthetical groups: "Rowan  Feheley(32)" → "Rowan  Feheley"
  let cleaned = raw.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  // Collapse internal whitespace
  cleaned = cleaned.replace(/\s+/g, " ");
  const parts = cleaned.split(" ");
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: "" };
  }
  const last_name = parts[parts.length - 1];
  const first_name = parts.slice(0, -1).join(" ");
  return { first_name, last_name };
}

/** Split a parent name like "Pat Murray" or "Kayla Gibby / Owen Gibby" into first/last. */
function parseParentName(raw: string | null): { first_name: string | null; last_name: string | null } {
  if (!raw) return { first_name: null, last_name: null };
  // For slash-joined names, take the first half only.
  const primary = raw.split("/")[0].trim();
  if (!primary) return { first_name: null, last_name: null };
  const parts = primary.split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0], last_name: null };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

/** Take first phone if input is "555-1234 / 555-5678". */
function parseParentPhone(raw: string | null): string | null {
  if (!raw) return null;
  const first = raw.split("/")[0].trim();
  return first.length > 0 ? first : null;
}

function genPassword(): string {
  return randomBytes(24).toString("base64url");
}

/** Page through every auth user and return an email→user map. */
async function loadAllAuthUsersByEmail(): Promise<Map<string, User>> {
  const map = new Map<string, User>();
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers page ${page}: ${error.message}`);
    for (const u of data.users) {
      if (u.email) map.set(u.email.toLowerCase(), u);
    }
    if (data.users.length < perPage) break;
  }
  return map;
}

// ── Main ───────────────────────────────────────────────
async function main() {
  console.log("─── seed-players.ts ───\n");
  console.log("URL:", SUPABASE_URL);

  // ── STEP 1 — Parse seed data ───────────────────────
  const raw = readFileSync(SEED_FILE, "utf-8");
  const all = JSON.parse(raw) as SeedPlayer[];
  const players = all.filter((p) => !p.name.includes("Paisha Parks"));
  console.log(`\nLoaded ${all.length} records → ${players.length} after dropping Paisha Parks`);

  // Build per-email "best guardian info" by walking every player.
  // Rule: primary_email gets parent1 info; additional_emails[0] gets parent2 info.
  // First non-null match wins (so a sibling pair fills info from whichever record has it).
  const guardianInfoByEmail = new Map<string, GuardianInfo>();

  function recordEmail(email: string, name: string | null, phone: string | null) {
    const existing = guardianInfoByEmail.get(email);
    const parsedName = parseParentName(name);
    const parsedPhone = parseParentPhone(phone);
    if (!existing) {
      guardianInfoByEmail.set(email, {
        email,
        first_name: parsedName.first_name,
        last_name: parsedName.last_name,
        phone: parsedPhone,
      });
      return;
    }
    // Backfill any missing fields (first non-null wins)
    if (!existing.first_name && parsedName.first_name) existing.first_name = parsedName.first_name;
    if (!existing.last_name && parsedName.last_name) existing.last_name = parsedName.last_name;
    if (!existing.phone && parsedPhone) existing.phone = parsedPhone;
  }

  for (const p of players) {
    const primary = normEmail(p.primary_email);
    const additional = (p.additional_emails || [])
      .map((e) => normEmail(e))
      .filter((e): e is string => e !== null);

    if (primary) recordEmail(primary, p.parent1_name, p.parent1_cell);
    if (additional[0]) recordEmail(additional[0], p.parent2_name, p.parent2_cell);
    // additional[1+] get no parent info attached, just a blank guardian.
    for (const e of additional.slice(1)) {
      if (!guardianInfoByEmail.has(e)) {
        guardianInfoByEmail.set(e, { email: e, first_name: null, last_name: null, phone: null });
      }
    }
    // Ensure the primary email always has a guardian record even if no parent info.
    if (primary && !guardianInfoByEmail.has(primary)) {
      guardianInfoByEmail.set(primary, { email: primary, first_name: null, last_name: null, phone: null });
    }
    if (additional[0] && !guardianInfoByEmail.has(additional[0])) {
      guardianInfoByEmail.set(additional[0], {
        email: additional[0],
        first_name: null,
        last_name: null,
        phone: null,
      });
    }
  }

  console.log(`Unique guardian emails: ${guardianInfoByEmail.size}`);

  // ── STEP 2 — Auth accounts ─────────────────────────
  console.log("\n─── Step 2: auth accounts ───");
  const existingAuthByEmail = await loadAllAuthUsersByEmail();
  console.log(`  pre-existing auth users: ${existingAuthByEmail.size}`);

  const authIdByEmail = new Map<string, string>();
  let authCreated = 0;
  let authReused = 0;
  let authFailed = 0;

  for (const email of guardianInfoByEmail.keys()) {
    const existing = existingAuthByEmail.get(email);
    if (existing) {
      authIdByEmail.set(email, existing.id);
      authReused++;
      continue;
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      password: genPassword(),
      user_metadata: { source: "seed-players" },
    });
    if (error || !data.user) {
      console.error(`  ✗ createUser ${email}: ${error?.message ?? "no user returned"}`);
      authFailed++;
      continue;
    }
    authIdByEmail.set(email, data.user.id);
    authCreated++;
  }
  console.log(`  created: ${authCreated}, reused: ${authReused}, failed: ${authFailed}`);

  // ── STEP 3 — Guardian rows ─────────────────────────
  console.log("\n─── Step 3: guardian rows ───");
  // Load existing guardians by email so re-runs don't duplicate
  const { data: existingGuardians, error: gFetchErr } = await supabase
    .from("guardians")
    .select("id, email");
  if (gFetchErr) throw new Error(`fetch guardians: ${gFetchErr.message}`);
  const guardianIdByEmail = new Map<string, string>();
  for (const g of existingGuardians || []) guardianIdByEmail.set(g.email.toLowerCase(), g.id);

  let guardiansCreated = 0;
  let guardiansFailed = 0;
  for (const [email, info] of guardianInfoByEmail.entries()) {
    if (guardianIdByEmail.has(email)) continue;
    const auth_user_id = authIdByEmail.get(email);
    if (!auth_user_id) {
      console.error(`  ✗ no auth_user_id for ${email}, skipping guardian`);
      guardiansFailed++;
      continue;
    }
    // guardians.first_name and last_name are NOT NULL — fall back for unknowns.
    const first_name = info.first_name ?? "Parent";
    const last_name = info.last_name ?? "";
    const { data, error } = await supabase
      .from("guardians")
      .insert({
        auth_user_id,
        email,
        first_name,
        last_name,
        phone: info.phone,
        relationship: "parent",
      })
      .select("id, email")
      .single();
    if (error || !data) {
      console.error(`  ✗ insert guardian ${email}: ${error?.message ?? "no row"}`);
      guardiansFailed++;
      continue;
    }
    guardianIdByEmail.set(email, data.id);
    guardiansCreated++;
  }
  console.log(`  created: ${guardiansCreated}, failed: ${guardiansFailed}, total in map: ${guardianIdByEmail.size}`);

  // ── STEP 4 — Player rows ───────────────────────────
  console.log("\n─── Step 4: players ───");
  const playerIdByKey = new Map<string, string>(); // key = `${first_name}|${last_name}|${graduation_year}`
  let playersCreated = 0;
  let playersFailed = 0;

  for (const p of players) {
    const { first_name, last_name } = parsePlayerName(p.name);
    const graduation_year = parseInt(p.team, 10);
    const key = `${first_name}|${last_name}|${graduation_year}`;

    const { data, error } = await supabase
      .from("players")
      .insert({
        first_name,
        last_name,
        graduation_year,
        position: p.position,
        jersey_number: p.jersey_number !== null && p.jersey_number !== undefined ? String(p.jersey_number) : null,
        school: p.school,
        shirt_size: p.shirt_size,
        short_size: p.short_size,
        sweatshirt_size: p.sweatshirt_size,
        shooting_shirt_size: p.shooting_shirt_size,
        team_name: TEAM_NAME,
        status: "active",
      })
      .select("id, first_name, last_name, graduation_year")
      .single();
    if (error || !data) {
      console.error(`  ✗ insert player ${first_name} ${last_name}: ${error?.message ?? "no row"}`);
      playersFailed++;
      continue;
    }
    playerIdByKey.set(key, data.id);
    playersCreated++;
  }
  console.log(`  created: ${playersCreated}, failed: ${playersFailed}`);

  // ── STEP 5 — player_guardians links ────────────────
  console.log("\n─── Step 5: player_guardians ───");
  let linksCreated = 0;
  let linksFailed = 0;

  for (const p of players) {
    const { first_name, last_name } = parsePlayerName(p.name);
    const graduation_year = parseInt(p.team, 10);
    const playerId = playerIdByKey.get(`${first_name}|${last_name}|${graduation_year}`);
    if (!playerId) {
      console.error(`  ✗ no player id for ${first_name} ${last_name}`);
      linksFailed++;
      continue;
    }
    const primary = normEmail(p.primary_email);
    const additional = (p.additional_emails || [])
      .map((e) => normEmail(e))
      .filter((e): e is string => e !== null);

    if (primary) {
      const gid = guardianIdByEmail.get(primary);
      if (gid) {
        const { error } = await supabase
          .from("player_guardians")
          .insert({ player_id: playerId, guardian_id: gid, is_primary: true });
        if (error) {
          console.error(`  ✗ link primary ${primary} → ${first_name}: ${error.message}`);
          linksFailed++;
        } else {
          linksCreated++;
        }
      }
    }
    for (const e of additional) {
      const gid = guardianIdByEmail.get(e);
      if (!gid) continue;
      const { error } = await supabase
        .from("player_guardians")
        .insert({ player_id: playerId, guardian_id: gid, is_primary: false });
      if (error) {
        console.error(`  ✗ link additional ${e} → ${first_name}: ${error.message}`);
        linksFailed++;
      } else {
        linksCreated++;
      }
    }
  }
  console.log(`  created: ${linksCreated}, failed: ${linksFailed}`);

  // ── STEP 6 — Payment rows ──────────────────────────
  console.log("\n─── Step 6: payments ───");
  let paymentsCreated = 0;
  let paymentsFailed = 0;
  const todayIso = new Date().toISOString();

  for (const p of players) {
    const { first_name, last_name } = parsePlayerName(p.name);
    const graduation_year = parseInt(p.team, 10);
    const playerId = playerIdByKey.get(`${first_name}|${last_name}|${graduation_year}`);
    if (!playerId) continue;
    const primary = normEmail(p.primary_email);
    const guardianId = primary ? guardianIdByEmail.get(primary) ?? null : null;

    const categories: Array<{ key: "roster" | "fall" | "summer"; dollars: number }> = [
      { key: "roster", dollars: p.roster_paid || 0 },
      { key: "fall", dollars: p.fall_paid || 0 },
      { key: "summer", dollars: p.summer_paid || 0 },
    ];

    for (const c of categories) {
      if (c.dollars <= 0) continue;
      const { error } = await supabase.from("payments").insert({
        player_id: playerId,
        guardian_id: guardianId,
        amount_cents: Math.round(c.dollars * 100),
        payment_method: "historical",
        payment_category: c.key,
        season: SEASON,
        status: "completed",
        payment_date: todayIso,
      });
      if (error) {
        console.error(`  ✗ payment ${c.key} for ${first_name} ${last_name}: ${error.message}`);
        paymentsFailed++;
      } else {
        paymentsCreated++;
      }
    }
  }
  console.log(`  created: ${paymentsCreated}, failed: ${paymentsFailed}`);

  // ── STEP 7 — Payment plans ─────────────────────────
  console.log("\n─── Step 7: payment_plans ───");
  let plansCreated = 0;
  let plansFailed = 0;

  for (const p of players) {
    const { first_name, last_name } = parsePlayerName(p.name);
    const graduation_year = parseInt(p.team, 10);
    const playerId = playerIdByKey.get(`${first_name}|${last_name}|${graduation_year}`);
    if (!playerId) continue;
    const total_amount_cents = Math.round((p.summer_total || 0) * 100);
    const amount_paid_cents = Math.round((p.summer_paid || 0) * 100);
    // plan_type check constraint allows: lump_sum | quarterly | monthly.
    // We don't yet know which option each family chose, so default to lump_sum.
    const { error } = await supabase.from("payment_plans").insert({
      player_id: playerId,
      season: SUMMER_SEASON,
      plan_type: "lump_sum",
      total_amount_cents,
      amount_paid_cents,
      installments_total: 1,
      installments_paid: amount_paid_cents > 0 ? 1 : 0,
      next_due_date: null,
    });
    if (error) {
      console.error(`  ✗ payment_plan for ${first_name} ${last_name}: ${error.message}`);
      plansFailed++;
    } else {
      plansCreated++;
    }
  }
  console.log(`  created: ${plansCreated}, failed: ${plansFailed}`);

  // ── Summary ────────────────────────────────────────
  console.log("\n══════ SUMMARY ══════");
  console.log(`  Auth users    — created: ${authCreated}, reused: ${authReused}, failed: ${authFailed}`);
  console.log(`  Guardians     — created: ${guardiansCreated}, failed: ${guardiansFailed}`);
  console.log(`  Players       — created: ${playersCreated}, failed: ${playersFailed}`);
  console.log(`  Links         — created: ${linksCreated}, failed: ${linksFailed}`);
  console.log(`  Payments      — created: ${paymentsCreated}, failed: ${paymentsFailed}`);
  console.log(`  Payment plans — created: ${plansCreated}, failed: ${plansFailed}`);
  console.log("═════════════════════\n");

  const anyFailed =
    authFailed + guardiansFailed + playersFailed + linksFailed + paymentsFailed + plansFailed;
  if (anyFailed > 0) {
    console.error(`Completed with ${anyFailed} failures — review errors above.`);
    process.exit(1);
  }
  console.log("✓ Seed complete with no errors.");
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(1);
});
