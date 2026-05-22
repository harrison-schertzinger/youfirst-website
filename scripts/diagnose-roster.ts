/**
 * diagnose-roster.ts — read-only DB inspection for Sprint 3 planning.
 *
 * Mirrors scripts/diagnose-db.ts: service-role-only, no inserts/updates,
 * explicit column lists everywhere (no select('*')).
 *
 * Run:
 *   npx tsx -r dotenv/config scripts/diagnose-roster.ts dotenv_config_path=.env.local
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing env vars. Run with:\n  npx tsx -r dotenv/config scripts/diagnose-roster.ts dotenv_config_path=.env.local",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerActive {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  position: string | null;
  status: string;
  created_at: string | null;
  team_name: string | null;
  photo_url: string | null;
}

interface PlayerLite {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  status: string;
  created_at: string | null;
  photo_url: string | null;
}

interface LinkRow {
  player_id: string;
  guardian_id: string;
  is_primary: boolean | null;
}

interface GuardianRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string | null;
}

interface PaymentRow {
  id: string;
  player_id: string;
  payment_method: string | null;
  payment_category: string | null;
  amount_cents: number | null;
  season: string | null;
  status: string | null;
  created_at: string | null;
  stripe_session_id: string | null;
}

interface SeasonRow {
  season: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FLAGGED: Array<{ first: string; last: string | null }> = [
  { first: "demary", last: "vianello" },
  { first: "malin", last: null }, // any last name
  { first: "elise", last: "swartz" },
  { first: "bree", last: "van vliet" },
  { first: "caitlyn", last: "schell" },
  { first: "aiden", last: "long" },
];

const CUTOFF_MS = new Date("2025-06-01T00:00:00Z").getTime();

function divider(title: string): void {
  const bar = "═".repeat(78);
  console.log(`\n${bar}\n${title}\n${bar}`);
}

function isoDate(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "—";
}

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + " ".repeat(width - s.length);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Active roster, fetched once and reused by S1, S2, S8, S9.
  const { data: activeData, error: pErr } = await supabase
    .from("players")
    .select(
      "id, first_name, last_name, graduation_year, position, status, created_at, team_name, photo_url",
    )
    .eq("status", "active");
  if (pErr) throw pErr;
  const active: PlayerActive[] = (activeData ?? []) as PlayerActive[];

  // ── SECTION 1 ─────────────────────────────────────────────────────
  divider("SECTION 1 — Every active player");
  const s1 = [...active].sort((a, b) => {
    const ay = a.graduation_year ?? 9999;
    const by = b.graduation_year ?? 9999;
    if (ay !== by) return ay - by;
    return (a.last_name ?? "").localeCompare(b.last_name ?? "");
  });
  console.log(`  ${s1.length} active player(s)\n`);
  for (const p of s1) {
    console.log(`  ${p.id}`);
    console.log(`    ${p.first_name} ${p.last_name}`);
    console.log(
      `    grad=${p.graduation_year ?? "—"}  position=${p.position ?? "—"}  status=${p.status}  created=${isoDate(p.created_at)}  team=${p.team_name ?? "—"}`,
    );
  }

  // ── SECTION 2 ─────────────────────────────────────────────────────
  divider("SECTION 2 — Suspected duplicates (active, by lower(first+last))");
  const groups = new Map<string, PlayerActive[]>();
  for (const p of active) {
    const key = `${(p.first_name ?? "").toLowerCase()}|${(p.last_name ?? "").toLowerCase()}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(p);
    groups.set(key, bucket);
  }
  const clusters = [...groups.values()].filter((g) => g.length > 1);
  if (clusters.length === 0) {
    console.log(
      "  No duplicates by lowercase first+last among active players.",
    );
  } else {
    console.log(`  ${clusters.length} duplicate cluster(s) found.`);
    for (const cluster of clusters) {
      console.log(
        `\n  cluster: ${cluster[0].first_name} ${cluster[0].last_name} — ${cluster.length} rows`,
      );
      for (const p of cluster) {
        console.log(
          `    id=${p.id}  first=${p.first_name}  last=${p.last_name}  grad=${p.graduation_year ?? "—"}  status=${p.status}  created=${isoDate(p.created_at)}  photo=${p.photo_url ? "✓" : "—"}`,
        );
      }
    }
  }

  // ── SECTION 3 ─────────────────────────────────────────────────────
  divider(
    "SECTION 3 — Specific players Harrison flagged (status-agnostic, case-insensitive)",
  );
  const { data: allData, error: pAllErr } = await supabase
    .from("players")
    .select(
      "id, first_name, last_name, graduation_year, status, created_at, photo_url",
    );
  if (pAllErr) throw pAllErr;
  const allPlayers: PlayerLite[] = (allData ?? []) as PlayerLite[];

  const flaggedMatches: PlayerLite[] = allPlayers.filter((p) => {
    const fn = (p.first_name ?? "").toLowerCase();
    const ln = (p.last_name ?? "").toLowerCase();
    return FLAGGED.some(
      (t) => fn === t.first && (t.last === null || ln === t.last),
    );
  });
  console.log(`  ${flaggedMatches.length} match(es).`);
  for (const p of flaggedMatches) {
    console.log(
      `\n  id=${p.id}`,
    );
    console.log(
      `    ${p.first_name} ${p.last_name}  grad=${p.graduation_year ?? "—"}  status=${p.status}  created=${isoDate(p.created_at)}  photo=${p.photo_url ? "✓" : "—"}`,
    );
  }

  const flaggedIds = flaggedMatches.map((p) => p.id);

  // Pre-fetch flagged links + payments once; reuse in S4, S5, S6.
  let flaggedLinks: LinkRow[] = [];
  let flaggedGuardians: GuardianRow[] = [];
  let flaggedPayments: PaymentRow[] = [];
  if (flaggedIds.length > 0) {
    const { data: linksData, error: lErr } = await supabase
      .from("player_guardians")
      .select("player_id, guardian_id, is_primary")
      .in("player_id", flaggedIds);
    if (lErr) throw lErr;
    flaggedLinks = (linksData ?? []) as LinkRow[];

    const guardianIds = [...new Set(flaggedLinks.map((l) => l.guardian_id))];
    if (guardianIds.length > 0) {
      const { data: gData, error: gErr } = await supabase
        .from("guardians")
        .select("id, email, first_name, last_name, phone, created_at")
        .in("id", guardianIds);
      if (gErr) throw gErr;
      flaggedGuardians = (gData ?? []) as GuardianRow[];
    }

    const { data: payData, error: payErr } = await supabase
      .from("payments")
      .select(
        "id, player_id, payment_method, payment_category, amount_cents, season, status, created_at, stripe_session_id",
      )
      .in("player_id", flaggedIds);
    if (payErr) throw payErr;
    flaggedPayments = (payData ?? []) as PaymentRow[];
  }

  // ── SECTION 4 ─────────────────────────────────────────────────────
  divider("SECTION 4 — Guardian linkages for flagged players");
  if (flaggedMatches.length === 0) {
    console.log("  No flagged players → nothing to look up.");
  } else {
    const guardianById = new Map<string, GuardianRow>();
    for (const g of flaggedGuardians) guardianById.set(g.id, g);

    for (const p of flaggedMatches) {
      const links = flaggedLinks.filter((l) => l.player_id === p.id);
      console.log(
        `\n  ${p.first_name} ${p.last_name} (${p.id}) — ${links.length} guardian(s)`,
      );
      if (links.length === 0) {
        console.log("    (no guardian linked)");
        continue;
      }
      for (const l of links) {
        const g = guardianById.get(l.guardian_id);
        if (!g) {
          console.log(
            `    guardian_id=${l.guardian_id}  primary=${l.is_primary}  (guardian row not found)`,
          );
          continue;
        }
        console.log(
          `    email=${g.email}  ${g.first_name ?? "—"} ${g.last_name ?? "—"}  phone=${g.phone ?? "—"}  created=${isoDate(g.created_at)}  primary=${l.is_primary}`,
        );
      }
    }
  }

  // ── SECTION 5 ─────────────────────────────────────────────────────
  divider("SECTION 5 — Payment history for flagged players");
  if (flaggedMatches.length === 0) {
    console.log("  No flagged players → nothing to look up.");
  } else {
    for (const p of flaggedMatches) {
      const mine = flaggedPayments.filter((pay) => pay.player_id === p.id);
      console.log(
        `\n  ${p.first_name} ${p.last_name} (${p.id}) — ${mine.length} payment(s)`,
      );
      if (mine.length === 0) {
        console.log("    (no payments)");
        continue;
      }
      for (const pay of mine) {
        const dollars = ((pay.amount_cents ?? 0) / 100).toFixed(2);
        console.log(
          `    method=${pay.payment_method ?? "—"}  category=${pay.payment_category ?? "—"}  amount=$${dollars}  season=${pay.season ?? "—"}  status=${pay.status ?? "—"}  created=${isoDate(pay.created_at)}  stripe_session=${pay.stripe_session_id ?? "null"}`,
        );
      }
    }
  }

  // ── SECTION 6 ─────────────────────────────────────────────────────
  divider("SECTION 6 — Source inference for flagged players");
  if (flaggedMatches.length === 0) {
    console.log("  No flagged players → nothing to infer.");
  } else {
    for (const p of flaggedMatches) {
      const myPayments = flaggedPayments.filter((pa) => pa.player_id === p.id);
      const hasHistorical = myPayments.some(
        (pa) => pa.payment_method === "historical",
      );
      const myLinks = flaggedLinks.filter((l) => l.player_id === p.id);
      const hasGuardian = myLinks.length > 0;
      const createdMs = p.created_at
        ? new Date(p.created_at).getTime()
        : Number.NaN;

      let label: string;
      if (p.photo_url) {
        label = "came through public /api/register (photo uploaded)";
      } else if (hasHistorical) {
        label = "seeded from Wix history";
      } else if (Number.isFinite(createdMs) && createdMs < CUTOFF_MS && !hasHistorical) {
        label = "early seed, unknown origin";
      } else if (Number.isFinite(createdMs) && createdMs > CUTOFF_MS && !hasGuardian) {
        label = "manually created or partial registration";
      } else {
        label = "unknown — flag for manual review";
      }
      console.log(`  ${p.first_name} ${p.last_name}: ${label}`);
    }
  }

  // ── SECTION 7 ─────────────────────────────────────────────────────
  divider("SECTION 7 — Season values audit (KPI bug investigation)");
  const { data: planSeasonRows, error: psErr } = await supabase
    .from("payment_plans")
    .select("season");
  if (psErr) throw psErr;
  const { data: paySeasonRows, error: paysErr } = await supabase
    .from("payments")
    .select("season");
  if (paysErr) throw paysErr;

  function freq(rows: SeasonRow[]): Map<string, number> {
    const m = new Map<string, number>();
    for (const r of rows) {
      const key = r.season === null || r.season === undefined ? "(null)" : r.season;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }
  const planFreq = freq((planSeasonRows ?? []) as SeasonRow[]);
  const payFreq = freq((paySeasonRows ?? []) as SeasonRow[]);

  console.log("\n  payment_plans.season:");
  if (planFreq.size === 0) {
    console.log("    (no rows)");
  }
  for (const [k, n] of [...planFreq.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${pad(k, 24)} ${n}`);
  }
  console.log("\n  payments.season:");
  if (payFreq.size === 0) {
    console.log("    (no rows)");
  }
  for (const [k, n] of [...payFreq.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${pad(k, 24)} ${n}`);
  }

  // ── SECTION 8 ─────────────────────────────────────────────────────
  divider("SECTION 8 — Roster by graduation year (active only)");
  const byYear = new Map<string, number>();
  for (const p of active) {
    const key =
      p.graduation_year !== null && p.graduation_year !== undefined
        ? String(p.graduation_year)
        : "(unknown)";
    byYear.set(key, (byYear.get(key) ?? 0) + 1);
  }
  const yearKeys = [...byYear.keys()].sort((a, b) => {
    if (a === "(unknown)") return 1;
    if (b === "(unknown)") return -1;
    return Number(a) - Number(b);
  });
  if (yearKeys.length === 0) {
    console.log("  (no active players)");
  }
  for (const k of yearKeys) {
    console.log(`  ${k}: ${byYear.get(k)}`);
  }

  // ── SECTION 9 ─────────────────────────────────────────────────────
  divider("SECTION 9 — Position data audit (active only)");
  let withPos = 0;
  let nullPos = 0;
  let emptyPos = 0;
  const distinct = new Map<string, number>();
  for (const p of active) {
    if (p.position === null || p.position === undefined) {
      nullPos++;
    } else if (typeof p.position === "string" && p.position.trim() === "") {
      emptyPos++;
    } else {
      withPos++;
      const key = String(p.position);
      distinct.set(key, (distinct.get(key) ?? 0) + 1);
    }
  }
  console.log(`  position SET (non-null, non-empty): ${withPos}`);
  console.log(`  position NULL:                       ${nullPos}`);
  console.log(`  position empty string (""):          ${emptyPos}`);
  if (distinct.size > 0) {
    console.log("\n  distinct values:");
    for (const [v, n] of [...distinct.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${pad(v, 24)} ${n}`);
    }
  }

  console.log();
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
