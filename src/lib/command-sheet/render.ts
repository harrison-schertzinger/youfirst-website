/**
 * Roster Command Sheet — renderer.
 *
 * Pure functions: snapshot in → cell grids + formatting requests out. Every
 * date in this system is a lacrosse date — parsed from explicit keys and
 * rendered in America/New_York, never trusted to raw Date math.
 *
 * Brand: black / Carolina Blue #4B9CD3 / white. Confirmed checks in restrained
 * green, Follow-Up flags in coral. No gradients, no orange.
 */

import {
  findConfirmationForPlayer,
  normName,
  statusToSheet,
  TEAM_TABS,
  type ConfirmationRow,
  type PlayerRow,
  type RegistrationRow,
  type Snapshot,
  type SyncRunRow,
} from "@/lib/command-sheet/data";
import type { SheetTabInfo } from "@/lib/command-sheet/sheets-api";

// ── Tabs ──────────────────────────────────────────────────────────────────

export const TAB_PIPELINE = "PIPELINE";
export const TAB_DASHBOARD = "DASHBOARD";
export const TAB_SYNC = "_SYNC";
export const ALL_TABS: string[] = [TAB_PIPELINE, ...TEAM_TABS, TAB_DASHBOARD, TAB_SYNC];

export const PIPELINE_HEADERS = [
  "id — do not edit",
  "Status",
  "Place On Team",
  "Player",
  "Grad Year",
  "Position",
  "Source",
  "School / Notes",
  "Tryout Date",
  "Type",
  "Parent",
  "Parent Email",
  "Parent Phone",
  "Player Phone",
  "Payment",
  "Registered On",
  "Days Since",
  "Follow-Up",
] as const; // A..R — white columns: B (Status), C (Place On Team)

export const TEAM_HEADERS = [
  "id — do not edit",
  "Player",
  "Jersey #",
  "Confirmed",
  "Position",
  "Parent",
  "Email",
  "Phone",
  "Emergency Contact",
  "Emergency Phone",
  "Shirt",
  "Shorts",
  "Sweatshirt",
  "Shooter",
  "Balance Due",
] as const; // A..O — white column: C (Jersey #)

export const SYNC_HEADERS = [
  "When (ET)",
  "Kind",
  "Trigger",
  "Status",
  "Duration",
  "Read",
  "Written",
  "Changed",
  "What happened",
] as const;

/** Follow-up flag text — the conditional format keys off this exact value. */
export const FOLLOW_UP_FLAG = "CALL";
export const CONFIRMED_CHECK = "✓";

// ── Dates (America/New_York, always) ─────────────────────────────────────

const ET = "America/New_York";

/** "2026-07-25" → "Sat, Jul 25" (pure date — no timezone math can shift it). */
export function fmtIsoDay(iso: string): string {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return iso;
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12));
  return utcNoon.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function fmtTimestampET(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: ET,
  });
}

export function fmtDateET(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: ET,
  });
}

/** The ET calendar day of an instant, as "YYYY-MM-DD". */
function etDayKey(instant: Date): string {
  return instant.toLocaleDateString("en-CA", { timeZone: ET });
}

/** Whole ET days between a timestamp and now. */
export function daysSinceET(iso: string, now: Date): number {
  const then = etDayKey(new Date(iso));
  const today = etDayKey(now);
  const toUtc = (key: string) => {
    const [y, m, d] = key.split("-").map((n) => parseInt(n, 10));
    return Date.UTC(y, m - 1, d);
  };
  return Math.max(0, Math.round((toUtc(today) - toUtc(then)) / 86_400_000));
}

