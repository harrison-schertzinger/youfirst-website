"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  GitMerge,
  Loader2,
  Printer,
  RefreshCw,
  UserMinus,
  X,
} from "lucide-react";
import {
  POSITION_OPTIONS,
  ROSTER_SHAPE,
  ROSTER_SIZE_MAX,
  ROSTER_SIZE_MIN,
  decisionLabel,
  formatPhone,
  groupKeyForYear,
  nameSortKey,
  placedTeamOk,
  tierLabel,
  type Decision,
  type PlacementTier,
  type RosterAthlete,
  type RosterData,
} from "@/lib/rosters/shared";

// ─── Rosters — the decision screen ───────────────────────────────────────────
// Dense, aligned, tabular. Two bands share one table so every column lines up;
// color appears only when a fact caused it. The placement dropdown saves the
// moment it changes — optimistic, visible save state, rollback on failure.
// Every identity/contact field edits inline: click, type, enter.

type Choice =
  | PlacementTier
  | "pending"
  | "no_tryout"
  | "no_registration"
  | "move_down"
  | "move_up";

type EditField =
  | "name"
  | "position"
  | "school"
  | "parentName"
  | "parentEmail"
  | "parentPhone"
  | "gradYear";

type SaveState = "saving" | "saved" | "error";

interface Toast {
  id: number;
  kind: "info" | "success" | "error";
  text: string;
}

const POLL_MS = 30_000;

// Sticky offsets: the pinned block (tabs row + shape strip) is ~92px tall on
// md+; the table header parks directly beneath it on desktop.
const TH = "py-2.5 font-semibold bg-white xl:sticky xl:top-[92px] xl:z-10 xl:shadow-[inset_0_-1px_0_#E5E8EC]";

