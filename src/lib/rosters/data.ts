/**
 * Roster CRM — server data layer.
 *
 * One screen, three source tables. The athlete is the spine: players is the
 * canonical record, tryout_registrations and roster_confirmations attach to it
 * by ID (backfilled 2026-07-30; new rows pin at read time and are surfaced for
 * a human when ambiguous). A registration linked to an active player is
 * ABSORBED into her returning row — one girl, one row, never two.
 *
 * Placement is two fields, written together:
 *   placed_team      — which age-group class team ("2030"); its CHECK is the
 *                      rail that makes Move Up / Move Down work.
 *   placement_tier   — which roster within the class. Naming standard: the
 *                      values are elite | blue | elite_youth | elite_training
 *                      | declined. "Development" never labels a person.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  normName,
  splitName,
  findConfirmationForRegistration,
  type ConfirmationRow as BaseConfirmationRow,
} from "@/lib/command-sheet/data";
import {
  type PaidStatus,
  type RosterAthlete,
  type RosterData,
  type RosterFlag,
} from "@/lib/rosters/shared";

export * from "@/lib/rosters/shared";

// ── Row shapes (explicit column lists, matched in the selects below) ──────

interface RegRow {
  id: string;
  player_full_name: string;
  parent_name: string | null;
  email: string | null;
  phone: string | null;
  graduation_year: number | null;
  position: string | null;
  tryout_type: string | null;
  tryout_date: string | null;
  tryout_group: string | null;
  payment_status: string;
  created_at: string;
  pipeline_status: string;
  placed_team: string | null;
  placement_tier: string | null;
  jersey_number: string | null;
  player_id: string | null;
  roster_confirmation_id: string | null;
  source: string;
  school: string | null;
  notes: string | null;
}

interface PlayerRow {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number;
  placed_team: string | null;
  placement_tier: string | null;
  position: string | null;
  jersey_number: string | null;
  school: string | null;
  status: string;
  fallback_email: string | null;
  unverified_phone: string | null;
  created_at: string;
}

interface GuardianRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
}

interface PlayerGuardianRow {
  player_id: string;
  guardian_id: string;
  is_primary: boolean;
}

interface ConfRow {
  id: string;
  created_at: string;
  player_first_name: string;
  player_last_name: string;
  player_grad_year: number;
  team: string;
  parent1_name: string;
  parent1_email: string;
  parent1_phone: string;
  parent2_name: string | null;
  parent2_email: string | null;
  parent2_phone: string | null;
  reserve_paid: boolean;
  paid_at: string | null;
}

// ── Client + fetch ────────────────────────────────────────────────────────

export function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function classOf(placedTeam: string | null, gradYear: number | null): number | null {
  if (placedTeam && /^\d{4}$/.test(placedTeam)) return parseInt(placedTeam, 10);
  return gradYear;
}

function isSuperseded(notes: string | null): boolean {
  return !!notes && notes.toUpperCase().includes("SUPERSEDED");
}

interface BalanceRow {
  player_id: string;
  season: string | null;
  charged_cents: number;
  paid_cents: number;
  remaining_cents: number;
  is_settled: boolean;
}

interface PaymentRow {
  player_id: string | null;
  status: string;
  amount_cents: number;
}

function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

/**
 * Payment truth, read-only. player_balances() is the same plan-aware
 * computation every financial surface reads; raw payments cover the one case
 * it can't see — a player with payments on file but no plan.
 */
