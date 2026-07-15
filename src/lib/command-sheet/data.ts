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
  /** Null on recruiting rows — a chased name with no family contact yet. */
  parent_name: string | null;
  email: string | null;
  phone: string | null;
  graduation_year: number | null;
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
  /** 'tryout' (family registered) or 'recruiting' (Harrison wrote her down). */
  source: string;
  school: string | null;
  notes: string | null;
}

export interface PlayerRow {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  /** The tab key — which grad-year-named team she plays on (girls play up). */
  placed_team: string | null;
  position: string | null;
  jersey_number: string | null;
  shirt_size: string | null;
  short_size: string | null;
  sweatshirt_size: string | null;
  shooting_shirt_size: string | null;
  status: string;
  /** Degraded-contact fallbacks from the legacy Rosters Sheet; guardians is truth. */
  fallback_email: string | null;
  fallback_email_status: string | null;
  unverified_phone: string | null;
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

// Eight teams — 2027s are rising seniors, the most college-bound girls in the
// club; they don't get dropped because an earlier spec forgot them.
export const TEAM_TABS = ["2027", "2028", "2029", "2030", "2031", "2032", "2033", "2034"] as const;

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
          "id, player_full_name, parent_name, email, phone, graduation_year, position, tryout_type, tryout_date, payment_status, created_at, pipeline_status, placed_team, jersey_number, player_id, roster_confirmation_id, source, school, notes",
        )
        .order("created_at", { ascending: false }),
      db
        .from("players")
        .select(
          "id, first_name, last_name, graduation_year, placed_team, position, jersey_number, shirt_size, short_size, sweatshirt_size, shooting_shirt_size, status, fallback_email, fallback_email_status, unverified_phone",
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
  if (!reg.email || reg.graduation_year == null) return null;
  const regEmail = reg.email.toLowerCase();
  const matches = confirmations.filter(
    (c) =>
      c.parent1_email.toLowerCase() === regEmail &&
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
  const who = `${reg.player_full_name} (${reg.graduation_year ?? "grad year unknown"})`;

  // Recruits arrive with almost nothing — a players row needs her real class.
  if (reg.graduation_year == null) {
    return {
      ok: false,
      line: `NEEDS A HUMAN: ${reg.player_full_name} has no graduation year on file — add it before placing her (recruiting rows start with just a name).`,
    };
  }

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
    .select("id, first_name, last_name, graduation_year, placed_team, position, jersey_number, shirt_size, short_size, sweatshirt_size, shooting_shirt_size, status, school")
    .eq("graduation_year", reg.graduation_year);
  if (cohortErr) return { ok: false, line: `Promotion of ${who} failed reading players: ${cohortErr.message}` };

  type CohortRow = PlayerRow & { school: string | null };
  const candidates = ((cohort ?? []) as unknown as CohortRow[]).filter(
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
    if (p.placed_team !== placedTeam) fills.placed_team = placedTeam;
    if (!p.position && reg.position && reg.position !== "Undecided") fills.position = reg.position;
    if (!p.school && reg.school) fills.school = reg.school;
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
        placed_team: placedTeam,
        team_name: "You. First Elite",
        position: reg.position && reg.position !== "Undecided" ? reg.position : null,
        school: reg.school,
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
  // Same-parent-different-email trap: if a guardian with this NAME is already
  // linked to her (e.g. dad's personal email in guardians, work email on the
  // registration), reuse that person instead of minting a second record.
  let guardianCount = 0;
  const p1Email = conf?.parent1_email ?? reg.email;
  const p1Name = conf?.parent1_name ?? reg.parent_name ?? "";
  const p1Phone = conf?.parent1_phone ?? reg.phone ?? null;
  if (p1Email) {
    const { data: linkedRows } = await db
      .from("player_guardians")
      .select("guardian_id, guardians(id, first_name, last_name, phone)")
      .eq("player_id", playerId);
    const linkedByName = (linkedRows ?? [])
      .map((r) => r.guardians as unknown as { id: string; first_name: string; last_name: string; phone: string | null } | null)
      .filter(Boolean)
      .find((g) => p1Name && normName(`${g!.first_name} ${g!.last_name}`) === normName(p1Name));

    let g1: string | null;
    if (linkedByName) {
      g1 = linkedByName.id;
      if (!linkedByName.phone && p1Phone) {
        await db.from("guardians").update({ phone: p1Phone }).eq("id", g1);
      }
    } else {
      g1 = await upsertGuardian(db, p1Email, p1Name, p1Phone);
    }
    if (g1) {
      await linkGuardian(db, playerId, g1, true);
      guardianCount++;
    }
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

// ── Add-a-girl: rows typed straight into PIPELINE's intake zone ───────────

export interface IntakeRow {
  /** 1-based sheet row, for logging only. */
  rowNumber: number;
  name: string;
  gradYear: number | null;
  position: string | null;
  school: string | null;
  notes: string | null;
  parentName: string | null;
  email: string | null;
  phone: string | null;
  /** He also set Place On Team on the typed row — ignored, logged. */
  placeAttempted: string | null;
}

/**
 * Create a recruiting row from a name Harrison typed into the Sheet.
 * A NAME ALONE IS ENOUGH — never validate him into a corner. The one hard
 * guard is duplicates: if the name matches an existing player or pipeline
 * row, nothing is created and _SYNC says so; Harrison decides.
 */
export async function addTypedRecruit(
  db: SupabaseClient,
  intake: IntakeRow,
  snapshot: Snapshot,
): Promise<{ created: boolean; line: string }> {
  const key = normName(intake.name);
  if (!key) return { created: false, line: "" };

  const playerMatch = snapshot.players.find(
    (p) => normName(`${p.first_name} ${p.last_name}`) === key,
  );
  if (playerMatch) {
    return {
      created: false,
      line: `Typed "${intake.name}" — looks like ${playerMatch.first_name} ${playerMatch.last_name}, already rostered on ${playerMatch.placed_team ?? "a team"}. Not created — check before re-adding.`,
    };
  }
  const pipelineMatch = snapshot.registrations.find(
    (r) => normName(r.player_full_name) === key,
  );
  if (pipelineMatch) {
    return {
      created: false,
      line: `Typed "${intake.name}" — possible match to the existing ${pipelineMatch.source === "recruiting" ? "recruit" : "registration"} for ${pipelineMatch.player_full_name}${pipelineMatch.graduation_year != null ? ` (${pipelineMatch.graduation_year})` : ""}. Not created — check before re-adding.`,
    };
  }

  const { error } = await db.from("tryout_registrations").insert({
    player_full_name: intake.name,
    source: "recruiting",
    pipeline_status: "new",
    graduation_year: intake.gradYear,
    position: intake.position,
    school: intake.school,
    notes: intake.notes,
    parent_name: intake.parentName,
    email: intake.email,
    phone: intake.phone,
    tryout_group: null,
    tryout_type: null,
    tryout_date: null,
    amount_cents: 0,
    currency: "usd",
    payment_status: "free",
  });
  if (error) {
    return { created: false, line: `Couldn't add "${intake.name}" (row ${intake.rowNumber}): ${error.message}` };
  }

  const detail = [
    intake.gradYear != null ? String(intake.gradYear) : null,
    intake.school,
  ]
    .filter(Boolean)
    .join(", ");
  const placeNote = intake.placeAttempted
    ? ` Ignored Place On Team "${intake.placeAttempted}" on the typed row — place her on the next sync, now that she's real.`
    : "";
  return {
    created: true,
    line: `Added recruit: ${intake.name}${detail ? ` (${detail})` : ""} — typed into PIPELINE.${placeNote}`,
  };
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
  return `UNPLACED ${reg.player_full_name}${reg.graduation_year != null ? ` (${reg.graduation_year})` : ""} — placement cleared in the Sheet. Her player row was kept (never auto-deleted); remove or re-place her deliberately.`;
}