export default function RostersClient({ initial }: { initial: RosterData }) {
  const [data, setData] = useState<RosterData>(initial);
  const [active, setActive] = useState<string>("");
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());
  const [mergeFor, setMergeFor] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  const toastSeq = useRef(0);
  const inFlight = useRef(0);
  const knownKeys = useRef<Set<string>>(new Set(initial.athletes.map((a) => a.key)));

  // ── Derived structure ───────────────────────────────────────────────────
  const groups = useMemo(() => {
    const minYear = new Map<string, number>();
    for (const a of data.athletes) {
      if (a.classYear == null) continue;
      const k = groupKeyForYear(a.classYear);
      minYear.set(k, Math.min(minYear.get(k) ?? 9999, a.classYear));
    }
    return Array.from(minYear.entries())
      .sort((x, y) => x[1] - y[1])
      .map(([k]) => k);
  }, [data]);

  const unassigned = useMemo(
    () => data.athletes.filter((a) => a.classYear == null),
    [data],
  );

  useEffect(() => {
    if ((!active || (active !== "unassigned" && !groups.includes(active))) && groups.length > 0) {
      setActive(groups[0]);
    }
  }, [active, groups]);

  const inClass = useMemo(() => {
    const list =
      active === "unassigned"
        ? unassigned
        : data.athletes.filter(
            (a) => a.classYear != null && groupKeyForYear(a.classYear) === active,
          );
    return list
      .slice()
      .sort((a, b) => nameSortKey(a.name).localeCompare(nameSortKey(b.name)));
  }, [data, active, unassigned]);

  const returning = inClass.filter((a) => a.band === "returning");
  const fresh = inClass.filter((a) => a.band === "new");

  // ── Toasts ──────────────────────────────────────────────────────────────
  const pushToast = useCallback((kind: Toast["kind"], text: string) => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, kind, text }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 7000);
  }, []);

  // ── Quiet refresh: polling + focus, paused while a hand is on the data ──
  const refresh = useCallback(async () => {
    if (inFlight.current > 0 || merging) return;
    try {
      const res = await fetch("/api/admin/rosters", { cache: "no-store" });
      if (!res.ok) return;
      const next = (await res.json()) as RosterData;
      if (inFlight.current > 0) return; // a save landed while we fetched
      const arrivals = next.athletes.filter(
        (a) => a.band === "new" && !knownKeys.current.has(a.key),
      );
      knownKeys.current = new Set(next.athletes.map((a) => a.key));
      setData(next);
      if (arrivals.length > 0) {
        setNewKeys((prev) => {
          const s = new Set(prev);
          for (const a of arrivals) s.add(a.key);
          return s;
        });
        for (const a of arrivals) {
          pushToast(
            "info",
            `New registration — ${a.name}${a.gradYear != null ? ` (class of ${a.gradYear})` : ""}`,
          );
        }
      }
    } catch {
      // Quiet refresh stays quiet; the next tick retries.
    }
  }, [merging, pushToast]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, POLL_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  // ── Placement writes: optimistic, visible, reversible ───────────────────
  const setSave = (key: string, s: SaveState | null) => {
    setSaveStates((prev) => {
      const next = { ...prev };
      if (s === null) delete next[key];
      else next[key] = s;
      return next;
    });
  };

  const applyChoice = useCallback(
    async (athlete: RosterAthlete, choice: Choice) => {
      const before = data;
      const optimistic = data.athletes.map((a) => {
        if (a.key !== athlete.key) return a;
        const cls = a.classYear;
        if (choice === "move_down" || choice === "move_up") {
          if (cls == null) return a;
          const target = choice === "move_down" ? cls + 1 : cls - 1;
          return { ...a, classYear: target, placedTeam: String(target) };
        }
        if (choice === "pending") {
          return { ...a, placementTier: null, placedTeam: null, decision: null };
        }
        if (choice === "no_tryout" || choice === "no_registration") {
          return { ...a, placementTier: null, placedTeam: null, decision: choice as Decision };
        }
        if (choice === "declined") {
          return { ...a, placementTier: "declined", decision: null };
        }
        return {
          ...a,
          placementTier: choice,
          placedTeam: cls != null ? String(cls) : a.placedTeam,
          decision: null,
        };
      });
      setData({ ...data, athletes: optimistic });
      setSave(athlete.key, "saving");
      inFlight.current += 1;

      try {
        const res = await fetch("/api/admin/rosters/placement", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: athlete.table, id: athlete.id, choice }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Save failed (${res.status}).`);
        }
        const body = (await res.json()) as { warning?: string };
        setSave(athlete.key, "saved");
        if (body.warning) pushToast("error", body.warning);
        window.setTimeout(() => setSave(athlete.key, null), 1800);
      } catch (e) {
        setData(before);
        setSave(athlete.key, "error");
        pushToast("error", e instanceof Error ? e.message : "Save failed.");
        window.setTimeout(() => setSave(athlete.key, null), 4000);
      } finally {
        inFlight.current -= 1;
      }
    },
    [data, pushToast],
  );

  // ── Inline field edits: commit on success, cell shows its own state ─────
  const saveField = useCallback(
    async (athlete: RosterAthlete, field: EditField, value: string) => {
      inFlight.current += 1;
      try {
        const res = await fetch("/api/admin/rosters/athlete", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: athlete.table, id: athlete.id, field, value }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Save failed (${res.status}).`);
        }
        setData((cur) => ({
          ...cur,
          athletes: cur.athletes.map((a) => {
            if (a.key !== athlete.key) return a;
            const v = value.trim() || null;
            switch (field) {
              case "name":
                return { ...a, name: v ?? a.name };
              case "position":
                return { ...a, position: v };
              case "school":
                return { ...a, school: v };
              case "parentName":
                return { ...a, parentName: v };
              case "parentEmail":
                return { ...a, parentEmail: v };
              case "parentPhone":
                return { ...a, parentPhone: v };
              case "gradYear": {
                const y = v ? parseInt(v, 10) : null;
                return {
                  ...a,
                  gradYear: y,
                  classYear: a.placedTeam && /^\d{4}$/.test(a.placedTeam)
                    ? a.classYear
                    : y,
                };
              }
            }
          }),
        }));
      } finally {
        inFlight.current -= 1;
      }
    },
    [],
  );

  const deactivate = useCallback(
    async (athlete: RosterAthlete) => {
      if (
        !window.confirm(
          `Set ${athlete.name} inactive? She leaves this list but stays on the Players page.`,
        )
      ) {
        return;
      }
      inFlight.current += 1;
      try {
        const res = await fetch("/api/admin/rosters/athlete", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table: athlete.table,
            id: athlete.id,
            field: "status",
            value: "inactive",
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Save failed (${res.status}).`);
        }
        setData((cur) => ({
          ...cur,
          athletes: cur.athletes.filter((a) => a.key !== athlete.key),
        }));
        knownKeys.current.delete(athlete.key);
        pushToast("success", `${athlete.name} set inactive.`);
      } catch (e) {
        pushToast("error", e instanceof Error ? e.message : "Save failed.");
      } finally {
        inFlight.current -= 1;
      }
    },
    [pushToast],
  );

  // ── Merge ───────────────────────────────────────────────────────────────
  const runMerge = useCallback(
    async (dropRegId: string, keepTable: "players" | "tryout_registrations", keepId: string) => {
      setMerging(true);
      try {
        const res = await fetch("/api/admin/rosters/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dropRegId, keepTable, keepId }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          superseded?: string;
          keptName?: string;
        };
        if (!res.ok) throw new Error(body.error ?? `Merge failed (${res.status}).`);
        pushToast("success", `Merged — kept ${body.keptName}, superseded ${body.superseded}.`);
        setMergeFor(null);
        setMerging(false);
        await refresh();
      } catch (e) {
        setMerging(false);
        pushToast("error", e instanceof Error ? e.message : "Merge failed.");
      }
    },
    [pushToast, refresh],
  );

  const clearNewKey = (key: string) =>
    setNewKeys((prev) => {
      if (!prev.has(key)) return prev;
      const s = new Set(prev);
      s.delete(key);
      return s;
    });

  const groupCount = (k: string) =>
    data.athletes.filter((a) => a.classYear != null && groupKeyForYear(a.classYear) === k)
      .length;

  const activeLabel = active === "unassigned" ? "Unassigned" : `Class of ${active}`;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-none">
      {/* Print header — the only chrome a printed roster carries */}
      <div className="hidden print:block mb-4">
        <div className="text-[18px] font-bold tracking-tight">
          You. First — {activeLabel} Roster
        </div>
        <div className="text-[11px] text-[#6B7280]">
          Printed{" "}
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "America/New_York",
          })}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5 print:hidden">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
            Roster Command
          </div>
          <h1 className="mt-1 text-[26px] md:text-[28px] font-bold tracking-tight text-[#0A0A0B]">
            Rosters
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Every athlete in one place. Placements save the moment you pick
            them; click any field to fix it.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#D6DBE1] bg-white text-[#1A1A1A] text-[13px] font-semibold uppercase tracking-[0.08em] rounded-xl hover:bg-[#F1F3F6] transition-colors"
          >
            <RefreshCw size={14} strokeWidth={2.5} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B0E12] text-white text-[13px] font-semibold uppercase tracking-[0.08em] rounded-xl hover:bg-[#1c2027] transition-colors"
          >
            <Printer size={14} strokeWidth={2.5} />
            Print {activeLabel}
          </button>
        </div>
      </div>

      {/* Class tabs — sticky, every class one click away, counts visible */}
      <div className="sticky top-14 md:top-0 z-20 -mx-2 px-2 py-2 bg-[#F8F9FA]/95 backdrop-blur-sm print:hidden">
        <div className="flex flex-wrap items-center gap-1.5">
          {groups.map((k) => {
            const isActive = active === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setActive(k)}
                className={[
                  "inline-flex items-baseline gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors tabular-nums",
                  isActive
                    ? "bg-[#0B0E12] text-white"
                    : "bg-white border border-[#E5E7EB] text-[#1A1A1A] hover:bg-[#F1F3F6]",
                ].join(" ")}
              >
                {k}
                <span
                  className={[
                    "text-[11px] font-semibold tabular-nums",
                    isActive ? "text-white/60" : "text-[#9CA3AF]",
                  ].join(" ")}
                >
                  {groupCount(k)}
                </span>
              </button>
            );
          })}
          {unassigned.length > 0 && (
            <button
              type="button"
              onClick={() => setActive("unassigned")}
              className={[
                "inline-flex items-baseline gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors",
                active === "unassigned"
                  ? "bg-[#0B0E12] text-white"
                  : "bg-white border border-[#B45309]/40 text-[#B45309] hover:bg-[#FEF3C7]/40",
              ].join(" ")}
            >
              Unassigned
              <span
                className={[
                  "text-[11px] font-semibold tabular-nums",
                  active === "unassigned" ? "text-white/60" : "text-[#B45309]/70",
                ].join(" ")}
              >
                {unassigned.length}
              </span>
            </button>
          )}
        </div>
        {/* Shape strip — the roster he's building, pinned under the tabs */}
        {active !== "unassigned" && (
          <ShapeStrip label={active} athletes={inClass} />
        )}
      </div>

      {/* Table */}
      <div className="mt-4">
        <div className="w-full">
          {active === "unassigned" && (
            <p className="mb-3 text-[13px] text-[#B45309]">
              No graduation year on file — these athletes appear in no class.
              Merge them into their real record, or click the year column and
              type one.
            </p>
          )}

          <div className="rounded-2xl border border-[#E5E8EC] bg-white overflow-x-auto xl:overflow-visible print:border-0 print:rounded-none print:overflow-visible">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.1em] text-[#9CA3AF] border-b border-[#E5E8EC]">
                  <th className={`px-4 ${TH}`}>Athlete</th>
                  <th className={`px-3 ${TH} text-right`}>Yr</th>
                  <th className={`px-3 ${TH}`}>Pos</th>
                  <th className={`px-3 ${TH}`}>School</th>
                  <th className={`px-3 ${TH} text-right`}>#</th>
                  <th className={`px-3 ${TH}`}>Parent</th>
                  <th className={`px-3 ${TH}`}>Email</th>
                  <th className={`px-3 ${TH}`}>Phone</th>
                  <th className={`px-3 ${TH}`}>Conf</th>
                  <th className={`px-3 ${TH}`}>Paid</th>
                  <th className={`px-4 ${TH}`}>Placement</th>
                </tr>
              </thead>
              <tbody>
                <BandRows
                  label="Returning"
                  emptyNote={
                    active === "unassigned"
                      ? null
                      : `No returning athletes — ${active} is a new class.`
                  }
                  athletes={returning}
                  saveStates={saveStates}
                  newKeys={newKeys}
                  mergeFor={mergeFor}
                  merging={merging}
                  onChoice={applyChoice}
                  onField={saveField}
                  onDeactivate={deactivate}
                  onMergeOpen={(k) => setMergeFor((cur) => (cur === k ? null : k))}
                  onMerge={runMerge}
                  onRowTouch={clearNewKey}
                />
                <BandRows
                  label="New"
                  emptyNote="No new athletes in this class yet."
                  athletes={fresh}
                  saveStates={saveStates}
                  newKeys={newKeys}
                  mergeFor={mergeFor}
                  merging={merging}
                  onChoice={applyChoice}
                  onField={saveField}
                  onDeactivate={deactivate}
                  onMergeOpen={(k) => setMergeFor((cur) => (cur === k ? null : k))}
                  onMerge={runMerge}
                  onRowTouch={clearNewKey}
                />
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-[11px] text-[#9CA3AF] print:hidden">
            Updated{" "}
            {new Date(data.fetchedAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
              timeZone: "America/New_York",
            })}{" "}
            ET · checks for new registrations every 30 seconds.
          </p>
        </div>
      </div>

      {/* Toasts */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 print:hidden">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "flex items-start gap-2.5 max-w-sm rounded-xl border bg-white px-4 py-3 text-[13px] shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
              t.kind === "error"
                ? "border-[#EF4444]/40 text-[#B91C1C]"
                : t.kind === "success"
                  ? "border-[#10B981]/40 text-[#065F46]"
                  : "border-[#4B9CD3]/40 text-[#1A1A1A]",
            ].join(" ")}
          >
            <span className="flex-1">{t.text}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
              className="text-[#9CA3AF] hover:text-[#1A1A1A]"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── One band: quiet header rule + identical rows ────────────────────────────

interface RowHandlers {
  onChoice: (a: RosterAthlete, c: Choice) => void;
  onField: (a: RosterAthlete, f: EditField, v: string) => Promise<void>;
  onDeactivate: (a: RosterAthlete) => void;
  onMergeOpen: (key: string) => void;
  onMerge: (
    dropRegId: string,
    keepTable: "players" | "tryout_registrations",
    keepId: string,
  ) => void;
  onRowTouch: (key: string) => void;
}

function BandRows({
  label,
  emptyNote,
  athletes,
  saveStates,
  newKeys,
  mergeFor,
  merging,
  ...handlers
}: {
  label: string;
  emptyNote: string | null;
  athletes: RosterAthlete[];
  saveStates: Record<string, SaveState>;
  newKeys: Set<string>;
  mergeFor: string | null;
  merging: boolean;
} & RowHandlers) {
  return (
    <>
      <tr className="border-b border-[#E5E8EC] bg-[#F8F9FA]">
        <td
          colSpan={11}
          className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]"
        >
          {label}
          <span className="ml-2 text-[#9CA3AF] tabular-nums">{athletes.length}</span>
        </td>
      </tr>
      {athletes.length === 0 && emptyNote && (
        <tr className="border-b border-[#F1F3F6]">
          <td colSpan={11} className="px-4 py-3 text-[12px] text-[#9CA3AF]">
            {emptyNote}
          </td>
        </tr>
      )}
      {athletes.map((a) => (
        <AthleteRow
          key={a.key}
          a={a}
          saveState={saveStates[a.key] ?? null}
          isNew={newKeys.has(a.key)}
          mergeOpen={mergeFor === a.key}
          merging={merging}
          {...handlers}
        />
      ))}
    </>
  );
}

// ─── One athlete ─────────────────────────────────────────────────────────────

function AthleteRow({
  a,
  saveState,
  isNew,
  mergeOpen,
  merging,
  onChoice,
  onField,
  onDeactivate,
  onMergeOpen,
  onMerge,
  onRowTouch,
}: {
  a: RosterAthlete;
  saveState: SaveState | null;
  isNew: boolean;
  mergeOpen: boolean;
  merging: boolean;
} & RowHandlers) {
  const declined = a.placementTier === "declined";
  const noContact = a.flags.includes("no_contact");
  const save = (f: EditField) => (v: string) => onField(a, f, v);

  return (
    <>
      <tr
        onMouseEnter={() => onRowTouch(a.key)}
        className={[
          "group border-b border-[#F1F3F6] last:border-0 transition-colors",
          isNew ? "bg-[#EDF5FB]" : "",
          declined ? "text-[#9CA3AF]" : "text-[#1A1A1A]",
        ].join(" ")}
      >
        <td className="px-4 py-1.5 whitespace-nowrap">
          <span className="inline-flex items-center gap-2">
            <EditableCell
              value={a.name}
              onSave={save("name")}
              className="font-semibold"
              minWidth={120}
            />
            <span className="inline-flex items-center gap-1">
              {a.band === "returning" && a.registered && (
                <Chip tone="blue" title="Registered for this season's tryouts">
                  Tried out
                </Chip>
              )}
              {a.flags.includes("clipboard") && (
                <Chip tone="neutral" title="Clipboard name — written down by hand, never registered online">
                  Clipboard
                </Chip>
              )}
              {noContact && (
                <Chip tone="red" title="No email and no phone on file — this athlete cannot be reached">
                  No contact
                </Chip>
              )}
              {a.flags.includes("no_grad_year") && (
                <Chip tone="red" title="No graduation year — appears in no class">
                  No grad year
                </Chip>
              )}
              {a.band === "returning" && a.flags.includes("not_registered") && (
                <Chip tone="neutral" title="On last season's roster but has not registered for tryouts">
                  No registration
                </Chip>
              )}
              {a.dupOf.length > 0 && (
                <button
                  type="button"
                  onClick={() => onMergeOpen(a.key)}
                  title="Possible duplicate — review and merge"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#FEF3C7] text-[#92400E] text-[10px] font-semibold hover:bg-[#FDE68A] transition-colors print:hidden"
                >
                  <GitMerge size={11} strokeWidth={2.5} />
                  Dup?
                </button>
              )}
            </span>
          </span>
        </td>
        <td className="px-3 py-1.5 text-right tabular-nums">
          <EditableCell
            value={a.gradYear != null ? String(a.gradYear) : null}
            onSave={save("gradYear")}
            numeric
            minWidth={48}
            missingTone={a.gradYear == null ? "red" : undefined}
          />
        </td>
        <td className="px-3 py-1.5 whitespace-nowrap">
          <EditableCell
            value={a.position}
            onSave={save("position")}
            options={["", ...POSITION_OPTIONS]}
            minWidth={72}
            missingTone={a.position == null ? "amber" : undefined}
          />
        </td>
        <td className="px-3 py-1.5 max-w-[150px]">
          <EditableCell value={a.school} onSave={save("school")} minWidth={90} truncate />
        </td>
        <td className="px-3 py-1.5 text-right tabular-nums">
          {a.jersey ?? <span className="text-[#C6CBD3]">—</span>}
        </td>
        <td className="px-3 py-1.5 max-w-[150px] whitespace-nowrap">
          <EditableCell value={a.parentName} onSave={save("parentName")} minWidth={100} truncate />
        </td>
        <td className="px-3 py-1.5 max-w-[200px]">
          <EditableCell
            value={a.parentEmail}
            onSave={save("parentEmail")}
            className="text-[12px]"
            minWidth={140}
            truncate
            missingTone={noContact ? "red" : undefined}
          />
        </td>
        <td className="px-3 py-1.5 whitespace-nowrap tabular-nums text-[12px]">
          <EditableCell
            value={a.parentPhone}
            display={formatPhone(a.parentPhone)}
            onSave={save("parentPhone")}
            className="tabular-nums text-[12px]"
            minWidth={110}
            missingTone={noContact ? "red" : undefined}
          />
        </td>
        <td className="px-3 py-1.5">
          {a.confirmed ? (
            <span className="inline-flex items-center gap-1 text-[#177245] text-[12px] font-semibold">
              <Check size={13} strokeWidth={3} /> Yes
            </span>
          ) : (
            <span className="text-[#C6CBD3] text-[12px]">—</span>
          )}
        </td>
        <td className="px-3 py-1.5">
          {a.paid ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#E8F5EE] text-[#177245] text-[11px] font-semibold">
              Paid
            </span>
          ) : a.confirmed ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[11px] font-semibold">
              No
            </span>
          ) : (
            <span className="text-[#C6CBD3] text-[12px]">—</span>
          )}
        </td>
        <td className="px-4 py-1.5 whitespace-nowrap">
          <span className="inline-flex items-center gap-1">
            <PlacementSelect a={a} saveState={saveState} onChoice={onChoice} />
            {a.table === "players" && (
              <button
                type="button"
                onClick={() => onDeactivate(a)}
                title="Set inactive — leaves this list, stays on the Players page"
                className="p-1 rounded-md text-[#C6CBD3] hover:text-[#B91C1C] hover:bg-[#FEE2E2] opacity-0 group-hover:opacity-100 transition-all print:hidden"
              >
                <UserMinus size={13} strokeWidth={2.5} />
              </button>
            )}
          </span>
        </td>
      </tr>
      {mergeOpen && a.dupOf.length > 0 && (
        <tr className="border-b border-[#F1F3F6] bg-[#FFFBEB] print:hidden">
          <td colSpan={11} className="px-4 py-3">
            <div className="text-[12px] font-semibold text-[#92400E] mb-2">
              Possible duplicate — nothing merges without you. Merging keeps one
              record and tags the other SUPERSEDED (never deleted).
            </div>
            <div className="flex flex-col gap-1.5">
              {a.dupOf.map((c) => (
                <div key={c.key} className="flex flex-wrap items-center gap-2 text-[12px]">
                  <span className="font-semibold text-[#1A1A1A]">{c.name}</span>
                  <span className="text-[#6B7280]">{c.detail}</span>
                  {a.table === "tryout_registrations" && (
                    <button
                      type="button"
                      disabled={merging}
                      onClick={() => onMerge(a.id, c.keepTable, c.keepId)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0B0E12] text-white text-[11px] font-semibold hover:bg-[#1c2027] disabled:opacity-50 transition-colors"
                    >
                      <GitMerge size={11} strokeWidth={2.5} />
                      Keep {c.name} — supersede this row
                    </button>
                  )}
                  {c.keepTable === "tryout_registrations" && (
                    <button
                      type="button"
                      disabled={merging}
                      onClick={() => onMerge(c.keepId, a.table, a.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#D6DBE1] bg-white text-[#1A1A1A] text-[11px] font-semibold hover:bg-[#F1F3F6] disabled:opacity-50 transition-colors"
                    >
                      Keep this row — supersede {c.name}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {a.noteText && (
              <div className="mt-2 text-[11px] text-[#6B7280]">Notes: {a.noteText}</div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Inline editable cell — click, type, enter ───────────────────────────────

function EditableCell({
  value,
  display,
  onSave,
  options,
  numeric,
  className,
  minWidth,
  truncate,
  missingTone,
}: {
  value: string | null;
  /** Shown when not editing, if it differs from the raw value (e.g. phone). */
  display?: string;
  onSave: (v: string) => Promise<void>;
  options?: readonly string[];
  numeric?: boolean;
  className?: string;
  minWidth?: number;
  truncate?: boolean;
  missingTone?: "red" | "amber";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<SaveState | null>(null);

  const begin = () => {
    setDraft(value ?? "");
    setEditing(true);
  };

  const commit = async (v: string) => {
    setEditing(false);
    if (v.trim() === (value ?? "")) return;
    setState("saving");
    try {
      await onSave(v);
      setState("saved");
      window.setTimeout(() => setState(null), 1500);
    } catch (e) {
      setState("error");
      window.setTimeout(() => setState(null), 3000);
      // The row keeps its old value — the parent only commits on success.
      void e;
    }
  };

  if (editing && options) {
    return (
      <select
        autoFocus
        value={draft}
        onChange={(e) => void commit(e.target.value)}
        onBlur={() => setEditing(false)}
        className="rounded-md border border-[#4A90D9] bg-white px-1.5 py-1 text-[12px] focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "" ? "—" : o}
          </option>
        ))}
      </select>
    );
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={numeric ? "number" : "text"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void commit(draft);
          if (e.key === "Escape") setEditing(false);
        }}
        onBlur={() => void commit(draft)}
        style={{ width: Math.max(minWidth ?? 80, 40) }}
        className={[
          "rounded-md border border-[#4A90D9] bg-white px-1.5 py-0.5 text-[12px]",
          "focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20",
          numeric ? "tabular-nums text-right" : "",
        ].join(" ")}
      />
    );
  }

  const shown = display ?? value;
  return (
    <span className="inline-flex items-center gap-1 max-w-full">
      <button
        type="button"
        onClick={begin}
        title="Click to edit"
        className={[
          "text-left rounded px-1 -mx-1 py-0.5 hover:bg-[#EDF5FB] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/25 transition-colors cursor-text",
          truncate ? "truncate max-w-full block" : "",
          className ?? "",
        ].join(" ")}
      >
        {shown && shown !== "—" ? (
          shown
        ) : (
          <span
            className={
              missingTone === "red"
                ? "text-[#B91C1C]"
                : missingTone === "amber"
                  ? "text-[#D97706]"
                  : "text-[#C6CBD3]"
            }
          >
            —
          </span>
        )}
      </button>
      {state === "saving" && <Loader2 size={11} className="animate-spin text-[#4A90D9] shrink-0" />}
      {state === "saved" && <Check size={11} strokeWidth={3} className="text-[#10B981] shrink-0" />}
      {state === "error" && (
        <AlertTriangle size={11} strokeWidth={2.5} className="text-[#EF4444] shrink-0" />
      )}
    </span>
  );
}

function Chip({
  tone,
  title,
  children,
}: {
  tone: "red" | "neutral" | "blue";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={[
        "inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold",
        tone === "red"
          ? "bg-[#FEE2E2] text-[#B91C1C]"
          : tone === "blue"
            ? "bg-[#EDF5FB] text-[#2E6C9E]"
            : "bg-[#F1F3F6] text-[#6B7280]",
      ].join(" ")}
    >
      {tone === "red" && <AlertTriangle size={10} strokeWidth={2.5} className="mr-1" />}
      {children}
    </span>
  );
}

// ─── The dropdown — where the decision happens ───────────────────────────────

function PlacementSelect({
  a,
  saveState,
  onChoice,
}: {
  a: RosterAthlete;
  saveState: SaveState | null;
  onChoice: (a: RosterAthlete, c: Choice) => void;
}) {
  const cls = a.classYear;
  const current: Choice = a.placementTier
    ? (a.placementTier as PlacementTier)
    : (a.decision ?? "pending");

  const canPlace = cls != null && placedTeamOk(a.table, cls);
  const upTarget = cls != null && placedTeamOk(a.table, cls - 1) ? cls - 1 : null;
  const downTarget = cls != null && placedTeamOk(a.table, cls + 1) ? cls + 1 : null;

  return (
    <span className="inline-flex items-center gap-1.5">
      <select
        value={current}
        onChange={(e) => {
          const v = e.target.value as Choice;
          if (v !== current) onChoice(a, v);
        }}
        className={[
          "rounded-lg border bg-white px-2 py-1.5 text-[12px] font-medium",
          "focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/25 focus:border-[#4A90D9]",
          "print:hidden",
          current === "pending"
            ? "border-[#E5E7EB] text-[#6B7280]"
            : current === "declined"
              ? "border-[#E5E7EB] text-[#9CA3AF]"
              : "border-[#4B9CD3]/50 text-[#1A1A1A]",
        ].join(" ")}
      >
        <option value="pending">Pending</option>
        {canPlace && cls != null && (
          <>
            <option value="elite">{cls} Elite</option>
            <option value="blue">{cls} Blue</option>
          </>
        )}
        <option value="elite_youth">Elite Youth Program</option>
        <option value="elite_training">Elite Training Group</option>
        {upTarget != null && <option value="move_up">Move Up → {upTarget}</option>}
        {downTarget != null && <option value="move_down">Move Down → {downTarget}</option>}
        {a.table === "tryout_registrations" && a.source === "tryout" && (
          <option value="no_tryout">No Tryout</option>
        )}
        {a.table === "tryout_registrations" && a.source === "recruiting" && (
          <option value="no_registration">No Registration</option>
        )}
        <option value="declined">Declined</option>
      </select>
      {/* What a printed roster shows instead of a control */}
      <span className="hidden print:inline text-[12px] font-medium">
        {a.decision ? decisionLabel(a.decision) : tierLabel(a.placementTier, cls)}
      </span>
      <span className="w-4 inline-flex justify-center print:hidden" aria-hidden>
        {saveState === "saving" && (
          <Loader2 size={13} className="animate-spin text-[#4A90D9]" />
        )}
        {saveState === "saved" && (
          <Check size={13} strokeWidth={3} className="text-[#10B981]" />
        )}
        {saveState === "error" && (
          <AlertTriangle size={13} strokeWidth={2.5} className="text-[#EF4444]" />
        )}
      </span>
    </span>
  );
}

// ─── Shape strip — the roster he's actually building, always in view ─────────

const POS_ABBR: Record<string, string> = {
  Goalie: "G",
  Attack: "A",
  Midfield: "M",
  Defense: "D",
};

function ShapeStrip({ label, athletes }: { label: string; athletes: RosterAthlete[] }) {
  const byTier = (tier: string) => athletes.filter((a) => a.placementTier === tier);
  const pending = athletes.filter((a) => !a.placementTier && !a.decision).length;
  const parked = athletes.filter((a) => a.decision != null).length;

  return (
    <div className="mt-1.5 h-8 flex items-center gap-x-6 overflow-x-auto whitespace-nowrap rounded-lg border border-[#E5E8EC] bg-white px-3 text-[12px] scrollbar-hide">
      <TierInline title={`${label} Elite`} list={byTier("elite")} />
      <TierInline title={`${label} Blue`} list={byTier("blue")} />
      <span className="inline-flex items-center gap-x-3 text-[#6B7280]">
        <StripCount label="Youth" title="Elite Youth Program" n={byTier("elite_youth").length} />
        <StripCount label="Training" title="Elite Training Group" n={byTier("elite_training").length} />
        <StripCount label="Declined" title="Declined" n={byTier("declined").length} />
        <StripCount label="No T/R" title="No Tryout / No Registration" n={parked} />
        <span title="Awaiting a decision">
          Pending{" "}
          <span
            className={[
              "font-semibold tabular-nums",
              pending > 0 ? "text-[#B45309]" : "text-[#1A1A1A]",
            ].join(" ")}
          >
            {pending}
          </span>
        </span>
      </span>
    </div>
  );
}

function TierInline({ title, list }: { title: string; list: RosterAthlete[] }) {
  const total = list.length;
  const totalTone =
    total === 0
      ? "text-[#9CA3AF]"
      : total < ROSTER_SIZE_MIN
        ? "text-[#B45309]"
        : total > ROSTER_SIZE_MAX
          ? "text-[#B91C1C]"
          : "text-[#177245]";
  const noPos = list.filter((a) => !a.position).length;

  return (
    <span className="inline-flex items-center gap-x-2.5">
      <span className="font-bold text-[#1A1A1A]">{title}</span>
      <span className={`font-semibold tabular-nums ${totalTone}`}>
        {total}
        <span className="text-[#9CA3AF] font-normal"> / {ROSTER_SIZE_MIN}–{ROSTER_SIZE_MAX}</span>
      </span>
      {total > 0 && (
        <span className="inline-flex items-center gap-x-2 tabular-nums">
          {ROSTER_SHAPE.map((t) => {
            const n = list.filter((a) => a.position === t.position).length;
            const tone =
              n < t.min
                ? "text-[#B45309]"
                : n > t.max
                  ? "text-[#B91C1C]"
                  : "text-[#177245]";
            return (
              <span key={t.position} title={`${t.position}: have ${n}, need ${t.min === t.max ? t.min : `${t.min}–${t.max}`}`}>
                <span className="text-[#9CA3AF]">{POS_ABBR[t.position]}</span>{" "}
                <span className={`font-semibold ${tone}`}>{n}</span>
                <span className="text-[#C6CBD3]">/{t.min === t.max ? t.min : `${t.min}–${t.max}`}</span>
              </span>
            );
          })}
          {noPos > 0 && (
            <span className="text-[#B45309]" title="Assigned to this roster with no position on file">
              ?{noPos}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

function StripCount({ label, title, n }: { label: string; title: string; n: number }) {
  return (
    <span title={title}>
      {label}{" "}
      <span className="font-semibold tabular-nums text-[#1A1A1A]">{n}</span>
    </span>
  );
}