function fmtPhone(raw: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

function fmtMoney(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

function cap(s: string | null): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fmtTryoutDate(reg: RegistrationRow): string {
  if (reg.source === "recruiting") return "—";
  if (reg.tryout_type === "evaluation" || !reg.tryout_date) return "Evaluation — flexible";
  return fmtIsoDay(reg.tryout_date);
}

function typeLabel(t: string | null): string {
  if (t === "makeup") return "Make-up";
  if (t === "evaluation") return "Evaluation";
  return "Scheduled";
}

// ── PIPELINE grid ─────────────────────────────────────────────────────────

export function buildPipelineRow(
  reg: RegistrationRow,
  snapshot: Snapshot,
  now: Date,
): (string | number)[] {
  const conf: ConfirmationRow | null = reg.roster_confirmation_id
    ? (snapshot.confirmations.find((c) => c.id === reg.roster_confirmation_id) ?? null)
    : null;
  const days = daysSinceET(reg.created_at, now);
  const flag =
    (reg.pipeline_status === "evaluated" || reg.pipeline_status === "offered") && days > 5
      ? FOLLOW_UP_FLAG
      : "";
  const recruiting = reg.source === "recruiting";
  const schoolNotes = [reg.school, reg.notes].filter(Boolean).join(" — ");
  return [
    reg.id,
    statusToSheet(reg.pipeline_status),
    reg.placed_team ?? "",
    reg.player_full_name,
    reg.graduation_year ?? "",
    reg.position ?? "",
    recruiting ? "Recruiting" : "Tryout",
    schoolNotes,
    fmtTryoutDate(reg),
    recruiting ? "—" : typeLabel(reg.tryout_type),
    conf?.parent1_name ?? reg.parent_name ?? "",
    conf?.parent1_email ?? reg.email ?? "",
    fmtPhone(conf?.parent1_phone ?? reg.phone),
    fmtPhone(conf?.player_phone ?? null),
    recruiting ? "—" : cap(reg.payment_status),
    fmtDateET(reg.created_at),
    days,
    flag,
  ];
}

export function buildPipelineGrid(snapshot: Snapshot, now: Date): (string | number)[][] {
  return [
    [...PIPELINE_HEADERS],
    ...snapshot.registrations.map((r) => buildPipelineRow(r, snapshot, now)),
  ];
}

// ── Team tab grids ────────────────────────────────────────────────────────

export type ContactStatus = "ok" | "stale" | "flagged" | "missing";

interface PlayerRenderContext {
  conf: ConfirmationRow | null;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  /** What's still owed to the contact file: the DASHBOARD debt counter. */
  needsEmail: boolean;
  needsPhone: boolean;
  contactStatus: ContactStatus;
  balanceCents: number;
  hasMoney: boolean;
}

/**
 * Contact resolution order (per girl): 1. guardians — the table the parent
 * portal reads; TRUTH. 2. roster_confirmations — family-typed, fresher.
 * 3. the legacy Sheet's single email / parked unverified phone — fallback
 * only, carrying its quality marker. 4. Nothing → missing.
 */
export function contextForPlayer(player: PlayerRow, snapshot: Snapshot): PlayerRenderContext {
  // Confirmation: pinned through her pipeline row wins; name+year match second.
  const viaReg = snapshot.registrations.find(
    (r) => r.player_id === player.id && r.roster_confirmation_id,
  );
  const conf = viaReg
    ? (snapshot.confirmations.find((c) => c.id === viaReg.roster_confirmation_id) ?? null)
    : findConfirmationForPlayer(player, snapshot.confirmations);

  // Guardians — truth first. Prefer the primary; for phone, any guardian
  // with a number beats none.
  const links = snapshot.playerGuardians.filter((pg) => pg.player_id === player.id);
  const primary = links.find((l) => l.is_primary) ?? (links.length > 0 ? links[0] : null);
  const guardian = primary ? (snapshot.guardians.get(primary.guardian_id) ?? null) : null;
  const anyGuardianPhone =
    guardian?.phone ??
    links.map((l) => snapshot.guardians.get(l.guardian_id)?.phone).find(Boolean) ??
    null;

  let parentEmail = guardian?.email ?? conf?.parent1_email ?? "";
  let contactStatus: ContactStatus = "ok";
  if (!parentEmail && player.fallback_email) {
    const status = (player.fallback_email_status ?? "ok") as ContactStatus;
    parentEmail =
      status === "ok" ? player.fallback_email : `${player.fallback_email} (${status})`;
    if (status !== "ok") contactStatus = status;
  }

  let parentPhone = fmtPhone(anyGuardianPhone ?? conf?.parent1_phone ?? null);
  if (!parentPhone && player.unverified_phone) {
    parentPhone = `${player.unverified_phone} (unverified)`;
  }

  const needsEmail = !parentEmail;
  const needsPhone = !anyGuardianPhone && !conf?.parent1_phone;
  if (needsEmail && needsPhone) contactStatus = "missing";

  const plans = snapshot.plans.filter((p) => p.player_id === player.id);
  const openCharges = snapshot.charges.filter(
    (c) => c.player_id === player.id && c.status === "open",
  );
  const balanceCents =
    plans.reduce((s, p) => s + Math.max(0, p.total_amount_cents - p.amount_paid_cents), 0) +
    openCharges.reduce((s, c) => s + c.amount_cents, 0);

  // 34 legacy guardians are literally named "Parent" — a blank cell reads
  // better than the word, and the /roster flow fills the real name.
  const rawGuardianName = guardian
    ? `${guardian.first_name} ${guardian.last_name}`.trim()
    : "";
  const guardianName = /^(parent|guardian)$/i.test(rawGuardianName) ? "" : rawGuardianName;

  return {
    conf,
    parentName: guardianName || conf?.parent1_name || "",
    parentEmail,
    parentPhone,
    needsEmail,
    needsPhone,
    contactStatus,
    balanceCents,
    hasMoney: plans.length > 0 || openCharges.length > 0,
  };
}

export function buildTeamRow(
  player: PlayerRow,
  snapshot: Snapshot,
  team: string,
): (string | number)[] {
  const ctx = contextForPlayer(player, snapshot);
  // A 2031 playing up on the 2030 team is exactly the girl Harrison must
  // never lose track of — the playing-up is visible, never flattened.
  const playsUp =
    player.graduation_year != null && String(player.graduation_year) !== team;
  const name = `${player.first_name} ${player.last_name}`.trim();
  return [
    player.id,
    playsUp ? `${name} · ${player.graduation_year}` : name,
    player.jersey_number ?? "",
    ctx.conf ? CONFIRMED_CHECK : "",
    player.position ?? "",
    ctx.parentName,
    ctx.parentEmail,
    ctx.parentPhone,
    ctx.conf?.emergency_contact_name ?? "",
    fmtPhone(ctx.conf?.emergency_contact_phone ?? null),
    player.shirt_size ?? ctx.conf?.jersey_size ?? "",
    player.short_size ?? ctx.conf?.shorts_size ?? "",
    player.sweatshirt_size ?? ctx.conf?.sweatshirt_size ?? "",
    player.shooting_shirt_size ?? ctx.conf?.shooting_shirt_size ?? "",
    ctx.hasMoney ? fmtMoney(ctx.balanceCents) : "—",
  ];
}

export function playersForTeam(team: string, snapshot: Snapshot): PlayerRow[] {
  return snapshot.players
    .filter((p) => p.placed_team === team)
    .sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name));
}

