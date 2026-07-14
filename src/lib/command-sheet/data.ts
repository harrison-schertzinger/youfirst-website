/**
 * Roster Command Sheet — database layer.
 *
 * Supabase is truth; the Sheet is a rendered mirror. This module owns every
 * read the renderer needs and the ONLY writes the sheet is allowed to make:
 *   - pipeline_status  (white Status column on PIPELINE)
 *   - placed_team      (white Place On Team column on PIPELINE → promotion)
 *   - jersey numbers   (white Jersey # column on the team tabs)
 *
 * THE PROMOTION is the moment a prospect becomes a rostered player: setting
 * Place On Team creates (or links to) a players row and carries her across.
 * It must be idempotent — running sync twice must never create a girl twice —
 * and clearing a placement UNLINKS but never deletes a players row.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ── Shapes ────────────────────────────────────────────────────────────────

export interface RegistrationRow {
  id: string;
  player_full_name: string;
  parent_name: string;
  email: string;
  phone: string;
  graduation_year: number;
  position: string | null;
  tryout_type: string | null;
  tryout_date: string | null;
  payment_status: string;
  created_at: string;
  pipeline_status: string;
  placed_team: string | null;
  jersey_number: string | null;
  player_id: string | null;
  roster_confirmation_id: string | null;
}

export interface PlayerRow {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  roster_team: string | null;
  position: string | null;
  jersey_number: string | null;
  shirt_size: string | null;
  short_size: string | null;
  sweatshirt_size: string | null;
  shooting_shirt_size: string | null;
  status: string;
}

export interface GuardianRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
}

export interface PlayerGuardianRow {
  player_id: string;
  guardian_id: string;
  is_primary: boolean;
}

export interface ConfirmationRow {
  id: string;
  created_at: string;
  player_first_name: string;
  player_last_name: string;
  player_grad_year: number;
  team: string;
  player_phone: string | null;
  parent1_name: string;
  parent1_email: string;
  parent1_phone: string;
  parent2_name: string | null;
  parent2_email: string | null;
  parent2_phone: string | null;
  jersey_size: string;
  shorts_size: string;
  sweatshirt_size: string | null;
  shooting_shirt_size: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

export interface PaymentPlanRow {
  player_id: string;
  total_amount_cents: number;
  amount_paid_cents: number;
}

export interface PlayerChargeRow {
  player_id: string;
  amount_cents: number;
  status: string;
}

export interface SyncRunRow {
  id: string;
  kind: string;
  trigger: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  rows_read: number | null;
  rows_written: number | null;
  rows_changed: number | null;
  log: string[];
  error: string | null;
}

export interface Snapshot {
  registrations: RegistrationRow[];
  players: PlayerRow[];
  guardians: Map<string, GuardianRow>;
  playerGuardians: PlayerGuardianRow[];
  confirmations: ConfirmationRow[];
  plans: PaymentPlanRow[];
  charges: PlayerChargeRow[];
  runs: SyncRunRow[];
  paymentsCollectedCents: number;
}

// ── Status vocabulary ─────────────────────────────────────────────────────

export const PIPELINE_STATUSES = [
  "new",
  "contacted",
  "evaluated",
  "offered",
  "placed",
  "passed",
] as const;

export const TEAM_TABS = ["2028", "2029", "2030", "2031", "2032", "2033", "2034"] as const;

/** DB 'evaluated' ↔ Sheet 'Evaluated' */
export function statusToSheet(db: string): string {
  return db ? db.charAt(0).toUpperCase() + db.slice(1) : "New";
}
export function statusToDb(sheet: string): string | null {
  const v = sheet.trim().toLowerCase();
  return (PIPELINE_STATUSES as readonly string[]).includes(v) ? v : null;
}

