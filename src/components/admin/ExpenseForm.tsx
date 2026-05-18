"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  expenseCategoryMeta,
  type ExpenseCategory,
} from "@/lib/expense-categories";

export interface TournamentOption {
  id: string;
  name: string;
}

export interface PlayerOption {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
}

interface Props {
  tournaments: TournamentOption[];
  players: PlayerOption[];
  /** Pre-select a tournament (used when navigating from /admin/tournaments/[id]). */
  initialTournamentId?: string | null;
}

function todayLocalIso(): string {
  // Use the operator's local date — not UTC — so "Today" matches the calendar
  // they see on screen.
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function ExpenseForm({
  tournaments,
  players,
  initialTournamentId,
}: Props) {
  const router = useRouter();
  const [expenseDate, setExpenseDate] = useState(todayLocalIso());
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [description, setDescription] = useState("");
  const [dollars, setDollars] = useState("");
  const [vendor, setVendor] = useState("");
  const [tournamentId, setTournamentId] = useState<string>(
    initialTournamentId ?? "",
  );
  const [playerId, setPlayerId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Group players by graduation year for the <select> optgroup.
  const playersByYear = new Map<string, PlayerOption[]>();
  for (const p of players) {
    const key = p.graduation_year != null ? String(p.graduation_year) : "—";
    const bucket = playersByYear.get(key) ?? [];
    bucket.push(p);
    playersByYear.set(key, bucket);
  }
  const yearKeys = [...playersByYear.keys()].sort();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setBannerError(null);
    setFieldErrors({});

    // Client-side validation that mirrors the server.
    const errs: Record<string, string> = {};

    if (!description.trim()) errs.description = "Description is required.";
    else if (description.trim().length > 300)
      errs.description = "Description must be 1–300 characters.";

    const d = Number(dollars);
    if (!dollars.trim() || !Number.isFinite(d) || d <= 0)
      errs.amount_cents = "Amount must be a positive dollar value.";
    else if (d > 50_000)
      errs.amount_cents = "Amount cannot exceed $50,000.";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate))
      errs.expense_date = "Date must be YYYY-MM-DD.";

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expense_date: expenseDate,
          category,
          description: description.trim(),
          amount_cents: Math.round(d * 100),
          vendor: vendor.trim() || null,
          tournament_id: tournamentId || null,
          player_id: playerId || null,
          notes: notes.trim() || null,
        }),
      });
      if (res.status === 400) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          field?: string;
        };
        if (data.field) {
          setFieldErrors({ [data.field]: data.error ?? "Invalid value." });
        } else {
          setBannerError(data.error ?? "Some fields are invalid.");
        }
        setSubmitting(false);
        return;
      }
      if (res.status === 403) {
        setBannerError("You're not authorized to add expenses.");
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setBannerError(data.error ?? "Server error. Try again.");
        setSubmitting(false);
        return;
      }
      // Success — bounce to the list with a banner.
      router.push(
        `/admin/expenses?logged=${encodeURIComponent(description.trim().slice(0, 60))}`,
      );
    } catch (err) {
      console.error("[ExpenseForm] threw:", err);
      setBannerError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-8 space-y-8"
    >
      {bannerError && (
        <div className="rounded-lg border border-[#EF4444]/30 bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#EF4444]">
          {bannerError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Date" required error={fieldErrors.expense_date}>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
            className={inputClass(!!fieldErrors.expense_date)}
          />
        </Field>
        <Field label="Category" required error={fieldErrors.category}>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className={inputClass(!!fieldErrors.category)}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {expenseCategoryMeta[c].text}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Description"
          required
          error={fieldErrors.description}
          className="sm:col-span-2"
        >
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this expense?"
            maxLength={300}
            required
            className={inputClass(!!fieldErrors.description)}
          />
        </Field>
        <Field
          label="Amount (USD)"
          required
          error={fieldErrors.amount_cents}
        >
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] text-[14px] pointer-events-none">
              $
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={dollars}
              onChange={(e) => setDollars(e.target.value)}
              placeholder="0.00"
              required
              className={`${inputClass(!!fieldErrors.amount_cents)} pl-7`}
            />
          </div>
        </Field>
        <Field label="Vendor">
          <input
            type="text"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="Where did this come from?"
            className={inputClass(false)}
          />
        </Field>
        <Field label="Tournament">
          <select
            value={tournamentId}
            onChange={(e) => setTournamentId(e.target.value)}
            className={inputClass(false)}
          >
            <option value="">None (club-wide)</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Player">
          <select
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            className={inputClass(false)}
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
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional context."
            className={`${inputClass(false)} resize-y min-h-[80px]`}
          />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/expenses")}
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#6B7280] hover:text-[#0A0A0B] disabled:opacity-60 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {submitting ? "Logging…" : "Log Expense"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] mb-1.5">
        {label}
        {required && <span className="text-[#EF4444] ml-1">*</span>}
      </span>
      {children}
      {error && (
        <span role="alert" className="mt-1.5 block text-[11px] text-[#EF4444]">
          {error}
        </span>
      )}
    </label>
  );
}

function inputClass(hasError: boolean): string {
  return [
    "w-full bg-white border rounded-lg px-3 py-2 text-[14px] text-[#0A0A0B]",
    "placeholder:text-[#6B7280]/60",
    "focus:outline-none focus:ring-2 transition-colors",
    hasError
      ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20"
      : "border-[#E5E7EB] focus:border-[#4A90D9] focus:ring-[#4A90D9]/20",
  ].join(" ");
}
