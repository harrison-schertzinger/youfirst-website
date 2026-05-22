"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Check, ArrowRight } from "lucide-react";
import {
  PROSPECT_STAGES,
  stageLabel,
  type ProspectStage,
} from "@/lib/prospects";
import ProspectConvertModal from "@/components/admin/ProspectConvertModal";
import InlineProspectAddRow from "@/components/admin/InlineProspectAddRow";

/**
 * Prospects spreadsheet view. Each row is a prospect; cells are
 * click-to-edit and persist via PATCH. Inline "+ Add row" pinned at
 * the bottom for rapid-fire entry from tournament intel.
 *
 * The convert flow reuses the shared ProspectConvertModal which posts
 * to /api/admin/prospects/[id]/convert — same logic as the detail
 * page's Convert button.
 */

export interface ProspectRow {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  parent_first_name: string | null;
  parent_last_name: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  source: string | null;
  stage: ProspectStage;
  last_contacted_at: string | null;
  converted_player_id: string | null;
  status: string;
}

type SortKey = "name" | "grad" | "stage" | "reached_out";
type SortOrder = "asc" | "desc";

// Stage progression order for the default sort — interested first, terminal last.
const STAGE_RANK: Record<ProspectStage, number> = {
  interested: 0,
  contacted: 1,
  parent_confirmed: 2,
  ready_to_onboard: 3,
  converted: 4,
  declined: 5,
};

const STAGE_COLOR: Record<ProspectStage, string> = {
  interested: "#6B7280",
  contacted: "#4A90D9",
  parent_confirmed: "#F59E0B",
  ready_to_onboard: "#34D399",
  converted: "#0A0A0B",
  declined: "#EF4444",
};

// Inline stage dropdown only shows the active pipeline stages; the
// terminal ones (converted, declined) come from elsewhere — converted
// happens via the Convert button, declined via the detail page archive.
const INLINE_STAGE_OPTIONS: ProspectStage[] = [
  "interested",
  "contacted",
  "parent_confirmed",
  "ready_to_onboard",
];

const VISIBLE_STAGES: ReadonlySet<ProspectStage> = new Set([
  "interested",
  "contacted",
  "parent_confirmed",
  "ready_to_onboard",
]);

