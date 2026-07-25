/**
 * Field-sheet results — parsing and the import plan.
 *
 * The field sheet exports a JSON file; the Import page previews EXACTLY what
 * will change and then commits it. Everything that decides what changes lives
 * here as pure functions so the route stays thin and the logic is testable
 * without auth or a database.
 *
 * Idempotency contract: running the same export twice must change nothing on
 * the second run. Walk-up creation dedupes on field_sheet_uid (a client uid
 * minted on the sheet); check-ins only ever SET checked_in_at (an import never
 * un-checks a row); notes merge by containment so re-imports are no-ops.
 */

// ── export payload ───────────────────────────────────────────────────────────

export interface RegistrantResult {
  id: string;
  name: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  note: string | null;
}

export interface WalkUpResult {
  uid: string;
  name: string;
  gradYear: number | null;
  position: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
  checkedIn: boolean;
  checkedInAt: string | null;
  note: string | null;
  addedAt: string | null;
}

export interface FieldResults {
  kind: "yf-tryout-field-results";
  version: 1;
  sheetGeneratedAt: string;
  exportedAt: string;
  registrants: RegistrantResult[];
  walkUps: WalkUpResult[];
}

const GRAD_YEAR_DB_MIN = 2027; // tryout_registrations CHECK constraint bounds
const GRAD_YEAR_DB_MAX = 2038;

function asStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function asIso(v: unknown): string | null {
  const s = asStr(v);
  if (!s) return null;
  return Number.isNaN(Date.parse(s)) ? null : s;
}

/** Strict shape validation of a pasted/uploaded export. Never throws. */
export function parseFieldResults(
  raw: unknown,
): { ok: true; results: FieldResults } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Not a field-sheet export (expected a JSON object)." };
  }
  const o = raw as Record<string, unknown>;
  if (o.kind !== "yf-tryout-field-results") {
    return { ok: false, error: "Not a field-sheet export — this file has the wrong kind marker." };
  }
  if (o.version !== 1) {
    return { ok: false, error: `Unsupported export version ${String(o.version)} (expected 1).` };
  }
  const sheetGeneratedAt = asIso(o.sheetGeneratedAt);
  const exportedAt = asIso(o.exportedAt);
  if (!sheetGeneratedAt || !exportedAt) {
    return { ok: false, error: "Export is missing its timestamps." };
  }
  if (!Array.isArray(o.registrants) || !Array.isArray(o.walkUps)) {
    return { ok: false, error: "Export is missing its registrants or walkUps list." };
  }

  const registrants: RegistrantResult[] = [];
  for (const r of o.registrants as unknown[]) {
    if (typeof r !== "object" || r === null) {
      return { ok: false, error: "A registrant entry is malformed." };
    }
    const x = r as Record<string, unknown>;
    const id = asStr(x.id);
    const name = asStr(x.name);
    if (!id || !name) return { ok: false, error: "A registrant entry is missing id or name." };
    registrants.push({
      id,
      name,
      checkedIn: x.checkedIn === true,
      checkedInAt: asIso(x.checkedInAt),
      note: asStr(x.note),
    });
  }

  const walkUps: WalkUpResult[] = [];
  for (const w of o.walkUps as unknown[]) {
    if (typeof w !== "object" || w === null) {
      return { ok: false, error: "A walk-up entry is malformed." };
    }
    const x = w as Record<string, unknown>;
    const uid = asStr(x.uid);
    const name = asStr(x.name);
    if (!uid || !name) return { ok: false, error: "A walk-up entry is missing uid or name." };
    let gradYear: number | null = null;
    if (x.gradYear !== null && x.gradYear !== undefined) {
      const n = Number(x.gradYear);
      gradYear = Number.isInteger(n) ? n : null;
    }
    walkUps.push({
      uid,
      name,
      gradYear,
      position: asStr(x.position),
      parentEmail: asStr(x.parentEmail),
      parentPhone: asStr(x.parentPhone),
      checkedIn: x.checkedIn === true,
      checkedInAt: asIso(x.checkedInAt),
      note: asStr(x.note),
      addedAt: asIso(x.addedAt),
    });
  }

  return {
    ok: true,
    results: {
      kind: "yf-tryout-field-results",
      version: 1,
      sheetGeneratedAt,
      exportedAt,
      registrants,
      walkUps,
    },
  };
}

// ── note merging ─────────────────────────────────────────────────────────────

/**
 * Merge a field note into what the DB already holds. Returns the new value,
 * or null when nothing should change.
 *   no existing note        → incoming
 *   existing contains it    → no change (re-import of the same file)
 *   incoming contains it    → incoming (the coach extended the same note)
 *   otherwise               → append on a new line (a second tryout day)
 */