/** How a lacrosse coach reads a roster. Goalie is always last. */
export const POSITION_SECTIONS: Array<{ header: string; match: (pos: string | null) => boolean }> = [
  { header: "ATTACK", match: (p) => p === "Attack" },
  { header: "MIDDIE", match: (p) => p === "Midfield" },
  { header: "DEFENSE", match: (p) => p === "Defense" },
  { header: "POSITION TBD", match: (p) => p == null || p === "" || p === "Undecided" },
  { header: "GOALIE", match: (p) => p === "Goalie" },
];

export const SECTION_HEADER_LABELS = POSITION_SECTIONS.map((s) => s.header);

function jerseySortKey(jersey: string | null): number {
  const n = parseInt(jersey ?? "", 10);
  return Number.isNaN(n) ? 9999 : n;
}

export function buildTeamGrid(team: string, snapshot: Snapshot): (string | number)[][] {
  const players = playersForTeam(team, snapshot);
  if (players.length === 0) {
    return [[...TEAM_HEADERS], ["", "No players placed yet", "", "", "", "", "", "", "", "", "", "", "", "", ""]];
  }
  const grid: (string | number)[][] = [[...TEAM_HEADERS]];
  const claimed = new Set<string>();
  for (const section of POSITION_SECTIONS) {
    const girls = players
      .filter((p) => !claimed.has(p.id) && section.match(p.position))
      .sort(
        (a, b) =>
          jerseySortKey(a.jersey_number) - jerseySortKey(b.jersey_number) ||
          a.last_name.localeCompare(b.last_name),
      );
    if (girls.length === 0) continue;
    girls.forEach((g) => claimed.add(g.id));
    grid.push(["", section.header, "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    for (const g of girls) grid.push(buildTeamRow(g, snapshot, team));
  }
  return grid;
}

// ── DASHBOARD grid ────────────────────────────────────────────────────────

export function buildDashboardGrid(snapshot: Snapshot, now: Date): (string | number)[][] {
  const rows: (string | number)[][] = [];
  const blank = () => rows.push([""]);

  rows.push(["YOU. FIRST ELITE LACROSSE — ROSTER COMMAND"]);
  const lastFinished = snapshot.runs.find((r) => r.status === "ok");
  rows.push([
    lastFinished
      ? `Last sync: ${fmtTimestampET(lastFinished.finished_at ?? lastFinished.started_at)} ET (${lastFinished.trigger})`
      : "Last sync: syncing now — first run",
  ]);
  blank();

  // Pipeline funnel
  rows.push(["PIPELINE FUNNEL"]);
  const funnel: Array<[string, string]> = [
    ["New", "new"],
    ["Contacted", "contacted"],
    ["Evaluated", "evaluated"],
    ["Offered", "offered"],
    ["Placed", "placed"],
    ["Passed", "passed"],
  ];
  for (const [label, key] of funnel) {
    rows.push([label, snapshot.registrations.filter((r) => r.pipeline_status === key).length]);
  }
  blank();

  // Registrations by grad year (recruits without a year get their own line)
  rows.push(["REGISTRATIONS BY GRAD YEAR"]);
  const byYear = new Map<string, number>();
  for (const r of snapshot.registrations) {
    const key = r.graduation_year != null ? String(r.graduation_year) : "Unknown (recruits)";
    byYear.set(key, (byYear.get(key) ?? 0) + 1);
  }
  for (const year of [...byYear.keys()].sort()) {
    rows.push([year, byYear.get(year) ?? 0]);
  }
  blank();

  // Recruiting pipeline — the chase list, surfaced where it can be worked.
  const recruits = snapshot.registrations.filter((r) => r.source === "recruiting");
  if (recruits.length > 0) {
    const open = recruits.filter((r) => r.pipeline_status !== "placed" && r.pipeline_status !== "passed");
    rows.push(["RECRUITING", `${open.length} open of ${recruits.length}`]);
    blank();
  }

  // Teams: placed / confirmed / outstanding balance
  rows.push(["TEAMS", "Rostered", "Confirmed", "Balance Due"]);
  for (const team of TEAM_TABS) {
    const players = playersForTeam(team, snapshot);
    let confirmed = 0;
    let balance = 0;
    for (const p of players) {
      const ctx = contextForPlayer(p, snapshot);
      if (ctx.conf) confirmed++;
      balance += ctx.balanceCents;
    }
    rows.push([team, players.length, confirmed, balance > 0 ? fmtMoney(balance) : "—"]);
  }
  blank();

  // Money
  rows.push(["MONEY"]);
  rows.push(["Collected (all completed payments)", fmtMoney(snapshot.paymentsCollectedCents)]);
  const outstanding =
    snapshot.plans.reduce((s, p) => s + Math.max(0, p.total_amount_cents - p.amount_paid_cents), 0) +
    snapshot.charges.filter((c) => c.status === "open").reduce((s, c) => s + c.amount_cents, 0);
  rows.push(["Outstanding (plans + open charges)", fmtMoney(outstanding)]);
  const paidTryouts = snapshot.registrations.filter((r) => r.payment_status === "paid").length;
  rows.push(["Past $50 tryout fees", fmtMoney(paidTryouts * 5000)]);
  blank();

  // Upcoming tryout dates with headcount
  rows.push(["TRYOUT DATES", "Headcount"]);
  const todayKey = now.toLocaleDateString("en-CA", { timeZone: ET });
  const byDate = new Map<string, { label: string; count: number; past: boolean }>();
  for (const r of snapshot.registrations) {
    const key = r.tryout_date ?? "flexible";
    const label = r.tryout_date ? fmtIsoDay(r.tryout_date) : "Evaluations — flexible mornings";
    const entry = byDate.get(key) ?? {
      label,
      count: 0,
      past: r.tryout_date != null && r.tryout_date < todayKey,
    };
    entry.count++;
    byDate.set(key, entry);
  }
  for (const key of [...byDate.keys()].sort()) {
    const e = byDate.get(key)!;
    rows.push([e.past ? `${e.label} (past)` : e.label, e.count]);
  }
  blank();

  // Contacts Needed — the club's actual operational debt. Watch it fall to
  // zero: every girl here should be sent the confirmation link, and the
  // system fills its own gaps from what the family types.
  const contactDebt: string[] = [];
  for (const team of TEAM_TABS) {
    for (const p of playersForTeam(team, snapshot)) {
      const ctx = contextForPlayer(p, snapshot);
      const needs: string[] = [];
      if (ctx.needsPhone) needs.push("phone");
      if (ctx.needsEmail) needs.push("email");
      if (ctx.contactStatus === "stale") needs.push("email is stale");
      if (ctx.contactStatus === "flagged") needs.push("email flagged");
      if (needs.length > 0) {
        contactDebt.push(`${p.first_name} ${p.last_name} (${team}) — needs ${needs.join(" + ")}`);
      }
    }
  }
  rows.push(["CONTACTS NEEDED", contactDebt.length]);
  if (contactDebt.length === 0) {
    rows.push(["Zero. Every rostered girl has a working email and phone."]);
  } else {
    rows.push(["Fix: send each family the confirmation link — https://www.youfirstlacrosse.com/roster"]);
    for (const line of contactDebt) rows.push([line]);
  }
  blank();

  // Needs attention: confirmations that match nothing, placements that stalled
  const attention: string[] = [];
  for (const c of snapshot.confirmations) {
    const pinned = snapshot.registrations.some((r) => r.roster_confirmation_id === c.id);
    const matchesPlayer = snapshot.players.some(
      (p) =>
        normName(`${p.first_name} ${p.last_name}`) ===
        normName(`${c.player_first_name} ${c.player_last_name}`),
    );
    if (!pinned && !matchesPlayer) {
      attention.push(
        `Unmatched confirmation: ${c.player_first_name} ${c.player_last_name} (${c.player_grad_year}) — family confirmed but no registration/roster match. Don't lose them.`,
      );
    }
  }
  for (const r of snapshot.registrations) {
    if (r.placed_team && !r.player_id) {
      attention.push(
        `Placement stalled: ${r.player_full_name} (${r.graduation_year}) → ${r.placed_team} — see _SYNC for why.`,
      );
    }
  }
  rows.push(["NEEDS ATTENTION"]);
  if (attention.length === 0) {
    rows.push(["Nothing — every confirmation is matched and every placement landed."]);
  } else {
    for (const line of attention) rows.push([line]);
  }

  return rows;
}

// ── _SYNC grid ────────────────────────────────────────────────────────────

export function buildSyncGrid(runs: SyncRunRow[]): (string | number)[][] {
  const rows: (string | number)[][] = [[...SYNC_HEADERS]];
  for (const run of runs.slice(0, 50)) {
    rows.push([
      fmtTimestampET(run.started_at),
      run.kind,
      run.trigger,
      run.status,
      run.duration_ms != null ? `${(run.duration_ms / 1000).toFixed(1)}s` : "",
      run.rows_read ?? "",
      run.rows_written ?? "",
      run.rows_changed ?? "",
      run.error ? `ERROR: ${run.error}` : run.log.join(" · ") || "—",
    ]);
  }
  return rows;
}

// ── Formatting ────────────────────────────────────────────────────────────

const NEAR_BLACK = { red: 0.043, green: 0.055, blue: 0.071 };
const CAROLINA = { red: 0.294, green: 0.612, blue: 0.827 };
const WHITE = { red: 1, green: 1, blue: 1 };
const GRAY_FILL = { red: 0.957, green: 0.961, blue: 0.969 };
const QUIET_TEXT = { red: 0.596, green: 0.631, blue: 0.671 };
const CORAL_TEXT = { red: 0.894, green: 0.341, blue: 0.239 };
const CORAL_BG = { red: 0.992, green: 0.914, blue: 0.894 };
const GREEN_TEXT = { red: 0.09, green: 0.447, blue: 0.271 };
const GREEN_BG = { red: 0.91, green: 0.961, blue: 0.933 };
const WARN_BG = { red: 0.988, green: 0.945, blue: 0.925 };
const RECRUIT_WASH = { red: 0.937, green: 0.965, blue: 0.984 };

const FONT = "Inter";
const MAX_ROWS = 1000;

interface TabIds {
  [title: string]: number;
}

function headerRequests(sheetId: number, columnCount: number): object[] {
  return [
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: columnCount },
        cell: {
          userEnteredFormat: {
            backgroundColor: NEAR_BLACK,
            textFormat: { foregroundColor: WHITE, bold: true, fontFamily: FONT, fontSize: 9 },
            verticalAlignment: "MIDDLE",
            padding: { top: 6, bottom: 6, left: 6, right: 6 },
          },
        },
        fields:
          "userEnteredFormat(backgroundColor,textFormat,verticalAlignment,padding)",
      },
    },
  ];
}

