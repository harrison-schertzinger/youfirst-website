/**
 * Roster Command Sheet — the sync engine.
 *
 * Order of operations, every FULL run:
 *   1. Read the white columns (PIPELINE Status / Place On Team, team-tab
 *      Jersey #), keyed by the id in column A — never by row position.
 *   2. Write changed values back to Supabase (promotions happen here).
 *   3. Re-read Supabase fresh.
 *   4. Regenerate every tab — one values batchUpdate for all grids.
 *   5. Stamp DASHBOARD + _SYNC, re-apply formatting.
 *
 * RENDER runs (real-time pings from registration/confirmation/webhook) only
 * regenerate gray cells and append new rows — they never read or overwrite a
 * white cell, so Harrison's un-synced edits survive.
 *
 * FAIL SOFT, ALWAYS: missing creds, Google errors, rate limits — everything
 * returns an English result and logs to sheet_sync_runs; nothing throws to
 * the money path.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchSnapshot,
  promoteRegistration,
  serviceClient,
  statusToDb,
  statusToSheet,
  TEAM_TABS,
  unlinkRegistration,
  type RegistrationRow,
  type SyncRunRow,
} from "@/lib/command-sheet/data";
import {
  ALL_TABS,
  buildDashboardGrid,
  buildFormattingRequests,
  buildPipelineGrid,
  buildPipelineRow,
  buildSyncGrid,
  buildTeamGrid,
  buildTeamRow,
  playersForTeam,
  TAB_DASHBOARD,
  TAB_PIPELINE,
  TAB_SYNC,
} from "@/lib/command-sheet/render";
import { SheetsClient } from "@/lib/command-sheet/sheets-api";

export type SyncTrigger =
  | "cron"
  | "manual"
  | "registration"
  | "confirmation"
  | "webhook"
  | "test";

export interface SyncResult {
  ok: boolean;
  /** Plain-English outcome — shown verbatim on the admin page. */
  message: string;
  changes: number;
}

const LOCK_WINDOW_MS = 3 * 60 * 1000;

// ── Run bookkeeping (renders as the _SYNC tab) ────────────────────────────

async function startRun(
  db: SupabaseClient,
  kind: "full" | "render",
  trigger: SyncTrigger,
): Promise<{ runId: string | null; blocked: boolean }> {
  if (kind === "full") {
    const cutoff = new Date(Date.now() - LOCK_WINDOW_MS).toISOString();
    const { data: running } = await db
      .from("sheet_sync_runs")
      .select("id")
      .eq("status", "running")
      .eq("kind", "full")
      .gte("started_at", cutoff)
      .limit(1);
    if (running && running.length > 0) return { runId: null, blocked: true };
  }
  const { data } = await db
    .from("sheet_sync_runs")
    .insert({ kind, trigger, status: "running" })
    .select("id")
    .single();
  return { runId: (data?.id as string) ?? null, blocked: false };
}

async function finishRun(
  db: SupabaseClient,
  runId: string | null,
  patch: {
    status: "ok" | "skipped" | "error";
    startedMs: number;
    rowsRead?: number;
    rowsWritten?: number;
    rowsChanged?: number;
    log?: string[];
    error?: string;
  },
): Promise<void> {
  if (!runId) return;
  await db
    .from("sheet_sync_runs")
    .update({
      status: patch.status,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - patch.startedMs,
      rows_read: patch.rowsRead ?? null,
      rows_written: patch.rowsWritten ?? null,
      rows_changed: patch.rowsChanged ?? null,
      log: patch.log ?? [],
      error: patch.error ?? null,
    })
    .eq("id", runId);
}

// ── Shared helpers ────────────────────────────────────────────────────────

const NO_CREDS_MESSAGE =
  "The Sheet isn't connected yet — GOOGLE_SERVICE_ACCOUNT_JSON / ROSTER_COMMAND_SHEET_ID are missing. Registrations are safe in the database; add the credentials (see docs/roster-command-sheet-setup.md) and sync again.";

async function ensureTabs(sheets: SheetsClient) {
  let tabs = await sheets.getTabs();
  const missing = ALL_TABS.filter((t) => !tabs.some((x) => x.title === t));
  if (missing.length > 0) {
    await sheets.batchUpdateSpreadsheet(
      missing.map((title) => ({
        addSheet: {
          properties: { title, gridProperties: { rowCount: 1000, columnCount: 26 } },
        },
      })),
    );
    tabs = await sheets.getTabs();
  }
  const tabIds: Record<string, number> = {};
  for (const t of tabs) tabIds[t.title] = t.sheetId;
  return { tabs, tabIds };
}

