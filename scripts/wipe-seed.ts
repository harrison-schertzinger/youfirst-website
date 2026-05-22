/**
 * wipe-seed.ts — clears partially-seeded data so seed-players.ts can run cleanly.
 * Leaves auth.users intact (the next run will reuse them).
 *
 * Run:
 *   npx tsx -r dotenv/config scripts/wipe-seed.ts dotenv_config_path=.env.local
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function wipe(table: string, idCol = "id") {
  // PostgREST requires a filter for delete; use a tautology on the id column.
  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .not(idCol, "is", null);
  if (error) {
    console.error(`  ✗ ${table}: ${error.message}`);
    return;
  }
  console.log(`  ${table}: deleted ${count}`);
}

async function main() {
  console.log("─── wiping partial seed ───");
  // Order matters for FKs: dependent rows first.
  await wipe("payments");
  await wipe("payment_plans");
  await wipe("player_guardians", "player_id"); // composite key, no `id`
  await wipe("guardians");
  await wipe("players");
  console.log("done");
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
