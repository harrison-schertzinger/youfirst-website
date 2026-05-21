"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import type { ExpenseCategory } from "@/lib/expense-categories";

interface TournamentOption {
  id: string;
  name: string;
}

interface Props {
  category: ExpenseCategory;
  tournaments: TournamentOption[];
}

function todayLocalISO(): string {
  // YYYY-MM-DD in local time (matches the date pickers users see).
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function InlineExpenseAddRow({ category, tournaments }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayLocalISO());
  const [description, setDescription] = useState("");
  const [vendor, setVendor] = useState("");
  const [dollars, setDollars] = useState("");
  const [tournamentId, setTournamentId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setDate(todayLocalISO());
    setDescription("");
    setVendor("");
    setDollars("");
    setTournamentId("");
    setFieldError(null);
    setError(null);
  }, []);

  const submit = useCallback(async () => {
    setFieldError(null);
    setError(null);

    if (!description.trim()) {
      setFieldError({ field: "description", message: "Description is required." });
      return;
    }
    const d = Number(dollars);
    if (!dollars.trim() || !Number.isFinite(d) || d <= 0) {
      setFieldError({ field: "amount", message: "Amount must be > $0." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expense_date: date,
          category,
          description: description.trim(),
          amount_cents: Math.round(d * 100),
          vendor: vendor.trim() === "" ? null : vendor.trim(),
          tournament_id: tournamentId === "" ? null : tournamentId,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          field?: string;
        };
        if (data.field) {
          setFieldError({ field: data.field, message: data.error ?? "Invalid value." });
        } else {
          setError(data.error ?? "Failed to save.");
        }
        setSubmitting(false);
        return;
      }
      reset();
      router.refresh();
    } catch (err) {
      console.error("[InlineExpenseAddRow] threw:", err);
      setError("Network error.");
      setSubmitting(false);
    }
  }, [date, category, description, dollars, vendor, tournamentId, reset, router]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[13px] text-[#4A90D9] hover:underline inline-flex items-center gap-1"
      >
        <Plus className="w-3.5 h-3.5" />
        Add line
      </button>
    );
  }

  return (
    <div className="rounded-md border border-[#4A90D9]/40 bg-[#F8F9FA] p-3">
      <div className="grid grid-cols-12 gap-2 items-center">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={submitting}
          className={[
            "col-span-2 text-[12px] bg-white border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#4A90D9]",
            fieldError?.field === "expense_date" ? "border-[#EF4444]" : "border-[#E5E7EB]",
          ].join(" ")}
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          placeholder="Description"
          className={[
            "col-span-3 text-[12px] bg-white border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#4A90D9]",
            fieldError?.field === "description" ? "border-[#EF4444]" : "border-[#E5E7EB]",
          ].join(" ")}
        />
        <input
          type="text"
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          disabled={submitting}
          placeholder="Vendor"
          className="col-span-2 text-[12px] bg-white border border-[#E5E7EB] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#4A90D9]"
        />
        <div className="col-span-2 relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#6B7280] text-[12px]">
            $
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={dollars}
            onChange={(e) => setDollars(e.target.value)}
            disabled={submitting}
            placeholder="0.00"
            className={[
              "w-full text-[12px] bg-white border rounded pl-5 pr-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#4A90D9]",
              fieldError?.field === "amount" || fieldError?.field === "amount_cents"
                ? "border-[#EF4444]"
                : "border-[#E5E7EB]",
            ].join(" ")}
          />
        </div>
        <select
          value={tournamentId}
          onChange={(e) => setTournamentId(e.target.value)}
          disabled={submitting}
          className="col-span-3 text-[12px] bg-white border border-[#E5E7EB] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#4A90D9]"
        >
          <option value="">No tournament</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {(fieldError || error) && (
        <p role="alert" className="mt-2 text-[11px] text-[#EF4444]">
          {fieldError?.message ?? error}
        </p>
      )}

      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          disabled={submitting}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-[#6B7280] hover:text-[#0A0A0B] disabled:opacity-60 transition-colors"
        >
          <X className="w-3 h-3" />
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="inline-flex items-center gap-1 px-3 py-1 rounded bg-[#4A90D9] text-white text-[11px] font-semibold hover:bg-[#3A7BC8] disabled:opacity-60 transition-colors"
        >
          {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
          {submitting ? "Saving…" : "Save Line"}
        </button>
      </div>
    </div>
  );
}
