"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { ALLOWED_POSITIONS } from "@/lib/positions";
import { sourceLabels, type SourceLabel } from "@/lib/player-source";

export interface SpreadsheetRow {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  position: string | null;
  jersey_number: string | null;
  school: string | null;
  source: SourceLabel;
  billed_cents: number;
  collected_cents: number;
  balance_cents: number;
  prior_balance_cents: number;
}

type SortKey = "name" | "class" | "position" | "balance";
type SortOrder = "asc" | "desc";

interface Props {
  rows: SpreadsheetRow[];
}

function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function isSortKey(value: string | null): value is SortKey {
  return value === "name" || value === "class" || value === "position" || value === "balance";
}

function isSortOrder(value: string | null): value is SortOrder {
  return value === "asc" || value === "desc";
}

export default function PlayerRosterSpreadsheet({ rows }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local mirror of edited fields so saved values reflect immediately
  // without waiting for a server round-trip.
  const [localOverrides, setLocalOverrides] = useState<
    Record<string, Partial<Pick<SpreadsheetRow, "position" | "jersey_number" | "school">>>
  >({});

  const sortParam = searchParams.get("sort");
  const orderParam = searchParams.get("order");
  const sortKey: SortKey = isSortKey(sortParam) ? sortParam : "class";
  const sortOrder: SortOrder = isSortOrder(orderParam) ? orderParam : "asc";
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");

  // Apply per-row edits before sort/filter so the displayed order reflects
  // saved-but-not-refreshed values too.
  const rowsWithOverrides = useMemo<SpreadsheetRow[]>(
    () =>
      rows.map((r) => {
        const o = localOverrides[r.id];
        if (!o) return r;
        return { ...r, ...o };
      }),
    [rows, localOverrides],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rowsWithOverrides.filter((r) => {
      if (
        classFilter !== "all" &&
        String(r.graduation_year ?? "unknown") !== classFilter
      ) {
        return false;
      }
      if (!term) return true;
      const name = `${r.first_name} ${r.last_name}`.toLowerCase();
      return name.includes(term);
    });
  }, [rowsWithOverrides, search, classFilter]);

  const sorted = useMemo(() => {
    const out = [...filtered];
    const dir = sortOrder === "asc" ? 1 : -1;
    out.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return (
            a.last_name.localeCompare(b.last_name) * dir ||
            a.first_name.localeCompare(b.first_name) * dir
          );
        case "class": {
          const av = a.graduation_year ?? 9999;
          const bv = b.graduation_year ?? 9999;
          if (av === bv) return a.last_name.localeCompare(b.last_name);
          return (av - bv) * dir;
        }
        case "position":
          return (
            (a.position ?? "").localeCompare(b.position ?? "") * dir ||
            a.last_name.localeCompare(b.last_name)
          );
        case "balance":
          return (a.balance_cents - b.balance_cents) * dir;
      }
    });
    return out;
  }, [filtered, sortKey, sortOrder]);

  const classOptions = useMemo(() => {
    const years = new Set<string>();
    for (const r of rows) {
      years.add(r.graduation_year != null ? String(r.graduation_year) : "unknown");
    }
    return Array.from(years).sort((a, b) => {
      if (a === "unknown") return 1;
      if (b === "unknown") return -1;
      return Number(a) - Number(b);
    });
  }, [rows]);

  const setSort = useCallback(
    (next: SortKey) => {
      const params = new URLSearchParams(searchParams.toString());
      // Clicking the active column flips order; clicking a new column resets to asc.
      const nextOrder: SortOrder =
        sortKey === next && sortOrder === "asc" ? "desc" : "asc";
      params.set("sort", next);
      params.set("order", nextOrder);
      params.set("view", "spreadsheet");
      router.replace(`/admin/players?${params.toString()}`);
    },
    [router, searchParams, sortKey, sortOrder],
  );

  const handleSaved = useCallback(
    (
      id: string,
      patch: Partial<Pick<SpreadsheetRow, "position" | "jersey_number" | "school">>,
    ) => {
      setLocalOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }));
    },
    [],
  );

  return (
    <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Filter row */}
      <div className="px-5 md:px-6 py-4 border-b border-[#E5E7EB] flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="flex-1 min-w-[200px] bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[13px] text-[#0A0A0B] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition-colors"
        />
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[13px] text-[#0A0A0B] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition-colors"
        >
          <option value="all">All classes</option>
          {classOptions.map((c) => (
            <option key={c} value={c}>
              {c === "unknown" ? "No class" : `Class of ${c}`}
            </option>
          ))}
        </select>
        <div className="text-[11px] uppercase tracking-[0.12em] text-[#6B7280] tabular-nums ml-auto">
          {sorted.length} of {rows.length}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="px-6 py-12 text-center text-[13px] text-[#6B7280]">
          {rows.length === 0
            ? "No active players yet."
            : "No players match your filters."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB]">
                <SortableTh
                  label="Name"
                  active={sortKey === "name"}
                  order={sortOrder}
                  onClick={() => setSort("name")}
                />
                <SortableTh
                  label="Class"
                  active={sortKey === "class"}
                  order={sortOrder}
                  onClick={() => setSort("class")}
                />
                <SortableTh
                  label="Position"
                  active={sortKey === "position"}
                  order={sortOrder}
                  onClick={() => setSort("position")}
                />
                <PlainTh>Jersey</PlainTh>
                <PlainTh>School</PlainTh>
                <PlainTh className="text-right">Billed 26–27</PlainTh>
                <PlainTh className="text-right">Collected 26–27</PlainTh>
                <PlainTh className="text-right">Prior seasons</PlainTh>
                <SortableTh
                  label="Balance 26–27"
                  align="right"
                  active={sortKey === "balance"}
                  order={sortOrder}
                  onClick={() => setSort("balance")}
                />
                <PlainTh>Source</PlainTh>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <SpreadsheetRowComponent
                  key={row.id}
                  row={row}
                  onSaved={handleSaved}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SortableTh({
  label,
  active,
  order,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  order: SortOrder;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <th
      className={[
        "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
        align === "right" ? "text-right" : "text-left",
        active ? "text-[#0A0A0B]" : "text-[#9CA3AF]",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 hover:text-[#0A0A0B] transition-colors"
      >
        {label}
        {active && (
          <span className="text-[9px]" aria-hidden>
            {order === "asc" ? "▲" : "▼"}
          </span>
        )}
      </button>
    </th>
  );
}

function PlainTh({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={[
        "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF] text-left",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

// ─── Inline editable row ──────────────────────────────────────────────────────

function SpreadsheetRowComponent({
  row,
  onSaved,
}: {
  row: SpreadsheetRow;
  onSaved: (
    id: string,
    patch: Partial<Pick<SpreadsheetRow, "position" | "jersey_number" | "school">>,
  ) => void;
}) {
  const sourceMeta = sourceLabels[row.source];
  const outstanding = row.balance_cents > 0;

  return (
    <tr className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F8F9FA] transition-colors h-10">
      <td className="px-4 py-2 text-[#0A0A0B]">
        <Link
          href={`/admin/players/${row.id}`}
          className="font-medium hover:text-[#4A90D9] transition-colors"
        >
          {row.first_name} {row.last_name}
        </Link>
      </td>
      <td className="px-4 py-2 text-[#6B7280] tabular-nums">
        {row.graduation_year ?? "—"}
      </td>
      <td className="px-1 py-1">
        <EditableCell
          playerId={row.id}
          field="position"
          value={row.position}
          kind="select"
          onSaved={onSaved}
        />
      </td>
      <td className="px-1 py-1">
        <EditableCell
          playerId={row.id}
          field="jersey_number"
          value={row.jersey_number}
          kind="text"
          onSaved={onSaved}
        />
      </td>
      <td className="px-1 py-1">
        <EditableCell
          playerId={row.id}
          field="school"
          value={row.school}
          kind="text"
          onSaved={onSaved}
        />
      </td>
      <td className="px-4 py-2 text-right tabular-nums text-[#6B7280]">
        {formatDollars(row.billed_cents)}
      </td>
      <td className="px-4 py-2 text-right tabular-nums text-[#6B7280]">
        {formatDollars(row.collected_cents)}
      </td>
      <td className="px-4 py-2 text-right tabular-nums">
        {row.prior_balance_cents > 0 ? (
          <span className="text-[#B45309] font-semibold">
            {formatDollars(row.prior_balance_cents)}
          </span>
        ) : (
          <span className="text-[#9CA3AF]">—</span>
        )}
      </td>
      <td
        className="px-4 py-2 text-right tabular-nums font-semibold"
        style={{ color: outstanding ? "#EF4444" : "#0A0A0B" }}
      >
        {formatDollars(row.balance_cents)}
      </td>
      <td className="px-4 py-2">
        <span
          className="inline-flex items-center gap-1.5 text-[11px]"
          style={{ color: sourceMeta.color }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: sourceMeta.color }}
            aria-hidden
          />
          {sourceMeta.text}
        </span>
      </td>
    </tr>
  );
}

// ─── Editable cell ────────────────────────────────────────────────────────────

type CellField = "position" | "jersey_number" | "school";
type CellState = "idle" | "editing" | "saving" | "saved" | "error";

function EditableCell({
  playerId,
  field,
  value,
  kind,
  onSaved,
}: {
  playerId: string;
  field: CellField;
  value: string | null;
  kind: "text" | "select";
  onSaved: (
    id: string,
    patch: Partial<Pick<SpreadsheetRow, "position" | "jersey_number" | "school">>,
  ) => void;
}) {
  const [state, setState] = useState<CellState>("idle");
  const [draft, setDraft] = useState<string>(value ?? "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);

  const enter = useCallback(() => {
    if (state === "saving") return;
    setErrorMsg(null);
    setDraft(value ?? "");
    setState("editing");
    // Defer focus to next tick so the input has mounted.
    setTimeout(() => {
      if (kind === "select") selectRef.current?.focus();
      else inputRef.current?.focus();
    }, 0);
  }, [state, value, kind]);

  const cancel = useCallback(() => {
    setDraft(value ?? "");
    setErrorMsg(null);
    setState("idle");
  }, [value]);

  const save = useCallback(async () => {
    const trimmed = draft.trim();
    const nextValue: string | null = trimmed === "" ? null : trimmed;
    // No-op when value didn't change.
    if ((value ?? null) === nextValue) {
      setState("idle");
      return;
    }
    setState("saving");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/players/${playerId}/inline-update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: nextValue }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(data.error ?? "Save failed.");
        setState("error");
        // Revert visible draft so the cell shows the old value.
        setDraft(value ?? "");
        return;
      }
      onSaved(playerId, { [field]: nextValue } as Partial<
        Pick<SpreadsheetRow, "position" | "jersey_number" | "school">
      >);
      setState("saved");
      setTimeout(() => setState("idle"), 900);
    } catch (err) {
      console.error("[EditableCell] save threw:", err);
      setErrorMsg("Network error.");
      setState("error");
      setDraft(value ?? "");
    }
  }, [draft, field, onSaved, playerId, value]);

  if (state === "editing" || state === "saving") {
    return (
      <div className="px-2 py-1 rounded border border-[#4A90D9] bg-white flex items-center gap-1.5">
        {kind === "select" ? (
          <select
            ref={selectRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
              if (e.key === "Enter") save();
            }}
            disabled={state === "saving"}
            className="flex-1 min-w-0 bg-transparent text-[13px] text-[#0A0A0B] focus:outline-none"
          >
            <option value="">—</option>
            {ALLOWED_POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              } else if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
            disabled={state === "saving"}
            className="flex-1 min-w-0 bg-transparent text-[13px] text-[#0A0A0B] focus:outline-none"
          />
        )}
        {state === "saving" && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4A90D9] animate-pulse shrink-0" />
        )}
      </div>
    );
  }

  const display = value ?? "—";
  const isError = state === "error";

  return (
    <button
      type="button"
      onClick={enter}
      title={isError ? errorMsg ?? "Save failed." : "Click to edit"}
      className={[
        "w-full text-left px-2 py-1.5 rounded text-[13px] transition-colors",
        isError
          ? "border border-[#EF4444]/60 bg-[#FEF2F2] text-[#EF4444]"
          : "border border-transparent hover:bg-[#F8F9FA] text-[#0A0A0B]",
      ].join(" ")}
    >
      <span className="inline-flex items-center gap-1.5">
        <span
          className={value == null ? "text-[#9CA3AF]" : ""}
        >
          {display}
        </span>
        {state === "saved" && (
          <Check className="w-3 h-3 text-[#34D399]" strokeWidth={2.5} />
        )}
      </span>
    </button>
  );
}
