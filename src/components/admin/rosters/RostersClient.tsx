"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  FileDown,
  GitMerge,
  Loader2,
  Printer,
  RefreshCw,
  Send,
  UserMinus,
  X,
} from "lucide-react";
import {
  POSITION_OPTIONS,
  POSITION_ORDER,
  ROSTER_SHAPE,
  ROSTER_SIZE_MAX,
  ROSTER_SIZE_MIN,
  BLUE_TEAM_NAME,
  formatPhone,
  groupKeyForYear,
  isBlueClass,
  nameSortKey,
  pickKeeper,
  placedTeamOk,
  tierLabel,
  type PlacementTier,
  type RosterAthlete,
  type RosterData,
} from "@/lib/rosters/shared";

// ─── Rosters — the decision screen ───────────────────────────────────────────
// The list carries only what a placement decision needs: number, name, chips,
// position, school, confirmed, paid, and the placement dropdown — grouped by
// position so "do I have enough goalies" is answered by looking. Everything
// else (contact, notes, corrective and destructive actions) lives in the
// detail panel that opens on row click and follows the selection.

type Choice = PlacementTier | "pending" | "move_down" | "move_up";

type EditField =
  | "name"
  | "position"
  | "school"
  | "jerseyNumber"
  | "notes"
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

/** Tab key for the one cross-class Blue team. */
const BLUE_TAB = "blue";

// Sticky offsets: the pinned block (tabs row + shape strip) is ~92px tall on
// md+; the table header parks directly beneath it on desktop.
const TH = "py-2.5 font-semibold bg-white xl:sticky xl:top-[92px] xl:z-10 xl:shadow-[inset_0_-1px_0_#E5E8EC]";

// Scarce positions first, unknown last, empty groups skipped.
function positionGroupsOf(list: RosterAthlete[]): { label: string; athletes: RosterAthlete[] }[] {
  const out: { label: string; athletes: RosterAthlete[] }[] = [];
  for (const pos of POSITION_ORDER) {
    const sub = list.filter((a) => a.position === pos);
    if (sub.length > 0) out.push({ label: pos, athletes: sub });
  }
  const unknown = list.filter(
    (a) => !a.position || !(POSITION_ORDER as readonly string[]).includes(a.position),
  );
  if (unknown.length > 0) out.push({ label: "Position unknown", athletes: unknown });
  return out;
}