function bodyFontRequest(sheetId: number, columnCount: number): object {
  return {
    repeatCell: {
      range: { sheetId, startRowIndex: 1, endRowIndex: MAX_ROWS, startColumnIndex: 0, endColumnIndex: columnCount },
      cell: { userEnteredFormat: { textFormat: { fontFamily: FONT, fontSize: 10 } } },
      fields: "userEnteredFormat.textFormat(fontFamily,fontSize)",
    },
  };
}

/** Gray columns get the fill; white columns get true white + a Carolina left edge. */
function columnShadingRequests(
  sheetId: number,
  columnCount: number,
  whiteColumns: number[],
): object[] {
  const requests: object[] = [
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: MAX_ROWS, startColumnIndex: 0, endColumnIndex: columnCount },
        cell: { userEnteredFormat: { backgroundColor: GRAY_FILL } },
        fields: "userEnteredFormat.backgroundColor",
      },
    },
  ];
  for (const col of whiteColumns) {
    requests.push(
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 1, endRowIndex: MAX_ROWS, startColumnIndex: col, endColumnIndex: col + 1 },
          cell: { userEnteredFormat: { backgroundColor: WHITE } },
          fields: "userEnteredFormat.backgroundColor",
        },
      },
      {
        updateBorders: {
          range: { sheetId, startRowIndex: 0, endRowIndex: MAX_ROWS, startColumnIndex: col, endColumnIndex: col + 1 },
          left: { style: "SOLID_MEDIUM", color: CAROLINA },
        },
      },
    );
  }
  return requests;
}