export function normName(s: string): string {
  return s.normalize("NFKD").replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** "Charlotte Anne Gosdin" → { first: "Charlotte Anne", last: "Gosdin" } */
export function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

export function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Reads ─────────────────────────────────────────────────────────────────

export async function fetchSnapshot(db: SupabaseClient): Promise<Snapshot> {
  const [regs, players, guardians, pg, confs, plans, charges, runs, payments] =
    await Promise.all([
      db
        .from("tryout_registrations")
        .select(
          "id, player_full_name, parent_name, email, phone, graduation_year, position, tryout_type, tryout_date, payment_status, created_at, pipeline_status, placed_team, jersey_number, player_id, roster_confirmation_id",
        )
        .order("created_at", { ascending: false }),
      db
        .from("players")
        .select(
          "id, first_name, last_name, graduation_year, roster_team, position, jersey_number, shirt_size, short_size, sweatshirt_size, shooting_shirt_size, status",
        )
        .eq("status", "active")
        .order("last_name", { ascending: true }),
      db.from("guardians").select("id, email, first_name, last_name, phone"),
      db.from("player_guardians").select("player_id, guardian_id, is_primary"),
      db
        .from("roster_confirmations")
        .select(
          "id, created_at, player_first_name, player_last_name, player_grad_year, team, player_phone, parent1_name, parent1_email, parent1_phone, parent2_name, parent2_email, parent2_phone, jersey_size, shorts_size, sweatshirt_size, shooting_shirt_size, emergency_contact_name, emergency_contact_phone",
        ),
      db.from("payment_plans").select("player_id, total_amount_cents, amount_paid_cents"),
      db.from("player_charges").select("player_id, amount_cents, status"),
      db
        .from("sheet_sync_runs")
        .select(
          "id, kind, trigger, status, started_at, finished_at, duration_ms, rows_read, rows_written, rows_changed, log, error",
        )
        .order("started_at", { ascending: false })
        .limit(50),
      db.from("payments").select("amount_cents, status"),
    ]);

  const firstError =
    regs.error ?? players.error ?? guardians.error ?? pg.error ?? confs.error ??
    plans.error ?? charges.error ?? runs.error ?? payments.error;
  if (firstError) throw new Error(`Supabase read failed: ${firstError.message}`);

  const guardianMap = new Map<string, GuardianRow>();
  for (const g of (guardians.data ?? []) as GuardianRow[]) guardianMap.set(g.id, g);

  const paymentsCollectedCents = ((payments.data ?? []) as Array<{
    amount_cents: number;
    status: string;
  }>)
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + (p.amount_cents ?? 0), 0);

  return {
    registrations: (regs.data ?? []) as RegistrationRow[],
    players: (players.data ?? []) as PlayerRow[],
    guardians: guardianMap,
    playerGuardians: (pg.data ?? []) as PlayerGuardianRow[],
    confirmations: (confs.data ?? []) as ConfirmationRow[],
    plans: (plans.data ?? []) as PaymentPlanRow[],
    charges: (charges.data ?? []) as PlayerChargeRow[],
    runs: ((runs.data ?? []) as SyncRunRow[]).map((r) => ({
      ...r,
      log: Array.isArray(r.log) ? (r.log as string[]) : [],
    })),
    paymentsCollectedCents,
  };
}

// ── Confirmation matching ─────────────────────────────────────────────────

/**
 * The fuzzy key: parent email + player name + grad year. Used once to PIN a
 * confirmation onto a registration (roster_confirmation_id); pinned rows are
 * never re-fuzzy-matched.
 */
export function findConfirmationForRegistration(
  reg: RegistrationRow,
  confirmations: ConfirmationRow[],
): ConfirmationRow | null {
  const matches = confirmations.filter(
    (c) =>
      c.parent1_email.toLowerCase() === reg.email.toLowerCase() &&
      normName(`${c.player_first_name} ${c.player_last_name}`) ===
        normName(reg.player_full_name) &&
      c.player_grad_year === reg.graduation_year,
  );
  return matches.length === 1 ? matches[0] : null;
}

/** Name + grad-year match for players placed outside the pipeline. */
export function findConfirmationForPlayer(
  player: PlayerRow,
  confirmations: ConfirmationRow[],
): ConfirmationRow | null {
  const key = normName(`${player.first_name} ${player.last_name}`);
  const matches = confirmations.filter(
    (c) =>
      normName(`${c.player_first_name} ${c.player_last_name}`) === key &&
      (player.graduation_year == null || c.player_grad_year === player.graduation_year),
  );
  return matches.length === 1 ? matches[0] : null;
}