export default function RostersClient({ initial }: { initial: RosterData }) {
  const [data, setData] = useState<RosterData>(initial);
  const [active, setActive] = useState<string>("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [mergeFor, setMergeFor] = useState<string | null>(null);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());
  const [movedKeys, setMovedKeys] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);

  const toastSeq = useRef(0);
  const inFlight = useRef(0);
  const knownKeys = useRef<Set<string>>(new Set(initial.athletes.map((a) => a.key)));

  // ── Derived structure ───────────────────────────────────────────────────
  // A tab exists for every class an athlete plays in OR belongs to by grad
  // year — a play-up stays visible on both.
  const groups = useMemo(() => {
    const minYear = new Map<string, number>();
    const note = (y: number | null) => {
      if (y == null) return;
      const k = groupKeyForYear(y);
      minYear.set(k, Math.min(minYear.get(k) ?? 9999, y));
    };
    for (const a of data.athletes) {
      note(a.classYear);
      note(a.gradYear);
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
    if (
      (!active ||
        (active !== "unassigned" && active !== BLUE_TAB && !groups.includes(active))) &&
      groups.length > 0
    ) {
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

  // You First Blue is ONE team across 2029 and 2030 with its OWN tab — one
  // roster, one place. The class strips still show its shared count.
  const isBlueClassTab = active === "2029" || active === "2030";
  const allBlue = useMemo(
    () =>
      data.athletes
        .filter((a) => a.placementTier === "blue")
        .sort((a, b) => nameSortKey(a.name).localeCompare(nameSortKey(b.name))),
    [data],
  );

  // Team sections: Elite always renders; programs, Declined and parked
  // states appear once they hold someone. Blue lives on its own tab — a
  // class tab lists its Blue athletes in a trace section below Unplaced.
  const sections = useMemo(() => {
    const byTier = (t: string) => inClass.filter((a) => a.placementTier === t);
    const label = active === "unassigned" ? "" : active;
    return [
      { key: "elite", title: `${label} Elite`, list: byTier("elite"), always: true, targets: true, controls: true, forceYear: false },
      { key: "elite_youth", title: "Elite Youth Program", list: byTier("elite_youth"), always: false, targets: false, controls: true, forceYear: false },
      { key: "elite_training", title: "Elite Training Group", list: byTier("elite_training"), always: false, targets: false, controls: true, forceYear: false },
      { key: "declined", title: "Declined", list: byTier("declined"), always: false, targets: false, controls: false, forceYear: false },
      {
        key: "parked",
        title: "No Tryout / No Registration",
        list: [...byTier("no_tryout"), ...byTier("no_registration")],
        always: false,
        targets: false,
        controls: false,
        forceYear: false,
      },
    ];
  }, [inClass, active]);

  // Her class tab keeps a trace of every athlete it sent to Blue.
  const placedOnBlue = useMemo(
    () => inClass.filter((a) => a.placementTier === "blue"),
    [inClass],
  );

  // Acceptance per team: over everyone whose placement email OFFERED this
  // tier (token at send time), classified by where she stands now — so a
  // decline still counts against the team that was declined.
  const acceptanceFor = useCallback(
    (tierKey: string) => {
      const pop = data.athletes.filter(
        (a) =>
          a.placementEmail &&
          (a.placementEmail.tier ?? a.placementTier) === tierKey &&
          (tierKey === "blue" ||
            (a.classYear != null && groupKeyForYear(a.classYear) === active)),
      );
      const confirmed = pop.filter((a) => a.confirmed).length;
      const declined = pop.filter((a) => a.placementTier === "declined").length;
      return {
        sent: pop.length,
        confirmed,
        declined,
        silent: pop.length - confirmed - declined,
      };
    },
    [data, active],
  );

  const unplaced = useMemo(() => inClass.filter((a) => !a.placementTier), [inClass]);

  const placedElsewhere = useMemo(() => {
    if (active === "unassigned") return [];
    return data.athletes
      .filter(
        (a) =>
          a.gradYear != null &&
          groupKeyForYear(a.gradYear) === active &&
          a.classYear != null &&
          groupKeyForYear(a.classYear) !== active,
      )
      .sort((a, b) => nameSortKey(a.name).localeCompare(nameSortKey(b.name)));
  }, [data, active]);

  const selected = useMemo(
    () => (selectedKey ? (data.athletes.find((a) => a.key === selectedKey) ?? null) : null),
    [data, selectedKey],
  );

  const byKey = useMemo(() => {
    const m = new Map<string, RosterAthlete>();
    for (const a of data.athletes) m.set(a.key, a);
    return m;
  }, [data]);

  // ── Toasts ──────────────────────────────────────────────────────────────
  const pushToast = useCallback((kind: Toast["kind"], text: string) => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, kind, text }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 7000);
  }, []);

  // Auto-resolutions from the first server render — say what happened, once.
  const announcedAutoResolve = useRef(false);
  useEffect(() => {
    if (announcedAutoResolve.current) return;
    announcedAutoResolve.current = true;
    for (const e of initial.autoResolved) {
      pushToast("info", `Auto-resolved duplicate — kept ${e.keptName}, superseded ${e.droppedName}. Reversible from the record's notes.`);
    }
  }, [initial.autoResolved, pushToast]);

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
      for (const e of next.autoResolved) {
        pushToast("info", `Auto-resolved duplicate — kept ${e.keptName}, superseded ${e.droppedName}.`);
      }
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
          return { ...a, placementTier: null, placedTeam: null };
        }
        if (choice === "no_tryout" || choice === "no_registration") {
          return { ...a, placementTier: choice, placedTeam: null };
        }
        if (choice === "declined") {
          return { ...a, placementTier: "declined" };
        }
        return {
          ...a,
          placementTier: choice,
          placedTeam: cls != null ? String(cls) : a.placedTeam,
        };
      });
      setData({ ...data, athletes: optimistic });
      setSave(athlete.key, "saving");
      // She just landed somewhere — flash the row so he sees where she went.
      setMovedKeys((prev) => new Set(prev).add(athlete.key));
      window.setTimeout(() => {
        setMovedKeys((prev) => {
          const s = new Set(prev);
          s.delete(athlete.key);
          return s;
        });
      }, 2400);
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
    async (
      athlete: RosterAthlete,
      field: EditField,
      value: string,
      target?: { table: "players" | "tryout_registrations"; id: string },
    ) => {
      inFlight.current += 1;
      try {
        const res = await fetch("/api/admin/rosters/athlete", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table: target?.table ?? athlete.table,
            id: target?.id ?? athlete.id,
            field,
            value,
          }),
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
              case "jerseyNumber":
                return { ...a, jersey: v };
              case "notes":
                return { ...a, noteText: v };
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
                  classYear:
                    a.placedTeam && /^\d{4}$/.test(a.placedTeam) ? a.classYear : y,
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
          `Set ${athlete.name} inactive? She leaves every class list but stays on the Players page.`,
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
        setSelectedKey(null);
        pushToast("success", `${athlete.name} set inactive.`);
      } catch (e) {
        pushToast("error", e instanceof Error ? e.message : "Save failed.");
      } finally {
        inFlight.current -= 1;
      }
    },
    [pushToast],
  );

  const removeFromRoster = useCallback(
    (athlete: RosterAthlete) => {
      const gradKeepsHer =
        athlete.gradYear != null &&
        athlete.classYear != null &&
        groupKeyForYear(athlete.gradYear) === groupKeyForYear(athlete.classYear);
      const warning = gradKeepsHer
        ? `Clear ${athlete.name}'s placement? Her graduation year (${athlete.gradYear}) keeps her in this class — reclassify the year if she belongs somewhere else.`
        : `Clear ${athlete.name}'s placement and return her to her own class?`;
      if (!window.confirm(warning)) return;
      void applyChoice(athlete, "pending");
    },
    [applyChoice],
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
        setMerging(false);
        setMergeFor(null);
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
    data.athletes.filter(
      (a) =>
        (a.classYear != null && groupKeyForYear(a.classYear) === k) ||
        (a.gradYear != null && groupKeyForYear(a.gradYear) === k),
    ).length;

  const activeLabel =
    active === "unassigned"
      ? "Unassigned"
      : active === BLUE_TAB
        ? BLUE_TEAM_NAME
        : `Class of ${active}`;

  // With the panel open there isn't room for every column until 2xl; the ones
  // that hide are all carried by the panel (and grouping already says the
  // position). Placement never leaves the screen.
  const compactHide = selected ? "hidden 2xl:table-cell" : "";

  // ── Team header actions: copy, export, and a LINK to the send screen ────
  const paidLabel = (s: RosterAthlete["paidStatus"]) =>
    s === "paid" ? "Paid" : s === "partial" ? "Partial" : s === "none" ? "None" : "Unknown";

  const copyEmails = useCallback(
    (title: string, list: RosterAthlete[]) => {
      const withEmail = list.filter((a) => a.parentEmail);
      const emails = Array.from(new Set(withEmail.map((a) => a.parentEmail!.toLowerCase())));
      const skipped = list.length - withEmail.length;
      if (emails.length === 0) {
        pushToast("error", `No parent emails on file for ${title}.`);
        return;
      }
      navigator.clipboard.writeText(emails.join(", ")).then(
        () =>
          pushToast(
            "success",
            `Copied ${emails.length} parent email${emails.length === 1 ? "" : "s"} for ${title}${
              skipped > 0 ? ` — skipped ${skipped} athlete${skipped === 1 ? "" : "s"} with no email on file` : ""
            }.`,
          ),
        () => pushToast("error", "Clipboard copy failed."),
      );
    },
    [pushToast],
  );

  const exportCsv = useCallback(
    (title: string, list: RosterAthlete[]) => {
      const withEmail = list.filter((a) => a.parentEmail);
      const skipped = list.length - withEmail.length;
      if (withEmail.length === 0) {
        pushToast("error", `No exportable athletes for ${title} — none have an email on file.`);
        return;
      }
      const esc = (v: string | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const rows = [
        ["Athlete", "Position", "Jersey #", "Parent", "Parent email", "Parent phone", "Confirmed", "Paid"],
        ...withEmail.map((a) => [
          a.name,
          a.position ?? "",
          a.jersey ?? "",
          a.parentName ?? "",
          a.parentEmail ?? "",
          a.parentPhone ?? "",
          a.confirmed ? "Yes" : "No",
          paidLabel(a.paidStatus),
        ]),
      ];
      const csv = rows.map((r) => r.map(esc).join(",")).join("\r\n");
      const blobUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const el = document.createElement("a");
      el.href = blobUrl;
      el.download = `yf-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      el.click();
      URL.revokeObjectURL(blobUrl);
      pushToast(
        "success",
        `Exported ${withEmail.length} for ${title}${
          skipped > 0 ? ` — skipped ${skipped} with no email on file` : ""
        }.`,
      );
    },
    [pushToast],
  );

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
            Grouped by position. Placements save the moment you pick them;
            click a row for details, contact, and edits.
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
            const blueAfter = k === "2030" || (k === "2029" && !groups.includes("2030"));
            const classTab = (
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
            if (!blueAfter) return classTab;
            // The one Blue team sits beside the classes it draws from.
            return (
              <SectionBlock key={k}>
                {classTab}
                <button
                  type="button"
                  onClick={() => setActive(BLUE_TAB)}
                  className={[
                    "inline-flex items-baseline gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors",
                    active === BLUE_TAB
                      ? "bg-[#0B0E12] text-white"
                      : "bg-white border border-[#4B9CD3]/50 text-[#2E6C9E] hover:bg-[#EDF5FB]",
                  ].join(" ")}
                >
                  {BLUE_TEAM_NAME}
                  <span
                    className={[
                      "text-[11px] font-semibold tabular-nums",
                      active === BLUE_TAB ? "text-white/60" : "text-[#2E6C9E]/70",
                    ].join(" ")}
                  >
                    {allBlue.length}
                  </span>
                </button>
              </SectionBlock>
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
        {active === BLUE_TAB ? (
          <div className="mt-1.5 h-8 flex items-center gap-x-6 overflow-x-auto whitespace-nowrap rounded-lg border border-[#E5E8EC] bg-white px-3 text-[12px] scrollbar-hide">
            <TierInline title={BLUE_TEAM_NAME} list={allBlue} />
          </div>
        ) : (
          active !== "unassigned" && (
            <ShapeStrip
              label={active}
              athletes={inClass}
              blueList={isBlueClassTab ? allBlue : null}
            />
          )
        )}
      </div>

      {/* List + detail panel */}
      <div className="mt-4 flex gap-5 items-start">
        <div className="flex-1 min-w-0">
          {active === "unassigned" && (
            <p className="mb-3 text-[13px] text-[#B45309]">
              No graduation year on file — these athletes appear in no class.
              Click a row and set the year, or merge into the real record.
            </p>
          )}

          <div className="rounded-2xl border border-[#E5E8EC] bg-white overflow-x-auto xl:overflow-visible print:border-0 print:rounded-none print:overflow-visible">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.1em] text-[#9CA3AF] border-b border-[#E5E8EC]">
                  <th className={`pl-4 pr-1 w-10 text-right ${TH}`}>#</th>
                  <th className={`px-3 ${TH}`}>Athlete</th>
                  <th className={`px-3 ${TH} ${compactHide}`}>Pos</th>
                  <th className={`px-3 ${TH} ${compactHide}`}>School</th>
                  <th className={`px-3 ${TH}`}>Conf</th>
                  <th className={`px-3 ${TH} ${compactHide}`}>Paid</th>
                  <th className={`px-4 w-[230px] ${TH}`}>Placement</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const groupProps = {
                    selectedKey,
                    mergeFor,
                    byKey,
                    merging,
                    compactHide,
                    saveStates,
                    newKeys,
                    movedKeys,
                    onChoice: applyChoice,
                    onMerge: runMerge,
                    onMergeOpen: (k: string) => setMergeFor((cur) => (cur === k ? null : k)),
                    onSelect: (k: string) => {
                      setSelectedKey((cur) => (cur === k ? null : k));
                      clearNewKey(k);
                    },
                  };
                  const renderGroups = (list: RosterAthlete[], forceYear = false) =>
                    positionGroupsOf(list).map((g) => (
                      <PositionGroup
                        key={g.label}
                        label={g.label}
                        athletes={g.athletes}
                        forceYear={forceYear}
                        {...groupProps}
                      />
                    ));

                  if (active === "unassigned") {
                    return (
                      <>
                        {renderGroups(inClass)}
                        {inClass.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-6 text-[12px] text-[#9CA3AF]">
                              No athletes here.
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  }

                  // The Blue tab IS the roster — one team, one place.
                  if (active === BLUE_TAB) {
                    return (
                      <>
                        <TeamHeaderRow
                          title={BLUE_TEAM_NAME}
                          list={allBlue}
                          targets
                          acceptance={acceptanceFor("blue")}
                          sendTier="blue"
                          onCopy={() => copyEmails(BLUE_TEAM_NAME, allBlue)}
                          onCsv={() => exportCsv(BLUE_TEAM_NAME, allBlue)}
                        />
                        {allBlue.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-6 text-[12px] text-[#9CA3AF]">
                              No one on the roster yet — pick “{BLUE_TEAM_NAME}” in a
                              placement dropdown on the 2029 or 2030 tab.
                            </td>
                          </tr>
                        ) : (
                          renderGroups(allBlue, true)
                        )}
                      </>
                    );
                  }

                  return (
                    <>
                      {sections.map((s) =>
                        s.always || s.list.length > 0 ? (
                          <SectionBlock key={s.key}>
                            <TeamHeaderRow
                              title={s.title}
                              list={s.list}
                              targets={s.targets}
                              acceptance={s.controls ? acceptanceFor(s.key) : null}
                              sendTier={s.controls ? s.key : null}
                              onCopy={s.controls ? () => copyEmails(s.title, s.list) : null}
                              onCsv={s.controls ? () => exportCsv(s.title, s.list) : null}
                            />
                            {s.list.length === 0 ? (
                              <tr className="border-b border-[#F1F3F6]">
                                <td colSpan={7} className="px-4 py-3 text-[12px] text-[#9CA3AF]">
                                  No one placed yet — pick “{s.title}” in a placement dropdown.
                                </td>
                              </tr>
                            ) : (
                              renderGroups(s.list, s.forceYear)
                            )}
                          </SectionBlock>
                        ) : null,
                      )}

                      <TeamHeaderRow title="Unplaced" list={unplaced} targets={false} acceptance={null} sendTier={null} onCopy={null} onCsv={null} />
                      {unplaced.length === 0 ? (
                        <tr className="border-b border-[#F1F3F6]">
                          <td colSpan={7} className="px-4 py-3 text-[12px] text-[#177245]">
                            Everyone in this class has a decision.
                          </td>
                        </tr>
                      ) : (
                        renderGroups(unplaced)
                      )}

                      {placedOnBlue.length > 0 && (
                        <SectionBlock>
                          <TeamHeaderRow
                            title={`Placed on ${BLUE_TEAM_NAME}`}
                            list={placedOnBlue}
                            targets={false}
                            acceptance={null}
                            sendTier={null}
                            onCopy={null}
                            onCsv={null}
                          />
                          {placedOnBlue.map((a) => (
                            <AthleteRowGroup key={a.key}>
                              <AthleteRow
                                a={a}
                                jump={{
                                  label: `→ ${BLUE_TEAM_NAME}`,
                                  onClick: () => setActive(BLUE_TAB),
                                }}
                                selected={selectedKey === a.key}
                                moved={movedKeys.has(a.key)}
                                compactHide={compactHide}
                                saveState={saveStates[a.key] ?? null}
                                isNew={newKeys.has(a.key)}
                                onChoice={applyChoice}
                                onMergeOpen={groupProps.onMergeOpen}
                                onSelect={groupProps.onSelect}
                              />
                            </AthleteRowGroup>
                          ))}
                        </SectionBlock>
                      )}

                      {placedElsewhere.length > 0 && (
                        <SectionBlock>
                          <TeamHeaderRow
                            title="Placed on other rosters"
                            list={placedElsewhere}
                            targets={false}
                            acceptance={null}
                            sendTier={null}
                            onCopy={null}
                            onCsv={null}
                          />
                          {placedElsewhere.map((a) => (
                            <AthleteRowGroup key={a.key}>
                              <AthleteRow
                                a={a}
                                jump={{
                                  label: `→ ${a.classYear} roster`,
                                  onClick: () =>
                                    a.classYear != null &&
                                    setActive(groupKeyForYear(a.classYear)),
                                }}
                                selected={selectedKey === a.key}
                                moved={movedKeys.has(a.key)}
                                compactHide={compactHide}
                                saveState={saveStates[a.key] ?? null}
                                isNew={newKeys.has(a.key)}
                                onChoice={applyChoice}
                                onMergeOpen={groupProps.onMergeOpen}
                                onSelect={groupProps.onSelect}
                              />
                            </AthleteRowGroup>
                          ))}
                        </SectionBlock>
                      )}
                    </>
                  );
                })()}
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

        {selected && (
          <DetailPanel
            a={selected}
            onClose={() => setSelectedKey(null)}
            onField={saveField}
            onDeactivate={deactivate}
            onRemove={removeFromRoster}
          />
        )}
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

// ─── One position group: quiet subheader + rows ──────────────────────────────

function PositionGroup({
  label,
  athletes,
  selectedKey,
  mergeFor,
  byKey,
  merging,
  compactHide,
  forceYear,
  saveStates,
  newKeys,
  movedKeys,
  onChoice,
  onMerge,
  onMergeOpen,
  onSelect,
}: {
  label: string;
  athletes: RosterAthlete[];
  selectedKey: string | null;
  mergeFor: string | null;
  byKey: Map<string, RosterAthlete>;
  merging: boolean;
  compactHide: string;
  forceYear?: boolean;
  saveStates: Record<string, SaveState>;
  newKeys: Set<string>;
  movedKeys: Set<string>;
  onChoice: (a: RosterAthlete, c: Choice) => void;
  onMerge: (
    dropRegId: string,
    keepTable: "players" | "tryout_registrations",
    keepId: string,
  ) => void;
  onMergeOpen: (key: string) => void;
  onSelect: (key: string) => void;
}) {
  return (
    <>
      <tr className="border-b border-[#E5E8EC] bg-[#F8F9FA]">
        <td
          colSpan={7}
          className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]"
        >
          {label}
          <span className="ml-2 text-[#9CA3AF] tabular-nums">{athletes.length}</span>
        </td>
      </tr>
      {athletes.map((a) => (
        <AthleteRowGroup key={a.key}>
          <AthleteRow
            a={a}
            selected={selectedKey === a.key}
            moved={movedKeys.has(a.key)}
            forceYear={forceYear}
            compactHide={compactHide}
            saveState={saveStates[a.key] ?? null}
            isNew={newKeys.has(a.key)}
            onChoice={onChoice}
            onMergeOpen={onMergeOpen}
            onSelect={onSelect}
          />
          {mergeFor === a.key && a.dupOf.length > 0 && (
            <MergeCompareRow a={a} byKey={byKey} merging={merging} onMerge={onMerge} />
          )}
        </AthleteRowGroup>
      ))}
    </>
  );
}

// Fragment wrapper so a row and its open compare stay keyed together.
function AthleteRowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// Fragment wrapper for a team section's header + grouped rows.
function SectionBlock({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// ─── Team section header — count vs shape, and the three controls ────────────

function TeamHeaderRow({
  title,
  list,
  targets,
  acceptance,
  sendTier,
  onCopy,
  onCsv,
}: {
  title: string;
  list: RosterAthlete[];
  targets: boolean;
  acceptance: { sent: number; confirmed: number; declined: number; silent: number } | null;
  sendTier: string | null;
  onCopy: (() => void) | null;
  onCsv: (() => void) | null;
}) {
  const total = list.length;
  // Under target neutral, at target good, over target warning.
  const tone = (n: number, min: number, max: number) =>
    n > max ? "text-[#B45309]" : n >= min ? "text-[#177245]" : "text-[#6B7280]";
  const noEmail = list.filter((a) => !a.parentEmail).length;
  const btn =
    "inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#D6DBE1] bg-white text-[11px] font-semibold text-[#1A1A1A] hover:bg-[#F1F3F6] transition-colors";

  return (
    <tr className="border-y border-[#E5E8EC] bg-[#EDF0F3]">
      <td colSpan={7} className="px-4 py-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#0A0A0B]">
            {title}
          </span>
          <span className="text-[12px] font-semibold tabular-nums">
            {targets ? (
              <>
                <span className={tone(total, ROSTER_SIZE_MIN, ROSTER_SIZE_MAX)}>{total}</span>
                <span className="text-[#9CA3AF] font-normal"> / {ROSTER_SIZE_MIN}–{ROSTER_SIZE_MAX}</span>
              </>
            ) : (
              <span className="text-[#6B7280]">{total}</span>
            )}
          </span>
          {targets && (
            <span className="inline-flex items-center gap-x-2.5 text-[12px] tabular-nums">
              {ROSTER_SHAPE.map((t) => {
                const n = list.filter((a) => a.position === t.position).length;
                return (
                  <span
                    key={t.position}
                    title={`${t.position}: have ${n}, target ${t.min === t.max ? t.min : `${t.min}–${t.max}`}`}
                  >
                    <span className="text-[#9CA3AF]">{POS_ABBR[t.position]}</span>{" "}
                    <span className={`font-semibold ${tone(n, t.min, t.max)}`}>{n}</span>
                    <span className="text-[#C6CBD3]">/{t.min === t.max ? t.min : `${t.min}–${t.max}`}</span>
                  </span>
                );
              })}
            </span>
          )}
          {acceptance && (
            <span
              className="inline-flex items-center gap-x-2.5 text-[11px] tabular-nums text-[#6B7280]"
              title="Placement emails for this team: sent · confirmed · declined · no response"
            >
              <span>
                Sent <span className="font-semibold text-[#1A1A1A]">{acceptance.sent}</span>
              </span>
              <span className={acceptance.confirmed > 0 ? "text-[#177245] font-semibold" : ""}>
                {acceptance.confirmed} confirmed
              </span>
              <span className={acceptance.declined > 0 ? "text-[#B91C1C] font-semibold" : ""}>
                {acceptance.declined} declined
              </span>
              <span>{acceptance.silent} no reply</span>
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-1.5 print:hidden">
            {noEmail > 0 && (onCopy || onCsv) && (
              <span
                className="text-[10px] font-semibold text-[#B45309]"
                title="Excluded from Copy emails and Export — no email on file"
              >
                {noEmail} no email
              </span>
            )}
            {onCopy && total > 0 && (
              <button type="button" onClick={onCopy} className={btn} title="Copy all parent emails, comma-separated">
                <Copy size={11} strokeWidth={2.5} />
                Copy emails
              </button>
            )}
            {onCsv && total > 0 && (
              <button type="button" onClick={onCsv} className={btn} title="Download this team as CSV">
                <FileDown size={11} strokeWidth={2.5} />
                CSV
              </button>
            )}
            {sendTier && total > 0 && (
              <a
                href={`/admin/placements#${sendTier}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#0B0E12] text-white text-[11px] font-semibold hover:bg-[#1c2027] transition-colors"
                title="Opens the send screen for this group — every send safeguard lives there"
              >
                <Send size={11} strokeWidth={2.5} />
                Send placement emails
              </a>
            )}
          </span>
        </div>
      </td>
    </tr>
  );
}

