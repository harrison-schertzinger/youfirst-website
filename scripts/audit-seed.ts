/**
 * audit-seed.ts — verifies the seed produced what we expect.
 * Run: npx tsx -r dotenv/config scripts/audit-seed.ts dotenv_config_path=.env.local
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function count(table: string) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    console.log(`  ${table}: ERROR ${error.message}`);
    return null;
  }
  console.log(`  ${table}: ${count}`);
  return count;
}

async function spotCheck(first: string, last: string, gradYear: number) {
  console.log(`\n── ${first} ${last} (${gradYear}) ──`);
  const { data: players, error: pe } = await supabase
    .from("players")
    .select(
      "id, first_name, last_name, graduation_year, position, jersey_number, school, team_name, status, shirt_size, short_size, sweatshirt_size, shooting_shirt_size"
    )
    .eq("first_name", first)
    .eq("last_name", last)
    .eq("graduation_year", gradYear);
  if (pe) {
    console.log("  player query error:", pe.message);
    return;
  }
  if (!players || players.length === 0) {
    console.log("  ✗ no player found");
    return;
  }
  if (players.length > 1) {
    console.log(`  ✗ duplicate players found: ${players.length}`);
  }
  const player = players[0];
  console.log("  player:", JSON.stringify(player));

  const { data: links, error: le } = await supabase
    .from("player_guardians")
    .select("player_id, guardian_id, is_primary")
    .eq("player_id", player.id);
  if (le) console.log("  link error:", le.message);
  console.log(`  guardian links: ${links?.length ?? 0}`);
  if (links && links.length > 0) {
    const ids = links.map((l) => l.guardian_id);
    const { data: gs } = await supabase
      .from("guardians")
      .select("id, email, first_name, last_name, phone, auth_user_id, relationship")
      .in("id", ids);
    for (const l of links) {
      const g = gs?.find((x) => x.id === l.guardian_id);
      console.log(
        `    ${l.is_primary ? "PRIMARY" : "secondary"}: ${g?.email} (${g?.first_name} ${g?.last_name}) phone=${g?.phone} auth=${g?.auth_user_id ? "✓" : "✗"}`
      );
    }
  }

  const { data: pays, error: pae } = await supabase
    .from("payments")
    .select("id, amount_cents, payment_method, payment_category, season, status")
    .eq("player_id", player.id);
  if (pae) console.log("  payments error:", pae.message);
  console.log(`  payments: ${pays?.length ?? 0}`);
  for (const pay of pays || []) {
    console.log(
      `    ${pay.payment_category} ${pay.season} $${(pay.amount_cents / 100).toFixed(2)} ${pay.status} ${pay.payment_method}`
    );
  }

  const { data: plans, error: ple } = await supabase
    .from("payment_plans")
    .select(
      "id, season, plan_type, total_amount_cents, amount_paid_cents, installments_total, installments_paid, next_due_date"
    )
    .eq("player_id", player.id);
  if (ple) console.log("  plans error:", ple.message);
  console.log(`  payment_plans: ${plans?.length ?? 0}`);
  for (const pl of plans || []) {
    const balance = (pl.total_amount_cents - pl.amount_paid_cents) / 100;
    console.log(
      `    ${pl.season} ${pl.plan_type} total=$${(pl.total_amount_cents / 100).toFixed(2)} paid=$${(pl.amount_paid_cents / 100).toFixed(2)} balance=$${balance.toFixed(2)}`
    );
  }
}

async function checkDuplicates() {
  console.log("\n── duplicate check ──");
  const { data } = await supabase
    .from("players")
    .select("id, first_name, last_name, graduation_year");
  const seen = new Map<string, number>();
  for (const p of data || []) {
    const key = `${p.first_name}|${p.last_name}|${p.graduation_year}`;
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  const dups = [...seen.entries()].filter(([, n]) => n > 1);
  console.log(`  duplicate (first,last,grad) keys: ${dups.length}`);
  for (const [k, n] of dups) console.log(`    ${k}: ${n}`);

  // Check for duplicate links
  const { data: links } = await supabase
    .from("player_guardians")
    .select("player_id, guardian_id, is_primary");
  const linkSeen = new Map<string, number>();
  for (const l of links || []) {
    const key = `${l.player_id}|${l.guardian_id}`;
    linkSeen.set(key, (linkSeen.get(key) || 0) + 1);
  }
  const linkDups = [...linkSeen.entries()].filter(([, n]) => n > 1);
  console.log(`  duplicate (player,guardian) links: ${linkDups.length}`);

  // Check for duplicate guardian emails
  const { data: gs } = await supabase.from("guardians").select("id, email");
  const emailSeen = new Map<string, number>();
  for (const g of gs || []) emailSeen.set(g.email, (emailSeen.get(g.email) || 0) + 1);
  const emailDups = [...emailSeen.entries()].filter(([, n]) => n > 1);
  console.log(`  duplicate guardian emails: ${emailDups.length}`);
}

async function main() {
  console.log("══ Audit ══\n");
  console.log("counts:");
  await count("players");
  await count("guardians");
  await count("player_guardians");
  await count("payments");
  await count("payment_plans");

  await spotCheck("Parker", "Murray", 2030);
  await spotCheck("Shay", "Quinn", 2029);
  await spotCheck("Sophie", "Haugh", 2027);

  await checkDuplicates();
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