function buildPaidResolver(
  balances: BalanceRow[],
  payments: PaymentRow[],
): (playerId: string | null) => { status: PaidStatus; detail: string | null } {
  const balanceByPlayer = new Map<string, BalanceRow>();
  for (const b of balances) balanceByPlayer.set(b.player_id, b);
  const paidByPlayer = new Map<string, number>();
  for (const p of payments) {
    if (p.status !== "completed" || !p.player_id) continue;
    paidByPlayer.set(p.player_id, (paidByPlayer.get(p.player_id) ?? 0) + p.amount_cents);
  }

  return (playerId) => {
    if (!playerId) {
      return {
        status: "unknown",
        detail: "No player link — payments can't be resolved for this athlete yet.",
      };
    }
    const b = balanceByPlayer.get(playerId);
    if (b) {
      const season = b.season ? ` · ${b.season}` : "";
      if (b.is_settled || b.remaining_cents <= 0) {
        return { status: "paid", detail: `${dollars(b.paid_cents)} of ${dollars(b.charged_cents)} paid${season}` };
      }
      if (b.paid_cents > 0) {
        return {
          status: "partial",
          detail: `${dollars(b.paid_cents)} of ${dollars(b.charged_cents)} paid · ${dollars(b.remaining_cents)} open${season}`,
        };
      }
      return { status: "none", detail: `${dollars(b.charged_cents)} charged, nothing paid${season}` };
    }
    const paid = paidByPlayer.get(playerId) ?? 0;
    if (paid > 0) {
      return { status: "partial", detail: `${dollars(paid)} in payments on file, no payment plan` };
    }
    return { status: "none", detail: "No payments on file" };
  };
}