// ─── One athlete — the whole row is a click target for the panel ─────────────

function AthleteRow({
  a,
  selected,
  moved,
  jump,
  forceYear,
  compactHide,
  saveState,
  isNew,
  onChoice,
  onMergeOpen,
  onSelect,
}: {
  a: RosterAthlete;
  selected: boolean;
  moved: boolean;
  /** Trace rows: a chip that jumps to the roster she actually sits on. */
  jump?: { label: string; onClick: () => void };
  forceYear?: boolean;
  compactHide: string;
  saveState: SaveState | null;
  isNew: boolean;
  onChoice: (a: RosterAthlete, c: Choice) => void;
  onMergeOpen: (key: string) => void;
  onSelect: (key: string) => void;
}) {
  const declined = a.placementTier === "declined";
  const playUp =
    !jump &&
    a.gradYear != null &&
    (forceYear || (a.classYear != null && a.gradYear !== a.classYear));

  return (
    <tr
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button, select, input, a")) return;
        onSelect(a.key);
      }}
      className={[
        "border-b border-[#F1F3F6] last:border-0 transition-colors cursor-pointer",
        selected ? "bg-[#EDF5FB]" : isNew ? "bg-[#EDF5FB]/60" : "hover:bg-[#F8F9FA]",
        moved ? "shadow-[inset_0_0_0_2px_rgba(75,156,211,0.45)]" : "",
        declined ? "text-[#9CA3AF]" : "text-[#1A1A1A]",
      ].join(" ")}
    >
      <td className="pl-4 pr-1 py-2.5 w-10 text-right tabular-nums text-[12px] text-[#9CA3AF]">
        {a.jersey ?? ""}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="font-semibold">{a.name}</span>
        {playUp && (
          <span className="ml-1.5 text-[12px] text-[#6B7280] tabular-nums" title={`Class of ${a.gradYear}, playing on the ${a.classYear} roster`}>
            · {a.gradYear}
          </span>
        )}
        <span className="inline-flex items-center gap-1 ml-2 align-middle">
          {jump && (
            <button
              type="button"
              onClick={jump.onClick}
              title={`Placed ${a.placementTier ? `— ${tierLabel(a.placementTier, a.classYear)}` : "on another roster"} · click to open`}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#EDF5FB] text-[#2E6C9E] text-[10px] font-semibold hover:bg-[#D6E9F7] transition-colors print:hidden"
            >
              {jump.label}
            </button>
          )}
          {a.makeupDate && (
            <Chip
              tone="amber"
              title="Registered for a makeup tryout — not evaluated yet, don't cut unseen"
            >
              Makeup {formatShortDate(a.makeupDate)}
            </Chip>
          )}
          {a.band === "returning" &&
            !a.makeupDate &&
            (a.registered ? (
              <Chip tone="blue" title="Returning player who registered for this season's tryouts">
                Tried out
              </Chip>
            ) : a.flags.includes("not_registered") ? (
              <Chip tone="neutral" title="On last season's roster but has not registered for tryouts">
                No registration
              </Chip>
            ) : (
              <Chip tone="neutral" title="On last season's roster">
                Returning
              </Chip>
            ))}
          {a.flags.includes("no_history") && (
            <Chip
              tone="neutral"
              title="No tryout registration, no payment, no payment plan, no team on file — verify she's real"
            >
              No club history
            </Chip>
          )}
          {a.flags.includes("clipboard") && (
            <Chip tone="neutral" title="Clipboard name — written down by hand, never registered online">
              Clipboard
            </Chip>
          )}
          {a.flags.includes("no_contact") && (
            <Chip tone="red" title="No email and no phone on file — this athlete cannot be reached">
              No contact
            </Chip>
          )}
          {a.flags.includes("no_grad_year") && (
            <Chip tone="red" title="No graduation year — appears in no class">
              No grad year
            </Chip>
          )}
          {a.dupOf.length > 0 && (
            <button
              type="button"
              onClick={() => onMergeOpen(a.key)}
              title="Possible duplicate — click to compare and merge"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#FEF3C7] text-[#92400E] text-[10px] font-semibold hover:bg-[#FDE68A] transition-colors print:hidden"
            >
              <GitMerge size={11} strokeWidth={2.5} />
              Dup?
            </button>
          )}
        </span>
      </td>
      <td className={`px-3 py-2.5 whitespace-nowrap ${compactHide}`}>
        {a.position ?? <span className="text-[#D97706]">—</span>}
      </td>
      <td className={`px-3 py-2.5 max-w-[150px] truncate ${compactHide}`} title={a.school ?? undefined}>
        {a.school ?? <span className="text-[#C6CBD3]">—</span>}
      </td>
      <td className="px-3 py-2.5">
        {a.confirmed ? (
          <span className="inline-flex items-center gap-1 text-[#177245] text-[12px] font-semibold">
            <Check size={13} strokeWidth={3} /> Yes
          </span>
        ) : (
          <span className="text-[#C6CBD3] text-[12px]">—</span>
        )}
      </td>
      <td className={`px-3 py-2.5 ${compactHide}`}>
        <PaidPill status={a.paidStatus} detail={a.paidDetail} />
      </td>
      <td className="px-4 py-2 whitespace-nowrap w-[230px]">
        <PlacementSelect a={a} saveState={saveState} onChoice={onChoice} />
      </td>
    </tr>
  );
}

