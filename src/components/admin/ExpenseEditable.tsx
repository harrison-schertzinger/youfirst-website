"use client";

import { useState, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2 } from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  expenseCategoryMeta,
  type ExpenseCategory,
} from "@/lib/expense-categories";
import VendorDatalist, {
  VENDOR_DATALIST_ID,
} from "@/components/admin/VendorDatalist";

interface EditableExpense {
  id: string;
  expense_date: string;
  category: ExpenseCategory;
  description: string;
  amount_cents: number;
  vendor: string | null;
  tournament_id: string | null;
  player_id: string | null;
  notes: string | null;
}

interface TournamentOption {
  id: string;
  name: string;
}

interface PlayerOption {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
}

interface Props {
  initial: EditableExpense;
  tournaments: TournamentOption[];
  players: PlayerOption[];
  archived: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export default function ExpenseEditable({
  initial,
  tournaments,
  players,
  archived,
}: Props) {
  const router = useRouter();
  const [current, setCurrent] = useState<EditableExpense>(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    expense_date: current.expense_date,
    category: current.category,
    description: current.description,
    dollars: (current.amount_cents / 100).toFixed(2),
    vendor: current.vendor ?? "",
    tournament_id: current.tournament_id ?? "",
    player_id: current.player_id ?? "",
    notes: current.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tournamentName =
    tournaments.find((t) => t.id === current.tournament_id)?.name ?? null;
  const player = players.find((p) => p.id === current.player_id) ?? null;

  const playersByYear = new Map<string, PlayerOption[]>();
  for (const p of players) {
    const key = p.graduation_year != null ? String(p.graduation_year) : "—";
    const bucket = playersByYear.get(key) ?? [];
    bucket.push(p);
    playersByYear.set(key, bucket);
  }
  const yearKeys = [...playersByYear.keys()].sort();

  const enterEdit = useCallback(() => {
    setDraft({
      expense_date: current.expense_date,
      category: current.category,
      description: current.description,
      dollars: (current.amount_cents / 100).toFixed(2),
      vendor: current.vendor ?? "",
      tournament_id: current.tournament_id ?? "",
      player_id: current.player_id ?? "",
      notes: current.notes ?? "",
    });
    setError(null);
    setFieldError(null);
    setEditing(true);
  }, [current]);

  const cancel = () => {
    setEditing(false);
    setError(null);
    setFieldError(null);
  };

  const save = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      setError(null);
      setFieldError(null);

      const d = Number(draft.dollars);
      if (!draft.dollars.trim() || !Number.isFinite(d) || d <= 0) {
        setFieldError("amount: must be a positive dollar value");
        return;
      }
      if (d > 50_000) {
        setFieldError("amount: cannot exceed $50,000");
        return;
      }
      if (!draft.description.trim()) {
        setFieldError("description: required");
        return;
      }

      setSubmitting(true);
      try {
        const payload = {
          expense_date: draft.expense_date,
          category: draft.category,
          description: draft.description.trim(),
          amount_cents: Math.round(d * 100),
          vendor: draft.vendor.trim() || null,
          tournament_id: draft.tournament_id || null,
          player_id: draft.player_id || null,
          notes: draft.notes.trim() || null,
        };
        const res = await fetch(`/api/admin/expenses/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.status === 400) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            field?: string;
          };
          setFieldError(
            data.field
              ? `${data.field}: ${data.error ?? "invalid value"}`
              : (data.error ?? "Validation failed."),
          );
          setSubmitting(false);
          return;
        }
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? "Save failed.");
          setSubmitting(false);
          return;
        }
        // Reflect locally + refresh server tree (page header etc.).
        setCurrent({
          ...current,
          ...payload,
        });
        setEditing(false);
        router.refresh();
      } catch (err) {
        console.error("[ExpenseEditable] save threw:", err);
        setError("Network error.");
      } finally {
        setSubmitting(false);
      }
    },
    [current, draft, router, submitting],
  );

  const playerDisplay = player
    ? `${player.first_name} ${player.last_name}${
        player.graduation_year ? ` · ${player.graduation_year}` : ""
      }`
    : null;
  const meta = expenseCategoryMeta[current.category];

  return (
    <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 md:p-7">
      <header className="flex items-start justify-between gap-3 mb-5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
            Expense
          </div>
          <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-[#0A0A0B]">
            {editing ? "Editing — save or cancel below" : "Details"}
          </h2>
        </div>
        {!editing && !archived && (
          <button
            type="button"
            onClick={enterEdit}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#4A90D9] hover:bg-[#4A90D9]/[0.08] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </header>

      {editing ? (
        <form onSubmit={save} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Labeled label="Date">
              <input
                type="date"
                value={draft.expense_date}
                onChange={(e) =>
                  setDraft({ ...draft, expense_date: e.target.value })
                }
                className={inputClass()}
              />
            </Labeled>
            <Labeled label="Category">
              <select
                value={draft.category}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    category: e.target.value as ExpenseCategory,
                  })
                }
                className={inputClass()}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {expenseCategoryMeta[c].text}
                  </option>
                ))}
              </select>
            </Labeled>
            <Labeled label="Description" className="sm:col-span-2">
              <input
                type="text"
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                maxLength={300}
                className={inputClass()}
              />
            </Labeled>
            <Labeled label="Amount (USD)">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={draft.dollars}
                onChange={(e) => setDraft({ ...draft, dollars: e.target.value })}
                className={inputClass()}
              />
            </Labeled>
            <Labeled label="Vendor">
              <input
                type="text"
                value={draft.vendor}
                onChange={(e) => setDraft({ ...draft, vendor: e.target.value })}
                list={VENDOR_DATALIST_ID}
                autoComplete="off"
                className={inputClass()}
              />
              <VendorDatalist />
            </Labeled>
            <Labeled label="Tournament">
              <select
                value={draft.tournament_id}
                onChange={(e) =>
                  setDraft({ ...draft, tournament_id: e.target.value })
                }
                className={inputClass()}
              >
                <option value="">None (club-wide)</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Labeled>
            <Labeled label="Player">
              <select
                value={draft.player_id}
                onChange={(e) =>
                  setDraft({ ...draft, player_id: e.target.value })
                }
                className={inputClass()}
              >
                <option value="">None</option>
                {yearKeys.map((year) => (
                  <optgroup key={year} label={`Class of ${year}`}>
                    {(playersByYear.get(year) ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Labeled>
            <Labeled label="Notes" className="sm:col-span-2">
              <textarea
                rows={3}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className={`${inputClass()} resize-y min-h-[80px]`}
              />
            </Labeled>
          </div>

          {(fieldError || error) && (
            <p role="alert" className="text-[12px] text-[#EF4444]">
              {fieldError ?? error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={cancel}
              disabled={submitting}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#6B7280] hover:text-[#0A0A0B] disabled:opacity-60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      ) : (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-[13px]">
          <ViewRow label="Date" value={formatDate(current.expense_date)} />
          <ViewRow
            label="Category"
            value={
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.08em] text-white"
                style={{ backgroundColor: meta.color }}
              >
                {meta.text}
              </span>
            }
          />
          <ViewRow
            label="Description"
            value={current.description}
            className="sm:col-span-2"
          />
          <ViewRow label="Amount" value={formatDollars(current.amount_cents)} />
          <ViewRow label="Vendor" value={current.vendor ?? "—"} />
          <ViewRow
            label="Tournament"
            value={tournamentName ?? "Club-wide (no tournament)"}
          />
          <ViewRow label="Player" value={playerDisplay ?? "—"} />
          {current.notes && (
            <ViewRow
              label="Notes"
              value={current.notes}
              className="sm:col-span-2"
            />
          )}
        </dl>
      )}
    </section>
  );
}

function Labeled({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block text-[10px] font-medium uppercase tracking-wider text-[#6B7280] mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function ViewRow({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[#0A0A0B]">{value}</dd>
    </div>
  );
}

function inputClass(): string {
  return "w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[14px] text-[#0A0A0B] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition-colors";
}
