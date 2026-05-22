/**
 * extract-cohort-email-lists.ts
 * ─────────────────────────────
 * Pulls clean per-cohort guardian email lists for Resend campaigns.
 * Writes one CSV per graduation_year (2027, 2028, 2029, 2030) into
 * ./email-lists/. Re-runnable: overwrites existing CSVs each time.
 *
 * Run:
 *   npx tsx -r dotenv/config scripts/extract-cohort-email-lists.ts dotenv_config_path=.env.local
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing env vars. Run with:\n  npx tsx -r dotenv/config scripts/extract-cohort-email-lists.ts dotenv_config_path=.env.local",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const COHORTS = [2027, 2028, 2029, 2030] as const;
type Cohort = (typeof COHORTS)[number];

const OUT_DIR = resolve(process.cwd(), "email-lists");

// Pragmatic email check — anything that fails is dropped, not fixed.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type JoinRow = {
  graduation_year: number;
  player_first_name: string;
  player_last_name: string;
  guardian_first_name: string;
  guardian_last_name: string;
  guardian_email: string;
};

type GuardianRow = {
  email: string;
  first_name: string;
  last_name: string;
  player_first_names: string[];
  player_last_names: string[];
  graduation_year: Cohort;
};

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(rows: GuardianRow[]): string {
  const header = [
    "email",
    "first_name",
    "last_name",
    "player_first_name",
    "player_last_name",
    "graduation_year",
  ].join(",");

  const lines = rows.map((r) =>
    [
      r.email,
      r.first_name,
      r.last_name,
      r.player_first_names.join(", "),
      r.player_last_names.join(", "),
      String(r.graduation_year),
    ]
      .map(csvEscape)
      .join(","),
  );

  return [header, ...lines].join("\n") + "\n";
}

type CombinedRow = {
  email: string;
  first_name: string;
  last_name: string;
  player_first_names: string[];
  player_last_names: string[];
  graduation_years: Cohort[];
};

function buildCombinedList(rows: JoinRow[]): CombinedRow[] {
  const byEmail = new Map<string, CombinedRow>();

  for (const r of rows) {
    if (!COHORTS.includes(r.graduation_year as Cohort)) continue;

    const email = (r.guardian_email ?? "").trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) continue;

    const existing = byEmail.get(email);
    if (existing) {
      const seenPlayer = existing.player_first_names.some(
        (f, i) =>
          f === r.player_first_name &&
          existing.player_last_names[i] === r.player_last_name,
      );
      if (!seenPlayer) {
        existing.player_first_names.push(r.player_first_name);
        existing.player_last_names.push(r.player_last_name);
      }
      if (!existing.graduation_years.includes(r.graduation_year as Cohort)) {
        existing.graduation_years.push(r.graduation_year as Cohort);
      }
    } else {
      byEmail.set(email, {
        email,
        first_name: r.guardian_first_name,
        last_name: r.guardian_last_name,
        player_first_names: [r.player_first_name],
        player_last_names: [r.player_last_name],
        graduation_years: [r.graduation_year as Cohort],
      });
    }
  }

  for (const row of byEmail.values()) {
    row.graduation_years.sort((a, b) => a - b);
  }

  return Array.from(byEmail.values()).sort((a, b) =>
    a.email < b.email ? -1 : a.email > b.email ? 1 : 0,
  );
}

function combinedToCsv(rows: CombinedRow[]): string {
  const header = [
    "email",
    "first_name",
    "last_name",
    "player_first_name",
    "player_last_name",
    "graduation_year",
  ].join(",");

  const lines = rows.map((r) =>
    [
      r.email,
      r.first_name,
      r.last_name,
      r.player_first_names.join(", "),
      r.player_last_names.join(", "),
      r.graduation_years.join(", "),
    ]
      .map(csvEscape)
      .join(","),
  );

  return [header, ...lines].join("\n") + "\n";
}

async function fetchJoinRows(): Promise<JoinRow[]> {
  // One round-trip via the join table. The PostgREST embed gives us
  // players → player_guardians → guardians directly.
  const { data, error } = await supabase
    .from("players")
    .select(
      `
      first_name,
      last_name,
      graduation_year,
      player_guardians (
        guardians (
          email,
          first_name,
          last_name
        )
      )
    `,
    )
    .in("graduation_year", COHORTS as unknown as number[]);

  if (error) throw error;
  if (!data) return [];

  const rows: JoinRow[] = [];
  for (const p of data) {
    const links = (p as any).player_guardians ?? [];
    for (const link of links) {
      const g = link.guardians;
      if (!g) continue;
      rows.push({
        graduation_year: (p as any).graduation_year,
        player_first_name: (p as any).first_name ?? "",
        player_last_name: (p as any).last_name ?? "",
        guardian_first_name: g.first_name ?? "",
        guardian_last_name: g.last_name ?? "",
        guardian_email: g.email ?? "",
      });
    }
  }
  return rows;
}

function buildCohortList(rows: JoinRow[], cohort: Cohort): GuardianRow[] {
  const byEmail = new Map<string, GuardianRow>();

  for (const r of rows) {
    if (r.graduation_year !== cohort) continue;

    const email = (r.guardian_email ?? "").trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) continue;

    const existing = byEmail.get(email);
    if (existing) {
      // Same guardian, multiple daughters in same cohort. Append player.
      // Avoid duplicating identical (first, last) pairs.
      const seen = existing.player_first_names.some(
        (f, i) =>
          f === r.player_first_name &&
          existing.player_last_names[i] === r.player_last_name,
      );
      if (!seen) {
        existing.player_first_names.push(r.player_first_name);
        existing.player_last_names.push(r.player_last_name);
      }
    } else {
      byEmail.set(email, {
        email,
        first_name: r.guardian_first_name,
        last_name: r.guardian_last_name,
        player_first_names: [r.player_first_name],
        player_last_names: [r.player_last_name],
        graduation_year: cohort,
      });
    }
  }

  return Array.from(byEmail.values()).sort((a, b) =>
    a.email < b.email ? -1 : a.email > b.email ? 1 : 0,
  );
}

async function main() {
  console.log("Fetching join rows from Supabase…");
  const joinRows = await fetchJoinRows();
  console.log(`  → ${joinRows.length} guardian-link rows fetched\n`);

  mkdirSync(OUT_DIR, { recursive: true });

  const allEmails = new Set<string>();
  const summary: Array<{ cohort: Cohort; guardians: number; players: number }> =
    [];

  for (const cohort of COHORTS) {
    const list = buildCohortList(joinRows, cohort);
    const csv = toCsv(list);
    const path = resolve(OUT_DIR, `youfirst-${cohort}.csv`);
    writeFileSync(path, csv, "utf8");

    const playerSet = new Set<string>();
    for (const g of list) {
      for (let i = 0; i < g.player_first_names.length; i++) {
        playerSet.add(
          `${g.player_first_names[i]}|${g.player_last_names[i]}`.toLowerCase(),
        );
      }
      allEmails.add(g.email);
    }

    summary.push({
      cohort,
      guardians: list.length,
      players: playerSet.size,
    });

    console.log(`  ✓ wrote ${path}  (${list.length} rows)`);
  }

  // Combined "all cohorts" list — one row per unique email globally.
  const combined = buildCombinedList(joinRows);
  const combinedPath = resolve(OUT_DIR, "youfirst-all.csv");
  writeFileSync(combinedPath, combinedToCsv(combined), "utf8");
  console.log(`  ✓ wrote ${combinedPath}  (${combined.length} rows)`);

  console.log("\n──────── Summary ────────");
  for (const s of summary) {
    console.log(`  ${s.cohort}: ${s.guardians} guardians, ${s.players} players`);
  }
  console.log(`  Total unique emails across all cohorts: ${allEmails.size}`);
  console.log(`  Combined list rows: ${combined.length}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