// ── The promotion ─────────────────────────────────────────────────────────

export interface PromotionResult {
  ok: boolean;
  /** English line for _SYNC. */
  line: string;
}

async function upsertGuardian(
  db: SupabaseClient,
  email: string,
  fullName: string,
  phone: string | null,
): Promise<string | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;
  const { data: existing } = await db
    .from("guardians")
    .select("id, phone")
    .eq("email", cleanEmail)
    .maybeSingle();
  if (existing) {
    if (!existing.phone && phone) {
      await db.from("guardians").update({ phone }).eq("id", existing.id);
    }
    return existing.id as string;
  }
  const { first, last } = splitName(fullName || cleanEmail.split("@")[0]);
  const { data: created, error } = await db
    .from("guardians")
    .insert({
      email: cleanEmail,
      first_name: first || "—",
      last_name: last || "—",
      phone,
    })
    .select("id")
    .single();
  if (error) {
    // Unique-email race: someone else inserted between our read and write.
    const { data: retry } = await db
      .from("guardians")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();
    return (retry?.id as string) ?? null;
  }
  return created.id as string;
}

async function linkGuardian(
  db: SupabaseClient,
  playerId: string,
  guardianId: string,
  isPrimary: boolean,
): Promise<void> {
  await db
    .from("player_guardians")
    .upsert(
      { player_id: playerId, guardian_id: guardianId, is_primary: isPrimary },
      { onConflict: "player_id,guardian_id", ignoreDuplicates: true },
    );
}

/**
 * Promote one registration onto placed_team. Match-before-create; the link is
 * claimed with a compare-and-swap on player_id IS NULL so two racing runs can
 * never double-promote. Snapshot data is used only for matching hints —
 * every write re-checks live state.
 */
