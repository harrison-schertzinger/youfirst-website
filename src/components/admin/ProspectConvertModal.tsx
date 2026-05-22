"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Shared convert-prospect modal. Used from the prospect detail page
 * (full-edit surface) and from the prospects spreadsheet's per-row
 * Convert action. The conversion API at /api/admin/prospects/[id]/convert
 * is the single source of truth for the actual conversion logic;
 * this component is pure UI.
 */

const PLAN_TYPES = [
  { value: "lump_sum", label: "Lump Sum (1 payment)" },
  { value: "monthly", label: "2 Payments (monthly)" },
  { value: "quarterly", label: "4 Payments (quarterly)" },
];

export interface ProspectForConvert {
  id: string;
  first_name: string;
  last_name: string;
  parent_email: string | null;
}

interface Props {
  prospect: ProspectForConvert;
  onClose: () => void;
  /** Called with the new player_id on success. Caller decides what to do
   *  (router.push to player profile, or refresh in place). */
  onConverted: (playerId: string) => void;
  /** Default season string — caller can override. */
  defaultSeason?: string;
}

export default function ProspectConvertModal({
  prospect,
  onClose,
  onConverted,
  defaultSeason = "2025-26",
}: Props) {
  const [planType, setPlanType] = useState("lump_sum");
  const [dollars, setDollars] = useState("");
  const [season, setSeason] = useState(defaultSeason);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const d = Number(dollars);
    if (!dollars.trim() || !Number.isFinite(d) || d < 0) {
      setError("Enter a non-negative dollar amount.");
      return;
    }
    if (d > 100_000) {
      setError("Amount cannot exceed $100,000.");
      return;
    }
    if (!season.trim()) {
      setError("Season is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/prospects/${prospect.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_type: planType,
          total_amount_cents: Math.round(d * 100),
          season: season.trim(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Conversion failed.");
        setSubmitting(false);
        return;
      }
      const data = (await res.json()) as { player_id: string };
      onConverted(data.player_id);
    } catch (err) {
      console.error("[ProspectConvertModal] threw:", err);
      setError("Network error.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !submitting && onClose()}
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
        <h3 className="text-[16px] font-semibold text-[#0A0A0B]">
          Convert {prospect.first_name} {prospect.last_name} to player
        </h3>
        <p className="mt-1 text-[12px] text-[#6B7280]">
          Creates the player + guardian rows, sets up a payment plan, and
          sends an invite to{" "}
          <span className="font-medium text-[#0A0A0B]">
            {prospect.parent_email}
          </span>
          .
        </p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] mb-1.5">
              Plan type
            </span>
            <select
              value={planType}
              onChange={(e) => setPlanType(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9]"
            >
              {PLAN_TYPES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] mb-1.5">
              Total amount (USD)
            </span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] text-[14px]">
                $
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={dollars}
                onChange={(e) => setDollars(e.target.value)}
                placeholder="3500"
                className="w-full bg-white border border-[#E5E7EB] rounded-lg pl-7 pr-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9]"
              />
            </div>
          </label>
          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] mb-1.5">
              Season
            </span>
            <input
              type="text"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9]"
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-[12px] text-[#EF4444]">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#6B7280] hover:text-[#0A0A0B] disabled:opacity-60 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#34D399] text-white text-[13px] font-semibold hover:bg-[#22B883] disabled:opacity-60 transition-colors"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitting ? "Converting…" : "Convert to Player"}
          </button>
        </div>
      </div>
    </div>
  );
}
