/**
 * diagnose-source.ts — read-only deep dive on two specific player rows
 * surfaced by diagnose-roster.ts. Service-role-only, explicit columns,
 * no inserts/updates.
 *
 * Run:
 *   npx tsx -r dotenv/config scripts/diagnose-source.ts dotenv_config_path=.env.local
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing env vars. Run with:\n  npx tsx -r dotenv/config scripts/diagnose-source.ts dotenv_config_path=.env.local",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerFull {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  position: string | null;
  jersey_number: string | null;
  school: string | null;
  shirt_size: string | null;
  short_size: string | null;
  sweatshirt_size: string | null;
  shooting_shirt_size: string | null;
  photo_url: string | null;
  team_name: string | null;
  status: string;
  created_at: string | null;
}

interface LinkRow {
  player_id: string;
  guardian_id: string;
  is_primary: boolean | null;
}

interface GuardianFull {
  id: string;
  auth_user_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  relationship: string | null;
  is_emergency_contact: boolean | null;
  address_line1: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  created_at: string | null;
}

interface PaymentFull {
  id: string;
  player_id: string;
  guardian_id: string | null;
  amount_cents: number | null;
  payment_method: string | null;
  payment_category: string | null;
  season: string | null;
  status: string | null;
  payment_date: string | null;
  description: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string | null;
}

// ─── Targets ──────────────────────────────────────────────────────────────────

interface Target {
  first: string; // lowercase
  last: string; // lowercase
  grad: number;
  label: string;
}

const TARGETS: Target[] = [
  { first: "katelyn", last: "schell", grad: 2031, label: "Katelyn Schell (grad 2031)" },
  { first: "alden", last: "long", grad: 2032, label: "Alden Long (grad 2032)" },
];

const CUTOFF_MS = new Date("2025-06-01T00:00:00Z").getTime();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function divider(title: string): void {
  const bar = "═".repeat(78);
  console.log(`\n${bar}\n${title}\n${bar}`);
}

function subdivider(title: string): void {
  console.log(`\n  ── ${title} ─────────────────────────────`);
}

function isoDate(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "—";
}

function printFullPlayer(p: PlayerFull): void {
  console.log(`    id:                  ${p.id}`);
  console.log(`    first_name:          ${p.first_name}`);
  console.log(`    last_name:           ${p.last_name}`);
  console.log(`    graduation_year:     ${p.graduation_year ?? "—"}`);
  console.log(`    position:            ${p.position ?? "—"}`);
  console.log(`    jersey_number:       ${p.jersey_number ?? "—"}`);
  console.log(`    school:              ${p.school ?? "—"}`);
  console.log(`    shirt_size:          ${p.shirt_size ?? "—"}`);
  console.log(`    short_size:          ${p.short_size ?? "—"}`);
  console.log(`    sweatshirt_size:     ${p.sweatshirt_size ?? "—"}`);
  console.log(`    shooting_shirt_size: ${p.shooting_shirt_size ?? "—"}`);
  console.log(`    photo_url:           ${p.photo_url ?? "—"}`);
  console.log(`    team_name:           ${p.team_name ?? "—"}`);
  console.log(`    status:              ${p.status}`);
  console.log(`    created_at:          ${p.created_at ?? "—"}`);
}

function printGuardian(g: GuardianFull, isPrimary: boolean | null): void {
  console.log(`    guardian_id:         ${g.id}`);
  console.log(`    is_primary:          ${isPrimary === null ? "—" : isPrimary}`);
  console.log(`    email:               ${g.email}`);
  console.log(`    name:                ${g.first_name ?? "—"} ${g.last_name ?? "—"}`);
  console.log(`    phone:               ${g.phone ?? "—"}`);
  console.log(`    relationship:        ${g.relationship ?? "—"}`);
  console.log(`    is_emergency_contact: ${g.is_emergency_contact === null ? "—" : g.is_emergency_contact}`);
  console.log(`    address_line1:       ${g.address_line1 ?? "—"}`);
  console.log(`    address_city:        ${g.address_city ?? "—"}`);
  console.log(`    address_state:       ${g.address_state ?? "—"}`);
  console.log(`    address_zip:         ${g.address_zip ?? "—"}`);
  console.log(`    auth_user_id:        ${g.auth_user_id ?? "—"}`);
  console.log(`    created_at:          ${g.created_at ?? "—"}`);
}

function printPayment(pay: PaymentFull): void {
  const dollars = ((pay.amount_cents ?? 0) / 100).toFixed(2);
  console.log(`    payment_id:              ${pay.id}`);
  console.log(`    guardian_id:             ${pay.guardian_id ?? "—"}`);
  console.log(`    amount:                  $${dollars}  (cents=${pay.amount_cents ?? "—"})`);
  console.log(`    payment_method:          ${pay.payment_method ?? "—"}`);
  console.log(`    payment_category:        ${pay.payment_category ?? "—"}`);
  console.log(`    season:                  ${pay.season ?? "—"}`);
  console.log(`    status:                  ${pay.status ?? "—"}`);
  console.log(`    payment_date:            ${pay.payment_date ?? "—"}`);
  console.log(`    description:             ${pay.description ?? "—"}`);
  console.log(`    stripe_session_id:       ${pay.stripe_session_id ?? "null"}`);
  console.log(`    stripe_payment_intent_id: ${pay.stripe_payment_intent_id ?? "null"}`);
  console.log(`    created_at:              ${pay.created_at ?? "—"}`);
}

function inferSource(args: {
  photo_url: string | null;
  created_at: string | null;
  hasHistorical: boolean;
  hasGuardian: boolean;
}): string {
  if (args.photo_url) {
    return "came through public /api/register (photo uploaded)";
  }
  if (args.hasHistorical) {
    return "seeded from Wix history";
  }
  const createdMs = args.created_at ? new Date(args.created_at).getTime() : Number.NaN;
  if (Number.isFinite(createdMs) && createdMs < CUTOFF_MS && !args.hasHistorical) {
    return "early seed, unknown origin";
  }
  if (Number.isFinite(createdMs) && createdMs > CUTOFF_MS && !args.hasGuardian) {
    return "manually created or partial registration";
  }
  return "unknown — flag for manual review";
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Pull every player row (small table) and filter in JS for case-insensitive
  // matching on first+last. Same approach diagnose-roster.ts used.
  const { data: allData, error: pErr } = await supabase
    .from("players")
    .select(
      "id, first_name, last_name, graduation_year, position, jersey_number, school, shirt_size, short_size, sweatshirt_size, shooting_shirt_size, photo_url, team_name, status, created_at",
    );
  if (pErr) throw pErr;
  const allPlayers: PlayerFull[] = (allData ?? []) as PlayerFull[];

  for (const target of TARGETS) {
    divider(`TARGET — ${target.label}`);

    const matches = allPlayers.filter(
      (p) =>
        (p.first_name ?? "").toLowerCase() === target.first &&
        (p.last_name ?? "").toLowerCase() === target.last &&
        p.graduation_year === target.grad,
    );

    if (matches.length === 0) {
      console.log("  No player row matched. Verify spelling / grad year.");
      continue;
    }
    if (matches.length > 1) {
      console.log(
        `  ⚠ ${matches.length} player rows matched this name+grad. All will be reported.`,
      );
    }

    for (const player of matches) {
      // ── 1. Full player row ──────────────────────────────────────────
      subdivider(`Full players row — ${player.id}`);
      printFullPlayer(player);

      // ── 2. Guardian linkages ────────────────────────────────────────
      subdivider("Linked guardians");
      const { data: linksData, error: lErr } = await supabase
        .from("player_guardians")
        .select("player_id, guardian_id, is_primary")
        .eq("player_id", player.id);
      if (lErr) throw lErr;
      const links: LinkRow[] = (linksData ?? []) as LinkRow[];

      let guardians: GuardianFull[] = [];
      if (links.length > 0) {
        const guardianIds = [...new Set(links.map((l) => l.guardian_id))];
        const { data: gData, error: gErr } = await supabase
          .from("guardians")
          .select(
            "id, auth_user_id, email, first_name, last_name, phone, relationship, is_emergency_contact, address_line1, address_city, address_state, address_zip, created_at",
          )
          .in("id", guardianIds);
        if (gErr) throw gErr;
        guardians = (gData ?? []) as GuardianFull[];
      }

      if (links.length === 0) {
        console.log("    (no guardian linked)");
      } else {
        const gMap = new Map<string, GuardianFull>(
          guardians.map((g) => [g.id, g]),
        );
        let printed = 0;
        for (const link of links) {
          const g = gMap.get(link.guardian_id);
          if (!g) {
            console.log(
              `    guardian_id=${link.guardian_id}  primary=${link.is_primary}  (guardian row not found)`,
            );
            printed++;
            continue;
          }
          if (printed > 0) console.log("");
          printGuardian(g, link.is_primary);
          printed++;
        }
      }

      // ── 3. Payments ─────────────────────────────────────────────────
      subdivider("Payments");
      const { data: payData, error: payErr } = await supabase
        .from("payments")
        .select(
          "id, player_id, guardian_id, amount_cents, payment_method, payment_category, season, status, payment_date, description, stripe_session_id, stripe_payment_intent_id, created_at",
        )
        .eq("player_id", player.id);
      if (payErr) throw payErr;
      const payments: PaymentFull[] = (payData ?? []) as PaymentFull[];

      if (payments.length === 0) {
        console.log("    (no payments)");
      } else {
        let printed = 0;
        for (const pay of payments) {
          if (printed > 0) console.log("");
          printPayment(pay);
          printed++;
        }
      }

      // ── 4. Source inference ─────────────────────────────────────────
      subdivider("Source inference");
      const hasHistorical = payments.some(
        (p) => p.payment_method === "historical",
      );
      const hasGuardian = links.length > 0;
      const label = inferSource({
        photo_url: player.photo_url,
        created_at: player.created_at,
        hasHistorical,
        hasGuardian,
      });
      console.log(`    inferred source: ${label}`);
      console.log(
        `    inputs: photo_url=${player.photo_url ? "present" : "null"}  hasHistoricalPayment=${hasHistorical}  hasGuardian=${hasGuardian}  created_at=${isoDate(player.created_at)}  cutoff=2025-06-01`,
      );
    }
  }

  console.log();
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