function freezeRequest(sheetId: number, frozenColumns: number): object {
  return {
    updateSheetProperties: {
      properties: {
        sheetId,
        gridProperties: { frozenRowCount: 1, frozenColumnCount: frozenColumns },
      },
      fields: "gridProperties(frozenRowCount,frozenColumnCount)",
    },
  };
}

function tabColorRequest(sheetId: number, color: object, index: number): object {
  return {
    updateSheetProperties: {
      properties: { sheetId, tabColorStyle: { rgbColor: color }, index },
      fields: "tabColorStyle,index",
    },
  };
}

function widthRequests(sheetId: number, widths: number[]): object[] {
  return widths.map((pixelSize, i) => ({
    updateDimensionProperties: {
      range: { sheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 },
      properties: { pixelSize },
      fields: "pixelSize",
    },
  }));
}

function dropdownRequest(sheetId: number, col: number, values: string[]): object {
  return {
    setDataValidation: {
      range: { sheetId, startRowIndex: 1, endRowIndex: MAX_ROWS, startColumnIndex: col, endColumnIndex: col + 1 },
      rule: {
        condition: { type: "ONE_OF_LIST", values: values.map((v) => ({ userEnteredValue: v })) },
        strict: true,
        showCustomUi: true,
      },
    },
  };
}