export async function buildRosterData(db: SupabaseClient): Promise<RosterData> {
  const [regs, players, guardians, pg, confs, balances, payments] = await Promise.all([
    db
      .from("tryout_registrations")
      .select(
        "id, player_full_name, parent_name, email, phone, graduation_year, position, tryout_type, tryout_date, tryout_group, payment_status, created_at, pipeline_status, placed_team, placement_tier, jersey_number, player_id, roster_confirmation_id, source, school, notes",
      )
      .order("created_at", { ascending: false }),
    db
      .from("players")
      .select(
        "id, first_name, last_name, graduation_year, placed_team, placement_tier, position, jersey_number, school, status, fallback_email, unverified_phone, created_at",
      )
      .eq("status", "active")
      .order("last_name", { ascending: true }),
    db.from("guardians").select("id, email, first_name, last_name, phone"),
    db.from("player_guardians").select("player_id, guardian_id, is_primary"),
    db
      .from("roster_confirmations")
      .select(
        "id, created_at, player_first_name, player_last_name, player_grad_year, team, parent1_name, parent1_email, parent1_phone, parent2_name, parent2_email, parent2_phone, reserve_paid, paid_at",
      ),
    db.rpc("player_balances"),
    db.from("payments").select("player_id, status, amount_cents"),
  ]);

  const firstError =
    regs.error ?? players.error ?? guardians.error ?? pg.error ?? confs.error ??
    balances.error ?? payments.error;
  if (firstError) throw new Error(`Supabase read failed: ${firstError.message}`);

  const regRows = (regs.data ?? []) as RegRow[];
  const playerRows = (players.data ?? []) as PlayerRow[];
  const guardianRows = (guardians.data ?? []) as GuardianRow[];
  const pgRows = (pg.data ?? []) as PlayerGuardianRow[];
  const confRows = (confs.data ?? []) as ConfRow[];
  const resolvePaid = buildPaidResolver(
    (balances.data ?? []) as BalanceRow[],
    (payments.data ?? []) as PaymentRow[],
  );

  const guardianById = new Map<string, GuardianRow>();
  for (const g of guardianRows) guardianById.set(g.id, g);

  const guardianForPlayer = new Map<string, GuardianRow>();
  for (const link of pgRows) {
    const g = guardianById.get(link.guardian_id);
    if (!g) continue;
    const existing = guardianForPlayer.get(link.player_id);
    if (!existing || link.is_primary) guardianForPlayer.set(link.player_id, g);
  }

  const confById = new Map<string, ConfRow>();
  for (const c of confRows) confById.set(c.id, c);

  // Confirmations for players placed outside the pipeline: name + grad year.
  const confsByNameKey = new Map<string, ConfRow[]>();
  for (const c of confRows) {
    const k = `${normName(`${c.player_first_name} ${c.player_last_name}`)}|${c.player_grad_year}`;
    const list = confsByNameKey.get(k) ?? [];
    list.push(c);
    confsByNameKey.set(k, list);
  }

  const live = regRows.filter((r) => !isSuperseded(r.notes));
  const activePlayerIds = new Set(playerRows.map((p) => p.id));
  const regsByPlayer = new Map<string, RegRow[]>();
  for (const r of live) {
    if (r.player_id && activePlayerIds.has(r.player_id)) {
      const list = regsByPlayer.get(r.player_id) ?? [];
      list.push(r);
      regsByPlayer.set(r.player_id, list);
    }
  }

  const athletes: RosterAthlete[] = [];

  // ── Returning band: every active player, registration data absorbed ─────
  for (const p of playerRows) {
    const linked = regsByPlayer.get(p.id) ?? [];
    const bestReg =
      linked.find((r) => r.roster_confirmation_id) ??
      linked.find((r) => r.payment_status === "paid") ??
      linked[0] ??
      null;

    let conf: ConfRow | null = bestReg?.roster_confirmation_id
      ? (confById.get(bestReg.roster_confirmation_id) ?? null)
      : null;
    if (!conf) {
      const k = `${normName(`${p.first_name} ${p.last_name}`)}|${p.graduation_year}`;
      const byName = confsByNameKey.get(k) ?? [];
      conf = byName.length === 1 ? byName[0] : null;
    }

    const g = guardianForPlayer.get(p.id) ?? null;
    const parentEmail = g?.email ?? p.fallback_email;
    const parentPhone = g?.phone ?? bestReg?.phone ?? p.unverified_phone;
    const parentName = g
      ? `${g.first_name} ${g.last_name}`
      : (bestReg?.parent_name ?? conf?.parent1_name ?? null);

    const position =
      p.position ??
      (bestReg?.position && bestReg.position !== "Undecided" ? bestReg.position : null);
    const flags: RosterFlag[] = [];
    if (!parentEmail && !parentPhone) flags.push("no_contact");
    if (!position) flags.push("no_position");
    const registered = linked.some((r) => r.source === "tryout");
    if (!registered) flags.push("not_registered");

    const paid = resolvePaid(p.id);
    athletes.push({
      key: `player:${p.id}`,
      table: "players",
      id: p.id,
      band: "returning",
      name: `${p.first_name} ${p.last_name}`,
      gradYear: p.graduation_year,
      classYear: classOf(p.placed_team, p.graduation_year),
      position,
      school: p.school ?? bestReg?.school ?? null,
      jersey: p.jersey_number ?? bestReg?.jersey_number ?? null,
      parentName,
      parentEmail: parentEmail ?? null,
      parentPhone: parentPhone ?? null,
      confirmed: !!conf,
      paidStatus: paid.status,
      paidDetail: paid.detail,
      placedTeam: p.placed_team,
      placementTier: p.placement_tier,
      source: null,
      registered,
      createdAt: bestReg?.created_at ?? p.created_at,
      flags,
      dupOf: [],
      noteText: bestReg?.notes ?? null,
    });
  }

  // ── New band: registrations not absorbed into a returning row ───────────
  for (const r of live) {
    if (r.player_id && activePlayerIds.has(r.player_id)) continue;

    let conf: ConfRow | null = r.roster_confirmation_id
      ? (confById.get(r.roster_confirmation_id) ?? null)
      : null;
    if (!conf) {
      const fuzzy = findConfirmationForRegistration(
        r,
        confRows as unknown as BaseConfirmationRow[],
      );
      conf = fuzzy ? (confById.get(fuzzy.id) ?? null) : null;
    }

    // Contact resolves through the confirmation before it's judged missing —
    // a clipboard recruit whose family later confirmed IS reachable.
    const email = r.email ?? conf?.parent1_email ?? null;
    const phone = r.phone ?? conf?.parent1_phone ?? null;

    const flags: RosterFlag[] = [];
    if (!email && !phone) flags.push("no_contact");
    if (r.graduation_year == null) flags.push("no_grad_year");
    if (!r.position || r.position === "Undecided") flags.push("no_position");
    if (r.source === "recruiting") flags.push("clipboard");

    // A reg linked to an inactive player still resolves payments through it;
    // a reg with no player link is 'unknown', which is not 'unpaid'.
    const paid = resolvePaid(r.player_id);
    athletes.push({
      key: `reg:${r.id}`,
      table: "tryout_registrations",
      id: r.id,
      band: "new",
      name: r.player_full_name,
      gradYear: r.graduation_year,
      classYear: classOf(r.placed_team, r.graduation_year),
      position: r.position === "Undecided" ? null : r.position,
      school: r.school,
      jersey: r.jersey_number,
      parentName: r.parent_name ?? conf?.parent1_name ?? null,
      parentEmail: email,
      parentPhone: phone,
      confirmed: !!conf,
      paidStatus: paid.status,
      paidDetail: paid.detail,
      placedTeam: r.placed_team,
      placementTier: r.placement_tier,
      source: r.source === "recruiting" ? "recruiting" : "tryout",
      registered: r.source === "tryout",
      createdAt: r.created_at,
      flags,
      dupOf: [],
      noteText: r.notes,
    });
  }

  attachDuplicates(athletes);

  return { athletes, fetchedAt: new Date().toISOString() };
}

