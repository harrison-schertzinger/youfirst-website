/**
 * Who is active without a 2026-27 payment_plans row, and what fee_schedule
 * would charge them.
 *
 * Default is read-only. --apply inserts one lump_sum plan per listed
 * athlete from published fee_schedule. It never touches 2025-26 rows.
 *
 *   npx tsx -r dotenv/config scripts/report-missing-season-plans.ts dotenv_config_path=.env.local
 *   npx tsx -r dotenv/config scripts/report-missing-season-plans.ts dotenv_config_path=.env.local --apply
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { CURRENT_SEASON } from "../src/lib/season";

const APPLY = process.argv.includes("--apply");
const TARGET_SEASON = CURRENT_SEASON;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type PlayerRow = {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  status: string;
};

type FeeRow = {
  grad_year: number;
  summer_cents: number | null;
  published: boolean;
};

type PlanRow = {
  player_id: string;
  season: string;
};

async function main() {
  const [playersRes, plansRes, feesRes] = await Promise.all([
    admin
      .from("players")
      .select("id, first_name, last_name, graduation_year, status")
      .in("status", ["active", "injured", "hold"]),
    admin.from("payment_plans").select("player_id, season"),
    admin
      .from("fee_schedule")
      .select("grad_year, summer_cents, published")
      .eq("season", TARGET_SEASON),
  ]);

  if (playersRes.error) throw playersRes.error;
  if (plansRes.error) throw plansRes.error;
  if (feesRes.error) throw feesRes.error;

  const players = (playersRes.data ?? []) as PlayerRow[];
  const plans = (plansRes.data ?? []) as PlanRow[];
  const fees = (feesRes.data ?? []) as FeeRow[];

  const seasonsByPlayer = new Map<string, Set<string>>();
  for (const plan of plans) {
    const set = seasonsByPlayer.get(plan.player_id) ?? new Set<string>();
    set.add(plan.season);
    seasonsByPlayer.set(plan.player_id, set);
  }

  const feeByClass = new Map<number, FeeRow>();
  for (const fee of fees) feeByClass.set(fee.grad_year, fee);

  const missing = players
    .filter((p) => !seasonsByPlayer.get(p.id)?.has(TARGET_SEASON))
    .sort(
      (a, b) =>
        (a.graduation_year ?? 0) - (b.graduation_year ?? 0) ||
        a.last_name.localeCompare(b.last_name) ||
        a.first_name.localeCompare(b.first_name),
    );

  const ready: { player: PlayerRow; summerCents: number }[] = [];
  const noPrice: PlayerRow[] = [];
  const unpublished: PlayerRow[] = [];

  for (const player of missing) {
    const fee = player.graduation_year
      ? feeByClass.get(player.graduation_year)
      : undefined;
    if (!fee) {
      noPrice.push(player);
      continue;
    }
    if (!fee.published || fee.summer_cents == null) {
      unpublished.push(player);
      continue;
    }
    ready.push({ player, summerCents: fee.summer_cents });
  }

  const nameKey = (p: PlayerRow) =>
    `${p.first_name}|${p.last_name}|${p.graduation_year}`;
  const counts = new Map<string, number>();
  for (const p of players) {
    counts.set(nameKey(p), (counts.get(nameKey(p)) ?? 0) + 1);
  }

  console.log(`Season ${TARGET_SEASON}`);
  console.log(`Active/injured/hold players: ${players.length}`);
  console.log(`Missing a ${TARGET_SEASON} plan: ${missing.length}`);
  console.log(`  published price, safe to backfill: ${ready.length}`);
  console.log(`  unpublished fee_schedule row: ${unpublished.length}`);
  console.log(`  no fee_schedule row: ${noPrice.length}`);
  console.log("");

  function printGroup(title: string, rows: PlayerRow[], extra?: (p: PlayerRow) => string) {
    if (rows.length === 0) return;
    console.log(title);
    for (const p of rows) {
      const dup = (counts.get(nameKey(p)) ?? 0) > 1 ? "  [duplicate name]" : "";
      const more = extra ? extra(p) : "";
      console.log(
        `  ${p.graduation_year}  ${p.first_name} ${p.last_name}  (${p.status})${more}${dup}`,
      );
    }
    console.log("");
  }

  printGroup(
    "Ready (published summer_cents):",
    ready.map((r) => r.player),
    (p) => {
      const row = ready.find((r) => r.player.id === p.id);
      return row ? `  $${(row.summerCents / 100).toFixed(0)}` : "";
    },
  );
  printGroup("Unpublished fee_schedule — do not invent a price:", unpublished);
  printGroup("No fee_schedule row — do not invent a price:", noPrice);

  if (!APPLY) {
    console.log("Dry run. Nothing written. Pass --apply to insert the Ready rows only.");
    return;
  }

  if (ready.length === 0) {
    console.log("Nothing to insert.");
    return;
  }

  let created = 0;
  let failed = 0;
  for (const { player, summerCents } of ready) {
    const { error } = await admin.from("payment_plans").insert({
      player_id: player.id,
      season: TARGET_SEASON,
      plan_type: "lump_sum",
      total_amount_cents: summerCents,
      amount_paid_cents: 0,
      installments_total: 1,
      installments_paid: 0,
      next_due_date: null,
    });
    if (error) {
      console.error(`  ✗ ${player.first_name} ${player.last_name}: ${error.message}`);
      failed++;
    } else {
      created++;
    }
  }
  console.log(`Inserted ${created} ${TARGET_SEASON} plans. Failed: ${failed}.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