export function mergeFieldNote(existing: string | null, incoming: string): string | null {
  if (!existing) return incoming;
  if (existing === incoming || existing.includes(incoming)) return null;
  if (incoming.includes(existing)) return incoming;
  return existing + "\n" + incoming;
}

// ── import plan ──────────────────────────────────────────────────────────────

/** The columns the import reads from tryout_registrations. */
export interface DbTryoutRow {
  id: string;
  player_full_name: string;
  graduation_year: number | null;
  checked_in_at: string | null;
  field_notes: string | null;
  field_sheet_uid: string | null;
}

export type RegistrantAction = "update" | "no-change" | "not-found";
export type WalkUpAction = "create" | "merge" | "already-imported" | "invalid";

export interface RegistrantPlanItem {
  id: string;
  name: string;
  action: RegistrantAction;
  /** Human lines shown in the preview, e.g. "Check in" / "Add note". */
  changes: string[];
  set: { checked_in_at?: string; field_notes?: string };
}

export interface WalkUpPlanItem {
  uid: string;
  name: string;
  gradYear: number | null;
  action: WalkUpAction;
  changes: string[];
  reason?: string;
  /** For action "merge": the existing row this walk-up folds into. */
  mergeTargetId?: string;
  mergeTargetName?: string;
  set?: { checked_in_at?: string; field_notes?: string; field_sheet_uid?: string };
  insert?: {
    player_full_name: string;
    email: string | null;
    phone: string | null;
    graduation_year: number | null;
    position: string | null;
    tryout_group: "youth" | "older" | null;
    tryout_date: string | null;
    tryout_type: null;
    amount_cents: 0;
    currency: "usd";
    payment_status: "free";
    source: "tryout";
    checked_in_at: string | null;
    field_notes: string | null;
    field_sheet_uid: string;
  };
}

export interface ImportPlan {
  sheetGeneratedAt: string;
  exportedAt: string;
  registrants: RegistrantPlanItem[];
  walkUps: WalkUpPlanItem[];
  summary: {
    updates: number;
    creates: number;
    merges: number;
    unchanged: number;
    alreadyImported: number;
    notFound: number;
    invalid: number;
  };
}

function normName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** YYYY-MM-DD in club time for a timestamp — used for walk-up tryout_date. */
export function isoDateET(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(
    new Date(iso),
  );
}

/** Informational cohort tag (mirrors groupForGradYear in @/lib/tryouts). */
function cohortFor(gradYear: number | null): "youth" | "older" | null {
  if (gradYear == null) return null;
  return gradYear <= 2031 ? "older" : "youth";
}

/**
 * Compute the full import plan against the current DB rows. Pure — the route
 * fetches rows, calls this, and either returns it (preview) or applies it
 * (confirm). Registrant updates and walk-up merges share a working copy of
 * row state so a re-run of the produced plan is always a no-op.
 */