// ─── One-click merge: both records side by side, differences highlighted ─────

function MergeCompareRow({
  a,
  byKey,
  merging,
  onMerge,
}: {
  a: RosterAthlete;
  byKey: Map<string, RosterAthlete>;
  merging: boolean;
  onMerge: (
    dropRegId: string,
    keepTable: "players" | "tryout_registrations",
    keepId: string,
  ) => void;
}) {
  return (
    <tr className="border-b border-[#F1F3F6] bg-[#FFFBEB] print:hidden">
      <td colSpan={7} className="px-4 py-3">
        {a.dupOf.map((c) => {
          const other = byKey.get(c.key);
          if (!other) return null;
          const [keep, drop] = pickKeeper(a, other);
          const mergeable = drop.table === "tryout_registrations";
          const rows: { label: string; l: string | null; r: string | null }[] = [
            { label: "Name", l: a.name, r: other.name },
            {
              label: "Year",
              l: a.gradYear != null ? String(a.gradYear) : null,
              r: other.gradYear != null ? String(other.gradYear) : null,
            },
            { label: "Pos", l: a.position, r: other.position },
            { label: "School", l: a.school, r: other.school },
            { label: "#", l: a.jersey, r: other.jersey },
            { label: "Parent", l: a.parentName, r: other.parentName },
            { label: "Email", l: a.parentEmail, r: other.parentEmail },
            { label: "Phone", l: formatPhone(a.parentPhone), r: formatPhone(other.parentPhone) },
            { label: "Conf", l: a.confirmed ? "Yes" : "No", r: other.confirmed ? "Yes" : "No" },
          ];
          return (
            <div key={c.key} className="mb-2 last:mb-0">
              <div className="grid grid-cols-[64px_1fr_1fr] gap-x-3 gap-y-0.5 text-[12px] max-w-[640px]">
                <span />
                <span className="font-semibold text-[#1A1A1A]">
                  {a.name}
                  {keep === a && <span className="ml-1.5 text-[10px] text-[#177245] font-semibold uppercase">keeps</span>}
                </span>
                <span className="font-semibold text-[#1A1A1A]">
                  {other.name}
                  {keep === other && <span className="ml-1.5 text-[10px] text-[#177245] font-semibold uppercase">keeps</span>}
                </span>
                {rows.map((r) => {
                  const differ =
                    (r.l ?? "").trim().toLowerCase() !== (r.r ?? "").trim().toLowerCase();
                  const cell = (v: string | null) => (
                    <span
                      className={[
                        "px-1 rounded",
                        differ ? "bg-[#FDE68A]/60" : "",
                        v ? "" : "text-[#C6CBD3]",
                      ].join(" ")}
                    >
                      {v && v !== "—" ? v : "—"}
                    </span>
                  );
                  return (
                    <div key={r.label} className="contents">
                      <span className="text-[10px] uppercase tracking-[0.1em] text-[#9CA3AF] pt-0.5">
                        {r.label}
                      </span>
                      {cell(r.l)}
                      {cell(r.r)}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2">
                {mergeable ? (
                  <button
                    type="button"
                    disabled={merging}
                    onClick={() => onMerge(drop.id, keep.table, keep.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0E12] text-white text-[11px] font-semibold hover:bg-[#1c2027] disabled:opacity-50 transition-colors"
                  >
                    <GitMerge size={12} strokeWidth={2.5} />
                    Merge — keep {keep.name}
                  </button>
                ) : (
                  <span className="text-[11px] text-[#92400E]">
                    Both are canonical player records — resolve on the Players page.
                  </span>
                )}
                <span className="ml-3 text-[11px] text-[#9CA3AF]">
                  Keeps the fuller record, fills its blanks, tags the other
                  SUPERSEDED. Nothing is deleted.
                </span>
              </div>
            </div>
          );
        })}
      </td>
    </tr>
  );
}

function PaidPill({ status, detail }: { status: RosterAthlete["paidStatus"]; detail: string | null }) {
  if (status === "paid") {
    return (
      <span title={detail ?? undefined} className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#E8F5EE] text-[#177245] text-[11px] font-semibold">
        Paid
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span title={detail ?? undefined} className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[11px] font-semibold">
        Partial
      </span>
    );
  }
  if (status === "none") {
    return (
      <span title={detail ?? undefined} className="inline-flex items-center px-2 py-0.5 rounded-full border border-[#EF4444]/40 text-[#B91C1C] text-[11px] font-semibold">
        None
      </span>
    );
  }
  return (
    <span title={detail ?? "No player link — payment can't be resolved"} className="text-[#C6CBD3] text-[12px]">
      —
    </span>
  );
}

function Chip({
  tone,
  title,
  children,
}: {
  tone: "red" | "neutral" | "blue" | "amber";
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
            : tone === "amber"
              ? "bg-[#FEF3C7] text-[#92400E]"
              : "bg-[#F1F3F6] text-[#6B7280]",
      ].join(" ")}
    >
      {tone === "red" && <AlertTriangle size={10} strokeWidth={2.5} className="mr-1" />}
      {children}
    </span>
  );
}

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
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
    : "pending";

  const canPlace = cls != null && placedTeamOk(a.table, cls);
  const upTarget = cls != null && placedTeamOk(a.table, cls - 1) ? cls - 1 : null;
  const downTarget = cls != null && placedTeamOk(a.table, cls + 1) ? cls + 1 : null;

  return (
    <span className="flex items-center gap-1.5">
      <select
        value={current}
        onChange={(e) => {
          const v = e.target.value as Choice;
          if (v !== current) onChoice(a, v);
        }}
        className={[
          "w-full min-w-[180px] rounded-lg border bg-white px-2 py-1.5 text-[12px] font-medium",
          "focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/25 focus:border-[#4A90D9]",
          "print:hidden",
          current === "pending"
            ? "border-[#E5E7EB] text-[#6B7280]"
            : current === "declined" || current === "no_tryout" || current === "no_registration"
              ? "border-[#E5E7EB] text-[#9CA3AF]"
              : "border-[#4B9CD3]/50 text-[#1A1A1A]",
        ].join(" ")}
      >
        <option value="pending">Pending</option>
        {canPlace && cls != null && <option value="elite">{cls} Elite</option>}
        {canPlace && isBlueClass(cls) && <option value="blue">{BLUE_TEAM_NAME}</option>}
        <option value="elite_youth">Elite Youth Program</option>
        <option value="elite_training">Elite Training Group</option>
        {upTarget != null && <option value="move_up">Move Up → {upTarget}</option>}
        {downTarget != null && <option value="move_down">Move Down → {downTarget}</option>}
        {a.table === "tryout_registrations" && a.source === "tryout" && (
          <option value="no_tryout">No Tryout</option>
        )}
        {(a.source === "recruiting" || (a.table === "players" && !a.registered)) && (
          <option value="no_registration">No Registration</option>
        )}
        <option value="declined">Declined</option>
      </select>
      {/* What a printed roster shows instead of a control */}
      <span className="hidden print:inline text-[12px] font-medium">
        {tierLabel(a.placementTier, cls)}
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

// ─── Detail panel — everything that isn't a placement decision ───────────────

function DetailPanel({
  a,
  onClose,
  onField,
  onDeactivate,
  onRemove,
}: {
  a: RosterAthlete;
  onClose: () => void;
  onField: (
    a: RosterAthlete,
    f: EditField,
    v: string,
    target?: { table: "players" | "tryout_registrations"; id: string },
  ) => Promise<void>;
  onDeactivate: (a: RosterAthlete) => void;
  onRemove: (a: RosterAthlete) => void;
}) {
  const save = (f: EditField) => (v: string) => onField(a, f, v);
  const sourceLine =
    a.band === "returning"
      ? a.registered
        ? "Returning player · registered for tryouts"
        : "Returning player · no tryout registration"
      : a.source === "recruiting"
        ? "Clipboard entry — written down by hand"
        : "Tryout registration";

  return (
    <aside
      className={[
        "print:hidden shrink-0 bg-white",
        "fixed inset-y-0 right-0 z-40 w-[340px] border-l border-[#E5E8EC] shadow-2xl overflow-y-auto",
        "lg:static lg:z-auto lg:w-[336px] lg:sticky lg:top-[96px] lg:max-h-[calc(100vh-112px)]",
        "lg:rounded-2xl lg:border lg:shadow-none",
      ].join(" ")}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-2">
              {a.jersey && (
                <span className="tabular-nums text-[13px] text-[#9CA3AF]">#{a.jersey}</span>
              )}
              <span className="text-[16px] font-bold text-[#0A0A0B]">{a.name}</span>
            </div>
            <div className="mt-0.5 text-[11px] text-[#6B7280]">{sourceLine}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="p-1.5 -mr-1.5 rounded-md text-[#9CA3AF] hover:text-[#0A0A0B] hover:bg-[#F8F9FA] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Status */}
        <div className="mt-4 rounded-xl bg-[#F8F9FA] p-3 space-y-1.5 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="text-[#6B7280]">Placement</span>
            <span className="font-semibold">{tierLabel(a.placementTier, a.classYear)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6B7280]">Class team</span>
            <span className="font-semibold tabular-nums">
              {a.placedTeam ?? (a.gradYear != null ? `${a.gradYear} (by grad year)` : "—")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6B7280]">Confirmed</span>
            <span className={a.confirmed ? "font-semibold text-[#177245]" : "text-[#9CA3AF]"}>
              {a.confirmed ? "Yes" : "No"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#6B7280]">Payment</span>
            <PaidPill status={a.paidStatus} detail={a.paidDetail} />
          </div>
          {a.paidDetail && (
            <div className="text-[11px] text-[#6B7280] text-right">{a.paidDetail}</div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[#6B7280]">Placement email</span>
            {a.placementEmail ? (
              <span className="font-semibold tabular-nums">
                Sent {formatShortDate(a.placementEmail.at.slice(0, 10))}
              </span>
            ) : (
              <span className="text-[#9CA3AF]">Not sent</span>
            )}
          </div>
        </div>

        {/* Fields */}
        <div className="mt-4 space-y-2.5">
          <Field label="Name">
            <EditableCell value={a.name} onSave={save("name")} minWidth={160} className="font-semibold" />
          </Field>
          <Field label="Graduation year">
            <EditableCell
              value={a.gradYear != null ? String(a.gradYear) : null}
              onSave={save("gradYear")}
              numeric
              minWidth={70}
              missingTone={a.gradYear == null ? "red" : undefined}
            />
          </Field>
          <Field label="Position">
            <EditableCell
              value={a.position}
              onSave={save("position")}
              options={["", ...POSITION_OPTIONS]}
              minWidth={100}
              missingTone={a.position == null ? "amber" : undefined}
            />
          </Field>
          <Field label="School">
            <EditableCell value={a.school} onSave={save("school")} minWidth={140} />
          </Field>
          <Field label="Jersey #">
            <EditableCell value={a.jersey} onSave={save("jerseyNumber")} minWidth={60} className="tabular-nums" />
          </Field>
          <Field label="Parent">
            <EditableCell value={a.parentName} onSave={save("parentName")} minWidth={140} />
          </Field>
          <Field label="Email">
            <EditableCell
              value={a.parentEmail}
              onSave={save("parentEmail")}
              minWidth={170}
              className="text-[12px] break-all"
              missingTone={a.flags.includes("no_contact") ? "red" : undefined}
            />
          </Field>
          <Field label="Phone">
            <EditableCell
              value={a.parentPhone}
              display={a.parentPhone ? formatPhone(a.parentPhone) : undefined}
              onSave={save("parentPhone")}
              minWidth={130}
              className="tabular-nums text-[12px]"
              missingTone={a.flags.includes("no_contact") ? "red" : undefined}
            />
          </Field>
          <Field label="Notes">
            {a.regId ? (
              <EditableCell
                value={a.noteText}
                onSave={(v) =>
                  onField(a, "notes", v, { table: "tryout_registrations", id: a.regId! })
                }
                minWidth={200}
                multiline
                className="text-[12px]"
              />
            ) : (
              <span
                className="text-[11px] text-[#9CA3AF]"
                title="Notes live on a registration record; this returning player has none."
              >
                No registration record to carry notes.
              </span>
            )}
          </Field>
        </div>

        {/* Actions — removing from a roster and deactivating are different */}
        <div className="mt-5 pt-4 border-t border-[#F1F3F6] space-y-2">
          <button
            type="button"
            onClick={() => onRemove(a)}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[#D6DBE1] bg-white text-[#1A1A1A] text-[12px] font-semibold hover:bg-[#F1F3F6] transition-colors"
          >
            Remove from this roster
          </button>
          {a.table === "players" && (
            <button
              type="button"
              onClick={() => onDeactivate(a)}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[#EF4444]/40 bg-white text-[#B91C1C] text-[12px] font-semibold hover:bg-[#FEE2E2] transition-colors"
            >
              <UserMinus size={13} strokeWidth={2.5} />
              Set inactive
            </button>
          )}
          <p className="text-[11px] text-[#9CA3AF]">
            Wrong class? Edit the graduation year above — the athlete moves to
            that class unless a placement pins her here.
          </p>
        </div>
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="pt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF] shrink-0">
        {label}
      </span>
      <span className="text-right text-[13px] min-w-0">{children}</span>
    </div>
  );
}

// ─── Inline editable cell — click, type, enter ───────────────────────────────

function EditableCell({
  value,
  display,
  onSave,
  options,
  numeric,
  multiline,
  className,
  minWidth,
  missingTone,
}: {
  value: string | null;
  /** Shown when not editing, if it differs from the raw value (e.g. phone). */
  display?: string;
  onSave: (v: string) => Promise<void>;
  options?: readonly string[];
  numeric?: boolean;
  multiline?: boolean;
  className?: string;
  minWidth?: number;
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

  if (editing && multiline) {
    return (
      <textarea
        autoFocus
        value={draft}
        rows={3}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
        onBlur={() => void commit(draft)}
        style={{ width: Math.max(minWidth ?? 200, 160) }}
        className="rounded-md border border-[#4A90D9] bg-white px-1.5 py-1 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 text-left"
      />
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
          multiline ? "whitespace-pre-wrap" : "",
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

// ─── Shape strip — the roster he's actually building, always in view ─────────

const POS_ABBR: Record<string, string> = {
  Goalie: "G",
  Attack: "A",
  Midfield: "M",
  Defense: "D",
};

function ShapeStrip({
  label,
  athletes,
  blueList,
}: {
  label: string;
  athletes: RosterAthlete[];
  /** The one cross-class Blue team — identical on the 2029 and 2030 tabs. */
  blueList: RosterAthlete[] | null;
}) {
  const byTier = (tier: string) => athletes.filter((a) => a.placementTier === tier);
  const pending = athletes.filter((a) => !a.placementTier).length;
  const parked = byTier("no_tryout").length + byTier("no_registration").length;

  return (
    <div className="mt-1.5 h-8 flex items-center gap-x-6 overflow-x-auto whitespace-nowrap rounded-lg border border-[#E5E8EC] bg-white px-3 text-[12px] scrollbar-hide">
      <TierInline title={`${label} Elite`} list={byTier("elite")} />
      {blueList && <TierInline title={BLUE_TEAM_NAME} list={blueList} />}
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
