/**
 * diagnose-db.ts — read-only inspection of current DB state
 * Run: npx tsx -r dotenv/config scripts/diagnose-db.ts dotenv_config_path=.env.local
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Probe a table by inserting nothing and asking for columns via PostgREST OpenAPI
async function probeColumns(table: string) {
  // Try a select * with limit 0 just to learn the columns Postgrest exposes via head request
  const { error } = await supabase.from(table).select("*", { head: true, count: "exact" });
  console.log(`  ${table}: head OK ${error ? `(${error.message})` : ""}`);
}

async function inspectAllowedColumns(table: string, candidates: string[]) {
  // Try each column name individually so we know which exist
  const exists: string[] = [];
  for (const col of candidates) {
    const { error } = await supabase.from(table).select(col).limit(1);
    if (!error) exists.push(col);
  }
  console.log(`  ${table} -> existing columns: ${exists.join(", ")}`);
}

async function main() {
  console.log("─── Schema probe ───\n");

  await inspectAllowedColumns("players", [
    "id",
    "first_name",
    "last_name",
    "graduation_year",
    "grad_year",
    "position",
    "jersey_number",
    "school",
    "team_name",
    "status",
    "shirt_size",
    "short_size",
    "sweatshirt_size",
    "shooting_shirt_size",
    "created_at",
  ]);

  await inspectAllowedColumns("guardians", [
    "id",
    "auth_user_id",
    "email",
    "first_name",
    "last_name",
    "phone",
    "relationship",
    "created_at",
  ]);

  await inspectAllowedColumns("player_guardians", [
    "id",
    "player_id",
    "guardian_id",
    "is_primary",
    "relationship",
    "created_at",
  ]);

  await inspectAllowedColumns("payments", [
    "id",
    "player_id",
    "guardian_id",
    "amount_cents",
    "payment_method",
    "payment_category",
    "season",
    "status",
    "payment_date",
    "description",
    "created_at",
  ]);

  await inspectAllowedColumns("payment_plans", [
    "id",
    "player_id",
    "season",
    "plan_type",
    "total_amount_cents",
    "amount_paid_cents",
    "installments_total",
    "installments_paid",
    "next_due_date",
    "status",
    "created_at",
  ]);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