export function computeImportPlan(
  results: FieldResults,
  dbRows: DbTryoutRow[],
): ImportPlan {
  const byId = new Map<string, DbTryoutRow>();
  const byUid = new Map<string, DbTryoutRow>();
  const byNameYear = new Map<string, DbTryoutRow[]>();
  for (const row of dbRows) {
    byId.set(row.id, row);
    if (row.field_sheet_uid) byUid.set(row.field_sheet_uid, row);
    if (row.graduation_year != null) {
      const k = normName(row.player_full_name) + "|" + row.graduation_year;
      const list = byNameYear.get(k);
      if (list) list.push(row);
      else byNameYear.set(k, [row]);
    }
  }

  // Working state so registrant updates + walk-up merges compose consistently.
  const working = new Map<string, { checked_in_at: string | null; field_notes: string | null }>();
  const stateOf = (row: DbTryoutRow) => {
    let s = working.get(row.id);
    if (!s) {
      s = { checked_in_at: row.checked_in_at, field_notes: row.field_notes };
      working.set(row.id, s);
    }
    return s;
  };

  const planChanges = (
    row: DbTryoutRow,
    checkedIn: boolean,
    checkedInAt: string | null,
    note: string | null,
  ): { changes: string[]; set: { checked_in_at?: string; field_notes?: string } } => {
    const s = stateOf(row);
    const changes: string[] = [];
    const set: { checked_in_at?: string; field_notes?: string } = {};
    // An import never un-checks: absence of a check-in on the sheet does not
    // erase a check-in already in the DB (e.g. from an earlier tryout day).
    if (checkedIn && !s.checked_in_at) {
      const at = checkedInAt ?? results.exportedAt;
      set.checked_in_at = at;
      s.checked_in_at = at;
      changes.push("Check her in");
    }
    if (note) {
      const merged = mergeFieldNote(s.field_notes, note);
      if (merged !== null) {
        set.field_notes = merged;
        changes.push(s.field_notes ? "Add to her notes" : "Save her note");
        s.field_notes = merged;
      }
    }
    return { changes, set };
  };

  const registrants: RegistrantPlanItem[] = [];
  for (const r of results.registrants) {
    const row = byId.get(r.id);
    if (!row) {
      registrants.push({ id: r.id, name: r.name, action: "not-found", changes: [], set: {} });
      continue;
    }
    const { changes, set } = planChanges(row, r.checkedIn, r.checkedInAt, r.note);
    registrants.push({
      id: r.id,
      name: r.name,
      action: changes.length ? "update" : "no-change",
      changes,
      set,
    });
  }

  const walkUps: WalkUpPlanItem[] = [];
  for (const w of results.walkUps) {
    // 1. Same sheet already imported → nothing to do.
    const prior = byUid.get(w.uid);
    if (prior) {
      walkUps.push({
        uid: w.uid,
        name: w.name,
        gradYear: w.gradYear,
        action: "already-imported",
        changes: [],
        reason: "This walk-up was already imported (matched by its sheet id).",
      });
      continue;
    }
    // 2. Grad year the DB would reject → surfaced, never silently dropped.
    if (w.gradYear != null && (w.gradYear < GRAD_YEAR_DB_MIN || w.gradYear > GRAD_YEAR_DB_MAX)) {
      walkUps.push({
        uid: w.uid,
        name: w.name,
        gradYear: w.gradYear,
        action: "invalid",
        changes: [],
        reason: `Graduation year ${w.gradYear} is outside ${GRAD_YEAR_DB_MIN}–${GRAD_YEAR_DB_MAX} — fix her year on a prospect record by hand.`,
      });
      continue;
    }
    // 3. Exactly one existing registrant with the same name + grad year →
    //    she registered after all; fold the walk-up into her row instead of
    //    creating a duplicate.
    const matches =
      w.gradYear != null ? (byNameYear.get(normName(w.name) + "|" + w.gradYear) ?? []) : [];
    if (matches.length === 1) {
      const target = matches[0];
      const { changes, set } = planChanges(target, w.checkedIn, w.checkedInAt, w.note);
      const fullSet: WalkUpPlanItem["set"] = { ...set, field_sheet_uid: w.uid };
      walkUps.push({
        uid: w.uid,
        name: w.name,
        gradYear: w.gradYear,
        action: "merge",
        changes,
        reason: `Matches existing registrant ${target.player_full_name} (${w.gradYear}) — no duplicate will be created.`,
        mergeTargetId: target.id,
        mergeTargetName: target.player_full_name,
        set: fullSet,
      });
      continue;
    }
    // 4. Genuinely new → she becomes a real registration row.
    const whenIso = w.addedAt ?? results.exportedAt;
    walkUps.push({
      uid: w.uid,
      name: w.name,
      gradYear: w.gradYear,
      action: "create",
      changes: [
        "Create her registration" +
          (w.checkedIn ? " · checked in" : "") +
          (w.note ? " · with her note" : ""),
      ],
      insert: {
        player_full_name: w.name,
        email: w.parentEmail,
        phone: w.parentPhone,
        graduation_year: w.gradYear,
        position: w.position,
        tryout_group: cohortFor(w.gradYear),
        tryout_date: isoDateET(whenIso),
        tryout_type: null,
        amount_cents: 0,
        currency: "usd",
        payment_status: "free",
        source: "tryout",
        checked_in_at: w.checkedIn ? (w.checkedInAt ?? results.exportedAt) : null,
        field_notes: w.note,
        field_sheet_uid: w.uid,
      },
    });
  }

  const summary = {
    updates: registrants.filter((r) => r.action === "update").length,
    creates: walkUps.filter((w) => w.action === "create").length,
    merges: walkUps.filter((w) => w.action === "merge").length,
    unchanged: registrants.filter((r) => r.action === "no-change").length,
    alreadyImported: walkUps.filter((w) => w.action === "already-imported").length,
    notFound: registrants.filter((r) => r.action === "not-found").length,
    invalid: walkUps.filter((w) => w.action === "invalid").length,
  };

  return {
    sheetGeneratedAt: results.sheetGeneratedAt,
    exportedAt: results.exportedAt,
    registrants,
    walkUps,
    summary,
  };
}