function conditionalRule(sheetId: number, range: object, formula: string, format: object): object {
  return {
    addConditionalFormatRule: {
      rule: {
        ranges: [range],
        booleanRule: {
          condition: { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: formula }] },
          format,
        },
      },
      index: 0,
    },
  };
}

/**
 * The full formatting pass for every tab. Conditional rules are deleted and
 * re-added so repeat runs don't stack duplicates (idempotent).
 */
export function buildFormattingRequests(tabs: SheetTabInfo[], tabIds: TabIds): object[] {
  const requests: object[] = [];

  // Spreadsheet-level: the file thinks in Eastern time.
  requests.push({
    updateSpreadsheetProperties: {
      properties: { timeZone: "America/New_York" },
      fields: "timeZone",
    },
  });

  // Drop stale conditional rules everywhere we manage.
  for (const tab of tabs) {
    if (!ALL_TABS.includes(tab.title)) continue;
    for (let i = tab.conditionalFormatCount - 1; i >= 0; i--) {
      requests.push({ deleteConditionalFormatRule: { sheetId: tab.sheetId, index: i } });
    }
  }

  // Hide the default empty tab if it's still around.
  const sheet1 = tabs.find((t) => t.title === "Sheet1");
  if (sheet1) {
    requests.push({
      updateSheetProperties: {
        properties: { sheetId: sheet1.sheetId, hidden: true },
        fields: "hidden",
      },
    });
  }

  // ── PIPELINE ──
  const pipelineId = tabIds[TAB_PIPELINE];
  if (pipelineId != null) {
    const cols = PIPELINE_HEADERS.length;
    requests.push(...headerRequests(pipelineId, cols));
    requests.push(bodyFontRequest(pipelineId, cols));
    requests.push(...columnShadingRequests(pipelineId, cols, [1, 2])); // B, C white
    requests.push(freezeRequest(pipelineId, 4)); // id · Status · Place · Player
    requests.push(tabColorRequest(pipelineId, CAROLINA, 0));
    requests.push(
      ...widthRequests(pipelineId, [64, 118, 118, 170, 74, 92, 92, 170, 150, 96, 150, 210, 128, 128, 88, 100, 74, 84]),
    );
    requests.push(dropdownRequest(pipelineId, 1, ["New", "Contacted", "Evaluated", "Offered", "Placed", "Passed"]));
    requests.push(dropdownRequest(pipelineId, 2, [...TEAM_TABS]));

    const fullRow = { sheetId: pipelineId, startRowIndex: 1, endRowIndex: MAX_ROWS, startColumnIndex: 0, endColumnIndex: cols };
    // Follow-Up flag (col R) — the whole reason PIPELINE exists.
    requests.push(
      conditionalRule(
        pipelineId,
        { sheetId: pipelineId, startRowIndex: 1, endRowIndex: MAX_ROWS, startColumnIndex: cols - 1, endColumnIndex: cols },
        `=$R2="${FOLLOW_UP_FLAG}"`,
        { backgroundColor: CORAL_BG, textFormat: { foregroundColor: CORAL_TEXT, bold: true } },
      ),
    );
    // Placed rows go quiet.
    requests.push(
      conditionalRule(pipelineId, fullRow, '=$B2="Placed"', {
        textFormat: { foregroundColor: QUIET_TEXT },
      }),
    );
    // Unpaid ($50-era stragglers) get a soft warning tint (Payment = col O).
    requests.push(
      conditionalRule(pipelineId, fullRow, '=$O2="Pending"', { backgroundColor: WARN_BG }),
    );
    // Recruiting rows read differently — subtle Carolina wash, not loud.
    requests.push(
      conditionalRule(pipelineId, fullRow, '=$G2="Recruiting"', {
        backgroundColor: RECRUIT_WASH,
      }),
    );
  }

  // ── Team tabs ──
  TEAM_TABS.forEach((team, i) => {
    const sheetId = tabIds[team];
    if (sheetId == null) return;
    const cols = TEAM_HEADERS.length;
    requests.push(...headerRequests(sheetId, cols));
    requests.push(bodyFontRequest(sheetId, cols));
    requests.push(...columnShadingRequests(sheetId, cols, [2])); // C = Jersey #
    requests.push(freezeRequest(sheetId, 2)); // id · Player
    requests.push(tabColorRequest(sheetId, NEAR_BLACK, i + 1));
    requests.push(
      ...widthRequests(sheetId, [64, 180, 84, 90, 92, 160, 220, 128, 160, 128, 64, 64, 88, 76, 96]),
    );
    requests.push(
      conditionalRule(
        sheetId,
        { sheetId, startRowIndex: 1, endRowIndex: MAX_ROWS, startColumnIndex: 3, endColumnIndex: 4 },
        `=$D2="${CONFIRMED_CHECK}"`,
        { backgroundColor: GREEN_BG, textFormat: { foregroundColor: GREEN_TEXT, bold: true } },
      ),
    );
    // Position section headers — how a coach reads a roster. The rule keys on
    // the header labels so it survives every re-render and roster change.
    const headerList = SECTION_HEADER_LABELS.map((l) => `$B2="${l}"`).join(",");
    requests.push(
      conditionalRule(
        sheetId,
        { sheetId, startRowIndex: 1, endRowIndex: MAX_ROWS, startColumnIndex: 0, endColumnIndex: cols },
        `=AND($A2="",OR(${headerList}))`,
        {
          backgroundColor: CAROLINA,
          textFormat: { foregroundColor: WHITE, bold: true },
        },
      ),
    );
  });

  // ── DASHBOARD ──
  const dashId = tabIds[TAB_DASHBOARD];
  if (dashId != null) {
    requests.push(tabColorRequest(dashId, CAROLINA, TEAM_TABS.length + 1));
    requests.push(bodyFontRequest(dashId, 6));
    requests.push(...widthRequests(dashId, [420, 110, 110, 110]));
    // Title row.
    requests.push({
      repeatCell: {
        range: { sheetId: dashId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 6 },
        cell: {
          userEnteredFormat: {
            backgroundColor: NEAR_BLACK,
            textFormat: { foregroundColor: WHITE, bold: true, fontFamily: FONT, fontSize: 12 },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    });
    // The last-sync stamp — loud and legible.
    requests.push({
      repeatCell: {
        range: { sheetId: dashId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 6 },
        cell: {
          userEnteredFormat: {
            textFormat: { foregroundColor: CAROLINA, bold: true, fontFamily: FONT, fontSize: 11 },
          },
        },
        fields: "userEnteredFormat.textFormat",
      },
    });
  }

  // ── _SYNC ──
  const syncId = tabIds[TAB_SYNC];
  if (syncId != null) {
    const cols = SYNC_HEADERS.length;
    requests.push(...headerRequests(syncId, cols));
    requests.push(bodyFontRequest(syncId, cols));
    requests.push(freezeRequest(syncId, 0));
    requests.push(tabColorRequest(syncId, QUIET_TEXT, TEAM_TABS.length + 2));
    requests.push(...widthRequests(syncId, [120, 70, 100, 70, 76, 60, 70, 76, 640]));
    requests.push(
      conditionalRule(
        syncId,
        { sheetId: syncId, startRowIndex: 1, endRowIndex: MAX_ROWS, startColumnIndex: 0, endColumnIndex: cols },
        '=$D2="error"',
        { backgroundColor: CORAL_BG, textFormat: { foregroundColor: CORAL_TEXT } },
      ),
    );
  }

  return requests;
}