function fmtReachedOut(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSortKey(value: string | null): value is SortKey {
  return (
    value === "name" ||
    value === "grad" ||
    value === "stage" ||
    value === "reached_out"
  );
}

function isSortOrder(value: string | null): value is SortOrder {
  return value === "asc" || value === "desc";
}

interface Props {
  rows: ProspectRow[];
  showArchived: boolean;
}

export default function ProspectsSpreadsheet({ rows, showArchived }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local optimistic overrides for inline edits.
  const [overrides, setOverrides] = useState<
    Record<string, Partial<ProspectRow>>
  >({});
  // Convert modal target prospect.
  const [convertingId, setConvertingId] = useState<string | null>(null);
  // Free-text search across prospect + parent name.
  const [search, setSearch] = useState("");

  const sortParam = searchParams.get("sort");
  const orderParam = searchParams.get("order");
  const sortKey: SortKey = isSortKey(sortParam) ? sortParam : "stage";
  const sortOrder: SortOrder = isSortOrder(orderParam) ? orderParam : "asc";

  const applied: ProspectRow[] = useMemo(
    () =>
      rows.map((r) => {
        const o = overrides[r.id];
        return o ? { ...r, ...o } : r;
      }),
    [rows, overrides],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return applied.filter((r) => {
      if (!showArchived) {
        // Default view: only the four pipeline stages, active status.
        if (r.status !== "active") return false;
        if (!VISIBLE_STAGES.has(r.stage)) return false;
      }
      if (!term) return true;
      const prospectName = `${r.first_name} ${r.last_name}`.toLowerCase();
      const parentName = `${r.parent_first_name ?? ""} ${
        r.parent_last_name ?? ""
      }`.toLowerCase();
      return prospectName.includes(term) || parentName.includes(term);
    });
  }, [applied, search, showArchived]);

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
        case "grad": {
          const av = a.graduation_year ?? 9999;
          const bv = b.graduation_year ?? 9999;
          if (av === bv) return a.last_name.localeCompare(b.last_name);
          return (av - bv) * dir;
        }
        case "stage": {
          const av = STAGE_RANK[a.stage];
          const bv = STAGE_RANK[b.stage];
          if (av === bv) return a.last_name.localeCompare(b.last_name);
          return (av - bv) * dir;
        }
        case "reached_out": {
          // Nulls float to the end regardless of direction so unactioned
          // prospects don't push contacted ones out of view.
          const at = a.last_contacted_at;
          const bt = b.last_contacted_at;
          if (!at && !bt) return a.last_name.localeCompare(b.last_name);
          if (!at) return 1;
          if (!bt) return -1;
          return (new Date(at).getTime() - new Date(bt).getTime()) * dir;
        }
      }
    });
    return out;
  }, [filtered, sortKey, sortOrder]);

  const setSort = useCallback(
    (next: SortKey) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextOrder: SortOrder =
        sortKey === next && sortOrder === "asc" ? "desc" : "asc";
      params.set("sort", next);
      params.set("order", nextOrder);
      router.replace(`/admin/prospects?${params.toString()}`);
    },
    [router, searchParams, sortKey, sortOrder],
  );

  const handleSaved = useCallback(
    (id: string, patch: Partial<ProspectRow>) => {
      setOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }));
    },
    [],
  );

  const convertingProspect =
    convertingId !== null
      ? applied.find((r) => r.id === convertingId) ?? null
      : null;

  return (
    <>
      {/* Filter row */}
      <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-5 md:px-6 py-4 border-b border-[#E5E7EB] flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by prospect or parent name…"
            className="flex-1 min-w-[200px] bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[13px] text-[#0A0A0B] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9]"
          />
          <div className="text-[11px] uppercase tracking-[0.12em] text-[#6B7280] tabular-nums ml-auto">
            {sorted.length} {sorted.length === 1 ? "prospect" : "prospects"}
          </div>
        </div>

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
                  label="Grad"
                  active={sortKey === "grad"}
                  order={sortOrder}
                  onClick={() => setSort("grad")}
                />
                <PlainTh>Parent Name</PlainTh>
                <PlainTh>Parent Email</PlainTh>
                <PlainTh>Parent Phone</PlainTh>
                <SortableTh
                  label="Reached Out"
                  active={sortKey === "reached_out"}
                  order={sortOrder}
                  onClick={() => setSort("reached_out")}
                />
                <SortableTh
                  label="Stage"
                  active={sortKey === "stage"}
                  order={sortOrder}
                  onClick={() => setSort("stage")}
                />
                <PlainTh>Source</PlainTh>
                <PlainTh>Actions</PlainTh>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <SpreadsheetRow
                  key={row.id}
                  row={row}
                  onSaved={handleSaved}
                  onConvert={() => setConvertingId(row.id)}
                />
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-[12px] text-[#6B7280]"
                  >
                    {rows.length === 0
                      ? "No prospects yet — use the row below to add the first one."
                      : "No prospects match your filters."}
                  </td>
                </tr>
              )}
              <InlineProspectAddRow />
            </tbody>
          </table>
        </div>
      </div>

      {convertingProspect && (
        <ProspectConvertModal
          prospect={{
            id: convertingProspect.id,
            first_name: convertingProspect.first_name,
            last_name: convertingProspect.last_name,
            parent_email: convertingProspect.parent_email,
          }}
          onClose={() => setConvertingId(null)}
          onConverted={(playerId) => {
            // Reflect locally so the row updates immediately, then refresh
            // the server tree so list filters (e.g. show-archived = false)
            // can hide it.
            handleSaved(convertingProspect.id, {
              stage: "converted",
              converted_player_id: playerId,
            });
            setConvertingId(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function SortableTh({
  label,
  active,
  order,
  onClick,
}: {
  label: string;
  active: boolean;
  order: SortOrder;
  onClick: () => void;
}) {
  return (
    <th
      className={[
        "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-left",
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

function PlainTh({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF] text-left">
      {children}
    </th>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function SpreadsheetRow({
  row,
  onSaved,
  onConvert,
}: {
  row: ProspectRow;
  onSaved: (id: string, patch: Partial<ProspectRow>) => void;
  onConvert: () => void;
}) {
  const isConverted = row.stage === "converted";
  const isArchived = row.status === "archived";
  const rowDim = isConverted || isArchived;
  const canConvert =
    row.stage === "ready_to_onboard" &&
    !!row.parent_email &&
    row.parent_email.trim().length > 0;

  return (
    <tr
      className={[
        "border-b border-[#E5E7EB] last:border-0 transition-colors h-10",
        rowDim ? "opacity-60" : "hover:bg-[#F8F9FA]",
      ].join(" ")}
    >
      <td className="px-4 py-2 text-[#0A0A0B] whitespace-nowrap">
        <Link
          href={`/admin/prospects/${row.id}`}
          className="font-medium hover:text-[#4A90D9] transition-colors"
        >
          {row.first_name} {row.last_name}
        </Link>
      </td>
      <td className="px-1 py-1">
        <EditableCell
          prospectId={row.id}
          field="graduation_year"
          value={row.graduation_year != null ? String(row.graduation_year) : null}
          kind="number"
          onSaved={(p) => onSaved(row.id, p)}
        />
      </td>
      <td className="px-1 py-1">
        <ParentNameCell
          prospectId={row.id}
          firstName={row.parent_first_name}
          lastName={row.parent_last_name}
          onSaved={(patch) => onSaved(row.id, patch)}
        />
      </td>
      <td className="px-1 py-1">
        <EditableCell
          prospectId={row.id}
          field="parent_email"
          value={row.parent_email}
          kind="email"
          onSaved={(p) => onSaved(row.id, p)}
        />
      </td>
      <td className="px-1 py-1">
        <EditableCell
          prospectId={row.id}
          field="parent_phone"
          value={row.parent_phone}
          kind="text"
          onSaved={(p) => onSaved(row.id, p)}
        />
      </td>
      <td className="px-1 py-1">
        <ReachedOutCell
          prospectId={row.id}
          value={row.last_contacted_at}
          onSaved={(p) => onSaved(row.id, p)}
        />
      </td>
      <td className="px-1 py-1">
        <StageCell
          prospectId={row.id}
          value={row.stage}
          disabled={isConverted}
          onSaved={(p) => onSaved(row.id, p)}
        />
      </td>
      <td className="px-1 py-1">
        <EditableCell
          prospectId={row.id}
          field="source"
          value={row.source}
          kind="text"
          onSaved={(p) => onSaved(row.id, p)}
        />
      </td>
      <td className="px-2 py-1 whitespace-nowrap">
        {isConverted ? (
          row.converted_player_id ? (
            <Link
              href={`/admin/players/${row.converted_player_id}`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-[#34D399] hover:underline"
            >
              View Player
              <ArrowRight className="w-3 h-3" />
            </Link>
          ) : (
            <span className="text-[11px] text-[#6B7280]">Converted</span>
          )
        ) : (
          <button
            type="button"
            onClick={onConvert}
            disabled={!canConvert}
            title={
              canConvert
                ? "Convert this prospect to a player"
                : "Set stage to Ready to Onboard and add a parent email first"
            }
            className={[
              "inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors",
              canConvert
                ? "bg-[#34D399] text-white hover:bg-[#22B883]"
                : "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed",
            ].join(" ")}
          >
            Convert
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Generic editable cell (text / number / email) ───────────────────────────

type CellKind = "text" | "number" | "email";
type CellState = "idle" | "editing" | "saving" | "saved" | "error";

function EditableCell({
  prospectId,
  field,
  value,
  kind,
  onSaved,
}: {
  prospectId: string;
  field: keyof ProspectRow;
  value: string | null;
  kind: CellKind;
  onSaved: (patch: Partial<ProspectRow>) => void;
}) {
  const [state, setState] = useState<CellState>("idle");
  const [draft, setDraft] = useState<string>(value ?? "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const enter = useCallback(() => {
    if (state === "saving") return;
    setErrorMsg(null);
    setDraft(value ?? "");
    setState("editing");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [state, value]);

  const cancel = useCallback(() => {
    setDraft(value ?? "");
    setErrorMsg(null);
    setState("idle");
  }, [value]);

  const save = useCallback(async () => {
    const trimmed = draft.trim();
    // Build the JSON payload. graduation_year is numeric — anything
    // non-empty must coerce cleanly to an integer in range.
    let nextValue: unknown;
    if (field === "graduation_year") {
      if (trimmed === "") {
        nextValue = null;
      } else {
        const n = Number(trimmed);
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < 2024 || n > 2040) {
          setErrorMsg("Year must be 2024–2040.");
          setState("error");
          setDraft(value ?? "");
          return;
        }
        nextValue = n;
      }
    } else {
      nextValue = trimmed === "" ? null : trimmed;
    }

    // No-op if unchanged.
    const previous = value ?? null;
    const nextString = nextValue == null ? null : String(nextValue);
    if (previous === nextString) {
      setState("idle");
      return;
    }

    setState("saving");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: nextValue }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(data.error ?? "Save failed.");
        setState("error");
        setDraft(value ?? "");
        return;
      }
      // Reflect in the parent so the cell display matches the saved value.
      onSaved({ [field]: nextValue } as Partial<ProspectRow>);
      setState("saved");
      setTimeout(() => setState("idle"), 900);
    } catch (err) {
      console.error("[EditableCell] save threw:", err);
      setErrorMsg("Network error.");
      setState("error");
      setDraft(value ?? "");
    }
  }, [draft, field, onSaved, prospectId, value]);

  if (state === "editing" || state === "saving") {
    return (
      <div className="px-2 py-1 rounded border border-[#4A90D9] bg-white flex items-center gap-1.5">
        <input
          ref={inputRef}
          type={kind === "number" ? "number" : kind === "email" ? "email" : "text"}
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
        <span className={value == null ? "text-[#9CA3AF]" : ""}>{display}</span>
        {state === "saved" && (
          <Check className="w-3 h-3 text-[#34D399]" strokeWidth={2.5} />
        )}
      </span>
    </button>
  );
}

// ─── Parent name cell — single field "First Last" → two columns ──────────────

function ParentNameCell({
  prospectId,
  firstName,
  lastName,
  onSaved,
}: {
  prospectId: string;
  firstName: string | null;
  lastName: string | null;
  onSaved: (patch: Partial<ProspectRow>) => void;
}) {
  const combined = [firstName, lastName].filter(Boolean).join(" ");
  const [state, setState] = useState<CellState>("idle");
  const [draft, setDraft] = useState<string>(combined);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const enter = useCallback(() => {
    if (state === "saving") return;
    setErrorMsg(null);
    setDraft(combined);
    setState("editing");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [state, combined]);

  const cancel = useCallback(() => {
    setDraft(combined);
    setErrorMsg(null);
    setState("idle");
  }, [combined]);

  const save = useCallback(async () => {
    const trimmed = draft.trim();
    let nextFirst: string | null = null;
    let nextLast: string | null = null;
    if (trimmed.length > 0) {
      const spaceIdx = trimmed.indexOf(" ");
      if (spaceIdx === -1) {
        nextFirst = trimmed;
      } else {
        nextFirst = trimmed.slice(0, spaceIdx);
        nextLast = trimmed.slice(spaceIdx + 1).trim() || null;
      }
    }
    if ((firstName ?? null) === nextFirst && (lastName ?? null) === nextLast) {
      setState("idle");
      return;
    }

    setState("saving");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_first_name: nextFirst,
          parent_last_name: nextLast,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(data.error ?? "Save failed.");
        setState("error");
        setDraft(combined);
        return;
      }
      onSaved({
        parent_first_name: nextFirst,
        parent_last_name: nextLast,
      });
      setState("saved");
      setTimeout(() => setState("idle"), 900);
    } catch (err) {
      console.error("[ParentNameCell] save threw:", err);
      setErrorMsg("Network error.");
      setState("error");
      setDraft(combined);
    }
  }, [draft, firstName, lastName, combined, prospectId, onSaved]);

  if (state === "editing" || state === "saving") {
    return (
      <div className="px-2 py-1 rounded border border-[#4A90D9] bg-white flex items-center gap-1.5">
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
          placeholder="First Last"
          className="flex-1 min-w-0 bg-transparent text-[13px] text-[#0A0A0B] focus:outline-none"
        />
        {state === "saving" && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4A90D9] animate-pulse shrink-0" />
        )}
      </div>
    );
  }

  const display = combined.length > 0 ? combined : "—";
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
        <span className={combined.length === 0 ? "text-[#9CA3AF]" : ""}>
          {display}
        </span>
        {state === "saved" && (
          <Check className="w-3 h-3 text-[#34D399]" strokeWidth={2.5} />
        )}
      </span>
    </button>
  );
}

// ─── Reached Out date cell (last_contacted_at) ───────────────────────────────

function ReachedOutCell({
  prospectId,
  value,
  onSaved,
}: {
  prospectId: string;
  value: string | null;
  onSaved: (patch: Partial<ProspectRow>) => void;
}) {
  const [state, setState] = useState<CellState>("idle");
  const [draft, setDraft] = useState(isoToDateInput(value));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const enter = useCallback(() => {
    if (state === "saving") return;
    setErrorMsg(null);
    setDraft(isoToDateInput(value));
    setState("editing");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [state, value]);

  const cancel = useCallback(() => {
    setDraft(isoToDateInput(value));
    setErrorMsg(null);
    setState("idle");
  }, [value]);

  const save = useCallback(async () => {
    let nextIso: string | null;
    if (draft.trim() === "") {
      nextIso = null;
    } else {
      // The <input type="date"> always yields YYYY-MM-DD in user-local
      // time. Persist noon-local so DST flips can't shift the date.
      const d = new Date(`${draft}T12:00:00`);
      if (Number.isNaN(d.getTime())) {
        setErrorMsg("Invalid date.");
        setState("error");
        setDraft(isoToDateInput(value));
        return;
      }
      nextIso = d.toISOString();
    }

    if ((value ?? null) === nextIso) {
      setState("idle");
      return;
    }

    setState("saving");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ last_contacted_at: nextIso }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(data.error ?? "Save failed.");
        setState("error");
        setDraft(isoToDateInput(value));
        return;
      }
      onSaved({ last_contacted_at: nextIso });
      setState("saved");
      setTimeout(() => setState("idle"), 900);
    } catch (err) {
      console.error("[ReachedOutCell] save threw:", err);
      setErrorMsg("Network error.");
      setState("error");
      setDraft(isoToDateInput(value));
    }
  }, [draft, value, prospectId, onSaved]);

  if (state === "editing" || state === "saving") {
    return (
      <div className="px-2 py-1 rounded border border-[#4A90D9] bg-white flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="date"
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
        {state === "saving" && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4A90D9] animate-pulse shrink-0" />
        )}
      </div>
    );
  }

  const display = fmtReachedOut(value);
  const isError = state === "error";
  return (
    <button
      type="button"
      onClick={enter}
      title={isError ? errorMsg ?? "Save failed." : "Click to set"}
      className={[
        "w-full text-left px-2 py-1.5 rounded text-[13px] transition-colors",
        isError
          ? "border border-[#EF4444]/60 bg-[#FEF2F2] text-[#EF4444]"
          : "border border-transparent hover:bg-[#F8F9FA] text-[#0A0A0B]",
      ].join(" ")}
    >
      <span className="inline-flex items-center gap-1.5">
        <span className={value == null ? "text-[#9CA3AF]" : "tabular-nums"}>
          {display}
        </span>
        {state === "saved" && (
          <Check className="w-3 h-3 text-[#34D399]" strokeWidth={2.5} />
        )}
      </span>
    </button>
  );
}

// ─── Stage cell (inline select with subtle color) ────────────────────────────

function StageCell({
  prospectId,
  value,
  disabled,
  onSaved,
}: {
  prospectId: string;
  value: ProspectStage;
  disabled: boolean;
  onSaved: (patch: Partial<ProspectRow>) => void;
}) {
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const color = STAGE_COLOR[value];

  const change = useCallback(
    async (next: ProspectStage) => {
      if (next === value) return;
      setSaving("saving");
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/admin/prospects/${prospectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: next }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setErrorMsg(data.error ?? "Save failed.");
          setSaving("error");
          return;
        }
        // Server may also stamp last_contacted_at on forward moves —
        // re-read from response to keep override in sync.
        const data = (await res.json()) as {
          prospect: { last_contacted_at: string | null };
        };
        onSaved({
          stage: next,
          last_contacted_at: data.prospect?.last_contacted_at ?? null,
        });
        setSaving("saved");
        setTimeout(() => setSaving("idle"), 900);
      } catch (err) {
        console.error("[StageCell] save threw:", err);
        setErrorMsg("Network error.");
        setSaving("error");
      }
    },
    [prospectId, value, onSaved],
  );

  // Converted/declined are not selectable from the inline dropdown —
  // those happen via Convert action / Archive on the detail page.
  if (disabled || value === "converted" || value === "declined") {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded text-[12px] font-semibold"
        style={{ color }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        {stageLabel[value]}
      </div>
    );
  }

  return (
    <div
      className={[
        "relative inline-flex items-center gap-1.5 px-2 py-1.5 rounded transition-colors hover:bg-[#F8F9FA]",
        saving === "error" ? "bg-[#FEF2F2] border border-[#EF4444]/60" : "",
      ].join(" ")}
      title={saving === "error" ? errorMsg ?? "Save failed." : ""}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <select
        value={value}
        onChange={(e) => change(e.target.value as ProspectStage)}
        disabled={saving === "saving"}
        className="appearance-none bg-transparent text-[12px] font-semibold focus:outline-none focus:underline cursor-pointer pr-2"
        style={{ color }}
      >
        {INLINE_STAGE_OPTIONS.map((s) => (
          <option key={s} value={s} className="text-[#0A0A0B]">
            {stageLabel[s]}
          </option>
        ))}
      </select>
      {saving === "saving" && (
        <Loader2 className="w-3 h-3 animate-spin text-[#4A90D9]" />
      )}
      {saving === "saved" && (
        <Check className="w-3 h-3 text-[#34D399]" strokeWidth={2.5} />
      )}
    </div>
  );
}

// Stage labels exposed in this module for completeness.
// Underscore to silence the "PROSPECT_STAGES imported but unused" lint
// in dev — referenced indirectly via the canonical enum surface.
void PROSPECT_STAGES;