export async function promoteRegistration(
  db: SupabaseClient,
  reg: RegistrationRow,
  placedTeam: string,
  snapshot: Snapshot,
): Promise<PromotionResult> {
  const who = `${reg.player_full_name} (${reg.graduation_year})`;

  // 1. Pin the confirmation if one cleanly matches (fresher data, typed by the family).
  let conf: ConfirmationRow | null = null;
  if (reg.roster_confirmation_id) {
    conf = snapshot.confirmations.find((c) => c.id === reg.roster_confirmation_id) ?? null;
  } else {
    conf = findConfirmationForRegistration(reg, snapshot.confirmations);
    if (conf) {
      await db
        .from("tryout_registrations")
        .update({ roster_confirmation_id: conf.id })
        .eq("id", reg.id)
        .is("roster_confirmation_id", null);
    }
  }

  const name = conf
    ? { first: conf.player_first_name, last: conf.player_last_name }
    : splitName(reg.player_full_name);

  // 2. Match an existing players row — never duplicate a girl already rostered.
  const nameKey = normName(`${name.first} ${name.last}`);
  const { data: cohort, error: cohortErr } = await db
    .from("players")
    .select("id, first_name, last_name, graduation_year, roster_team, position, jersey_number, shirt_size, short_size, sweatshirt_size, shooting_shirt_size, status")
    .eq("graduation_year", reg.graduation_year);
  if (cohortErr) return { ok: false, line: `Promotion of ${who} failed reading players: ${cohortErr.message}` };

  const candidates = ((cohort ?? []) as PlayerRow[]).filter(
    (p) => normName(`${p.first_name} ${p.last_name}`) === nameKey,
  );

  if (candidates.length > 1) {
    return {
      ok: false,
      line: `NEEDS A HUMAN: ${who} matches ${candidates.length} existing players — left unpromoted so no one gets duplicated.`,
    };
  }

  let playerId: string;
  let created = false;

  if (candidates.length === 1) {
    playerId = candidates[0].id;
    // Move her team label + fill blanks from the confirmation; never overwrite.
    const p = candidates[0];
    const fills: Record<string, string> = {};
    if (p.roster_team !== placedTeam) fills.roster_team = placedTeam;
    if (!p.position && reg.position && reg.position !== "Undecided") fills.position = reg.position;
    if (conf) {
      if (!p.shirt_size) fills.shirt_size = conf.jersey_size;
      if (!p.short_size) fills.short_size = conf.shorts_size;
      if (!p.sweatshirt_size && conf.sweatshirt_size) fills.sweatshirt_size = conf.sweatshirt_size;
      if (!p.shooting_shirt_size && conf.shooting_shirt_size)
        fills.shooting_shirt_size = conf.shooting_shirt_size;
    }
    if (Object.keys(fills).length > 0) {
      await db.from("players").update(fills).eq("id", playerId);
    }
  } else {
    const { data: newPlayer, error: createErr } = await db
      .from("players")
      .insert({
        first_name: name.first,
        last_name: name.last,
        graduation_year: reg.graduation_year,
        roster_team: placedTeam,
        team_name: "You. First Elite",
        position: reg.position && reg.position !== "Undecided" ? reg.position : null,
        shirt_size: conf?.jersey_size ?? null,
        short_size: conf?.shorts_size ?? null,
        sweatshirt_size: conf?.sweatshirt_size ?? null,
        shooting_shirt_size: conf?.shooting_shirt_size ?? null,
        status: "active",
      })
      .select("id")
      .single();
    if (createErr || !newPlayer) {
      return { ok: false, line: `Promotion of ${who} failed creating her player row: ${createErr?.message ?? "no row"}` };
    }
    playerId = newPlayer.id as string;
    created = true;
  }

  // 3. Claim the link — compare-and-swap so a racing run can't double-promote.
  const { data: claimed, error: claimErr } = await db
    .from("tryout_registrations")
    .update({ player_id: playerId, placed_team: placedTeam, pipeline_status: "placed" })
    .eq("id", reg.id)
    .is("player_id", null)
    .select("id");

  if (claimErr || !claimed || claimed.length === 0) {
    if (created) {
      // We lost the race after creating a fresh row nothing references yet —
      // remove it so the girl isn't duplicated. (Never do this to a matched row.)
      await db.from("player_guardians").delete().eq("player_id", playerId);
      await db.from("players").delete().eq("id", playerId);
    }
    return {
      ok: false,
      line: `Promotion of ${who} skipped — another sync already promoted her (no duplicate created).`,
    };
  }

  // 4. Guardians — so the portal and dues work the moment she's placed.
  let guardianCount = 0;
  const g1 = await upsertGuardian(
    db,
    conf?.parent1_email ?? reg.email,
    conf?.parent1_name ?? reg.parent_name,
    conf?.parent1_phone ?? reg.phone ?? null,
  );
  if (g1) {
    await linkGuardian(db, playerId, g1, true);
    guardianCount++;
  }
  if (conf?.parent2_email) {
    const g2 = await upsertGuardian(db, conf.parent2_email, conf.parent2_name ?? "", conf.parent2_phone);
    if (g2) {
      await linkGuardian(db, playerId, g2, false);
      guardianCount++;
    }
  }

  const how = created
    ? `Created new player + ${guardianCount} guardian${guardianCount === 1 ? "" : "s"}`
    : "Linked existing player";
  const confNote = conf ? " Confirmation pinned." : "";
  return { ok: true, line: `Promoted ${who} → ${placedTeam} roster. ${how}.${confNote}` };
}

/**
 * Harrison cleared Place On Team: back to Offered, UNLINK the player row but
 * NEVER delete it — an accidentally cleared dropdown must not erase a child's
 * record. The players row stays (visible on its team tab) until a human acts.
 */
export async function unlinkRegistration(
  db: SupabaseClient,
  reg: RegistrationRow,
): Promise<string> {
  await db
    .from("tryout_registrations")
    .update({ placed_team: null, player_id: null, pipeline_status: "offered" })
    .eq("id", reg.id);
  return `UNPLACED ${reg.player_full_name} (${reg.graduation_year}) — placement cleared in the Sheet. Her player row was kept (never auto-deleted); remove or re-place her deliberately.`;
}