function colLetter(index: number): string {
  // 0 → A … 25 → Z (our widest tab is P; single letters are plenty)
  return String.fromCharCode(65 + index);
}

/** Grid → one contiguous write at TAB!A1. */
function gridData(tab: string, grid: (string | number)[][]) {
  return { range: `${tab}!A1`, values: grid };
}

/** The current run as a _SYNC line (it isn't finished in the DB yet). */
function currentRunRow(
  kind: string,
  trigger: string,
  startedMs: number,
  rowsRead: number,
  rowsWritten: number,
  rowsChanged: number,
  log: string[],
): SyncRunRow {
  return {
    id: "current",
    kind,
    trigger,
    status: "ok",
    started_at: new Date(startedMs).toISOString(),
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - startedMs,
    rows_read: rowsRead,
    rows_written: rowsWritten,
    rows_changed: rowsChanged,
    log,
    error: null,
  };
}

// ── FULL SYNC ─────────────────────────────────────────────────────────────

export async function runFullSync(trigger: SyncTrigger): Promise<SyncResult> {
  const startedMs = Date.now();
  const db = serviceClient();
  if (!db) {
    return { ok: false, message: "Server is missing its database keys — nothing was synced.", changes: 0 };
  }

  const { runId, blocked } = await startRun(db, "full", trigger);
  if (blocked) {
    return {
      ok: true,
      message: "Another sync is already running — this one stepped aside. Try again in a minute.",
      changes: 0,
    };
  }

  const log: string[] = [];
  try {
    const sheets = await SheetsClient.connect();
    if (!sheets) {
      await finishRun(db, runId, { status: "skipped", startedMs, log: [NO_CREDS_MESSAGE] });
      return { ok: false, message: NO_CREDS_MESSAGE, changes: 0 };
    }

    const { tabs, tabIds } = await ensureTabs(sheets);

    // ── 1. Read the white columns, keyed by column-A id ───────────────
    const whiteRanges = [
      `${TAB_PIPELINE}!A2:C`,
      ...TEAM_TABS.map((t) => `${t}!A2:C`),
    ];
    const white = await sheets.batchGetValues(whiteRanges);

    const snapshot = await fetchSnapshot(db);
    const regById = new Map<string, RegistrationRow>();
    for (const r of snapshot.registrations) regById.set(r.id, r);

    let changes = 0;
    let rowsRead = 0;

    // ── 2a. PIPELINE Status + Place On Team → Supabase ────────────────
    for (const row of white[`${TAB_PIPELINE}!A2:C`] ?? []) {
      const [id, statusCell, placeCell] = [row[0] ?? "", row[1] ?? "", row[2] ?? ""];
      if (!id) continue;
      rowsRead++;
      const reg = regById.get(id);
      if (!reg) {
        log.push(`Sheet row ${id.slice(0, 8)}… no longer exists in the database — it will drop off this render.`);
        continue;
      }

      const placeValue = placeCell.trim();
      const placeValid = placeValue === "" || (TEAM_TABS as readonly string[]).includes(placeValue);
      if (!placeValid) {
        log.push(`Ignored Place On Team "${placeValue}" for ${reg.player_full_name} — not a team.`);
      }

      // Placement transitions first — they own pipeline_status when they fire.
      let promotedThisRow = false;
      if (placeValid) {
        if (placeValue && !reg.placed_team) {
          const result = await promoteRegistration(db, reg, placeValue, snapshot);
          log.push(result.line);
          if (result.ok) {
            changes++;
            promotedThisRow = true;
          }
        } else if (placeValue && reg.placed_team && placeValue !== reg.placed_team) {
          await db
            .from("tryout_registrations")
            .update({ placed_team: placeValue })
            .eq("id", reg.id);
          if (reg.player_id) {
            await db.from("players").update({ roster_team: placeValue }).eq("id", reg.player_id);
          }
          log.push(`Moved ${reg.player_full_name} (${reg.graduation_year}) from ${reg.placed_team} to ${placeValue}.`);
          changes++;
        } else if (!placeValue && reg.placed_team) {
          log.push(await unlinkRegistration(db, reg));
          changes++;
          promotedThisRow = true; // status now owned by the unlink (→ Offered)
        }
      }

      // Status — Harrison's CRM column.
      if (!promotedThisRow) {
        const dbStatus = statusToDb(statusCell);
        if (statusCell.trim() && dbStatus === null) {
          log.push(`Ignored Status "${statusCell}" for ${reg.player_full_name} — not a valid stage.`);
        } else if (dbStatus && dbStatus !== reg.pipeline_status) {
          await db
            .from("tryout_registrations")
            .update({ pipeline_status: dbStatus })
            .eq("id", reg.id);
          log.push(`${reg.player_full_name}: ${statusToSheet(reg.pipeline_status)} → ${statusToSheet(dbStatus)}.`);
          changes++;
        }
      }
    }

    // ── 2b. Team-tab Jersey # → players ───────────────────────────────
    const playerById = new Map(snapshot.players.map((p) => [p.id, p]));
    for (const team of TEAM_TABS) {
      for (const row of white[`${team}!A2:C`] ?? []) {
        const [id, , jerseyCell] = [row[0] ?? "", row[1] ?? "", row[2] ?? ""];
        if (!id) continue;
        rowsRead++;
        const player = playerById.get(id);
        if (!player) continue;
        const jersey = jerseyCell.trim();
        if (jersey !== (player.jersey_number ?? "")) {
          await db
            .from("players")
            .update({ jersey_number: jersey || null })
            .eq("id", player.id);
          await db
            .from("tryout_registrations")
            .update({ jersey_number: jersey || null })
            .eq("player_id", player.id);
          log.push(
            `${player.first_name} ${player.last_name} (${team}): jersey ${player.jersey_number ?? "—"} → ${jersey || "—"}.`,
          );
          changes++;
        }
      }
    }

    // ── 3. Re-read Supabase fresh ──────────────────────────────────────
    const fresh = await fetchSnapshot(db);
    const now = new Date();

    // ── 4. Regenerate every tab — one batchUpdate for all grids ───────
    const grids: Array<{ tab: string; grid: (string | number)[][] }> = [
      { tab: TAB_PIPELINE, grid: buildPipelineGrid(fresh, now) },
      ...TEAM_TABS.map((team) => ({ tab: team, grid: buildTeamGrid(team, fresh) })),
    ];
    const rowsWritten = grids.reduce((s, g) => s + g.grid.length - 1, 0);

    const runRow = currentRunRow("full", trigger, startedMs, rowsRead, rowsWritten, changes, log);
    grids.push({ tab: TAB_DASHBOARD, grid: buildDashboardGrid(fresh, now) });
    grids.push({ tab: TAB_SYNC, grid: buildSyncGrid([runRow, ...fresh.runs.filter((r) => r.id !== runId)]) });

    await sheets.batchUpdateValues(grids.map((g) => gridData(g.tab, g.grid)));

    // Trim stale rows below each grid (values only; formatting stays).
    await sheets.batchClearValues(
      grids.map((g) => {
        const lastCol = colLetter(Math.max(...g.grid.map((r) => r.length), 1) - 1);
        return `${g.tab}!A${g.grid.length + 1}:${lastCol}1000`;
      }),
    );

    // ── 5. Formatting — brand, shading, dropdowns, flags ───────────────
    await sheets.batchUpdateSpreadsheet(buildFormattingRequests(tabs, tabIds));

    await finishRun(db, runId, {
      status: "ok",
      startedMs,
      rowsRead,
      rowsWritten,
      rowsChanged: changes,
      log,
    });

    const seconds = ((Date.now() - startedMs) / 1000).toFixed(1);
    const highlights = log.slice(0, 4).join(" · ");
    return {
      ok: true,
      message:
        `Synced in ${seconds}s — ${fresh.registrations.length} pipeline rows, ` +
        `${TEAM_TABS.reduce((s, t) => s + playersForTeam(t, fresh).length, 0)} rostered players, ` +
        `${changes} change${changes === 1 ? "" : "s"} written back.` +
        (highlights ? ` ${highlights}` : ""),
      changes,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Command sheet full sync failed:", err);
    await finishRun(db, runId, { status: "error", startedMs, log, error: message });
    return {
      ok: false,
      message: `The sync hit an error and stopped safely: ${message}. Registrations and payments are unaffected — check _SYNC and try again.`,
      changes: 0,
    };
  }
}

// ── RENDER SYNC (real-time, gray-cells-only) ─────────────────────────────

export async function runRenderSync(trigger: SyncTrigger): Promise<SyncResult> {
  const startedMs = Date.now();
  const db = serviceClient();
  if (!db) return { ok: false, message: "Missing database keys.", changes: 0 };

  const { runId } = await startRun(db, "render", trigger);
  const log: string[] = [];

  try {
    const sheets = await SheetsClient.connect();
    if (!sheets) {
      await finishRun(db, runId, { status: "skipped", startedMs, log: [NO_CREDS_MESSAGE] });
      return { ok: false, message: NO_CREDS_MESSAGE, changes: 0 };
    }

    await ensureTabs(sheets);
    const snapshot = await fetchSnapshot(db);
    const now = new Date();

    // Where is every row right now? (column A ids per tab)
    const idRanges = [`${TAB_PIPELINE}!A2:A`, ...TEAM_TABS.map((t) => `${t}!A2:A`)];
    const idCols = await sheets.batchGetValues(idRanges);

    const writes: Array<{ range: string; values: (string | number)[][] }> = [];
    let rowsWritten = 0;

    // PIPELINE: gray D..P for known rows, full append for new ones.
    {
      const sheetIds = (idCols[`${TAB_PIPELINE}!A2:A`] ?? []).map((r) => r[0] ?? "");
      const rowOf = new Map<string, number>(); // sheet row number (1-based)
      sheetIds.forEach((id, i) => id && rowOf.set(id, i + 2));
      let nextRow = sheetIds.length + 2;
      for (const reg of snapshot.registrations) {
        const full = buildPipelineRow(reg, snapshot, now);
        const at = rowOf.get(reg.id);
        if (at) {
          writes.push({ range: `${TAB_PIPELINE}!D${at}:P${at}`, values: [full.slice(3)] });
        } else {
          writes.push({ range: `${TAB_PIPELINE}!A${nextRow}:P${nextRow}`, values: [full] });
          log.push(`New registration on the board: ${reg.player_full_name} (${reg.graduation_year}).`);
          nextRow++;
        }
        rowsWritten++;
      }
    }

    // Team tabs: B + D..O for known rows (C = Jersey stays Harrison's).
    for (const team of TEAM_TABS) {
      const sheetIds = (idCols[`${team}!A2:A`] ?? []).map((r) => r[0] ?? "");
      const rowOf = new Map<string, number>();
      sheetIds.forEach((id, i) => id && rowOf.set(id, i + 2));
      let nextRow = sheetIds.length + 2;
      for (const player of playersForTeam(team, snapshot)) {
        const full = buildTeamRow(player, snapshot);
        const at = rowOf.get(player.id);
        if (at) {
          writes.push({ range: `${team}!B${at}:B${at}`, values: [[full[1]]] });
          writes.push({ range: `${team}!D${at}:O${at}`, values: [full.slice(3)] });
        } else {
          writes.push({ range: `${team}!A${nextRow}:O${nextRow}`, values: [full] });
          nextRow++;
        }
        rowsWritten++;
      }
    }

    const runRow = currentRunRow("render", trigger, startedMs, 0, rowsWritten, 0, log);
    writes.push(gridData(TAB_DASHBOARD, buildDashboardGrid(snapshot, now)));
    writes.push(gridData(TAB_SYNC, buildSyncGrid([runRow, ...snapshot.runs.filter((r) => r.id !== runId)])));

    await sheets.batchUpdateValues(writes);

    await finishRun(db, runId, {
      status: "ok",
      startedMs,
      rowsRead: 0,
      rowsWritten,
      rowsChanged: 0,
      log,
    });
    return { ok: true, message: `Mirrored ${rowsWritten} rows.`, changes: 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Command sheet render sync failed:", err);
    await finishRun(db, runId, { status: "error", startedMs, log, error: message });
    return { ok: false, message, changes: 0 };
  }
}

// ── Real-time ping — NEVER throws, NEVER blocks the money path long ──────

export async function pingCommandSheet(trigger: SyncTrigger): Promise<void> {
  try {
    await Promise.race([
      runRenderSync(trigger),
      new Promise<void>((resolve) => setTimeout(resolve, 8000)),
    ]);
  } catch (err) {
    console.error("Command sheet ping failed (non-fatal):", err);
  }
}