// ── Duplicate detection (read side — write-side flagging is next sprint) ──

interface NameKeys {
  first: string;
  last: string;
}

function keysFor(name: string): NameKeys {
  const { first, last } = splitName(name);
  return { first: normName(first), last: normName(last) };
}

function prefixEq(a: string, b: string, minLen: number): boolean {
  if (!a || !b) return false;
  if (Math.min(a.length, b.length) < minLen) return a === b;
  return a.startsWith(b) || b.startsWith(a);
}

/**
 * Fuzzy candidate pairing — three independent signals, any one raises the
 * flag (a question chip, never an automatic merge):
 *   1. names agree — first names by prefix, last names equal / prefix / one
 *      side missing;
 *   2. same parent email in the same class ("Gigi" registered as "Gianna");
 *   3. same exact last name in the same class when one side is a clipboard
 *      entry (a hand-written "Liz" for a registered "Elizabeth").
 * Pairs where both sides are returning players are skipped — players is the
 * canonical table and merging there is out of scope.
 */
function attachDuplicates(athletes: RosterAthlete[]): void {
  for (let i = 0; i < athletes.length; i++) {
    for (let j = i + 1; j < athletes.length; j++) {
      const a = athletes[i];
      const b = athletes[j];
      if (a.band === "returning" && b.band === "returning") continue;
      if (a.gradYear != null && b.gradYear != null && a.gradYear !== b.gradYear) {
        continue;
      }

      const ka = keysFor(a.name);
      const kb = keysFor(b.name);
      const nameHit =
        prefixEq(ka.first, kb.first, 3) &&
        (ka.last === kb.last ||
          prefixEq(ka.last, kb.last, 4) ||
          !ka.last ||
          !kb.last);
      const emailHit =
        !!a.parentEmail &&
        !!b.parentEmail &&
        a.parentEmail.toLowerCase() === b.parentEmail.toLowerCase();
      const clipboardLastHit =
        !!ka.last &&
        ka.last === kb.last &&
        (a.source === "recruiting" || b.source === "recruiting");
      if (!nameHit && !emailHit && !clipboardLastHit) continue;

      const describe = (x: RosterAthlete) =>
        [
          x.band === "returning"
            ? "returning player"
            : x.source === "recruiting"
              ? "clipboard entry"
              : "registration",
          x.gradYear != null ? `class of ${x.gradYear}` : "no grad year",
          x.parentEmail ?? undefined,
        ]
          .filter(Boolean)
          .join(" · ");

      a.dupOf.push({
        key: b.key,
        name: b.name,
        detail: describe(b),
        keepTable: b.table,
        keepId: b.id,
      });
      b.dupOf.push({
        key: a.key,
        name: a.name,
        detail: describe(a),
        keepTable: a.table,
        keepId: a.id,
      });
    }
  }
}
