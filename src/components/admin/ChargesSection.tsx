"use client";

import { useCallback, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Receipt } from "lucide-react";

export interface AdminCharge {
  id: string;
  label: string;
  amount_cents: number;
  season: string | null;
  status: "open" | "paid" | "void";
  paid_at: string | null;
  created_at: string | null;
}

function formatDollarsExact(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_STYLE: Record<AdminCharge["status"], string> = {
  open: "bg-[#4A90D9]/10 text-[#4A90D9]",
  paid: "bg-[#34D399]/10 text-[#34D399]",
  void: "bg-[#F0F1F3] text-[#9CA3AF] line-through",
};

export default function ChargesSection({
  playerId,
  playerName,
  initialCharges,
}: {
  playerId: string;
  playerName: string;
  initialCharges: AdminCharge[];
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [dollars, setDollars] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);

  const charges = initialCharges;

  const addCharge = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      setError(null);

      const d = Number(dollars);
      if (!dollars.trim() || !Number.isFinite(d) || d <= 0) {
        setError("Amount must be a positive dollar value (e.g. 400).");
        return;
      }
      if (d > 10_000) {
        setError("Amount cannot exceed $10,000.");
        return;
      }
      if (!label.trim() || label.trim().length > 200) {
        setError("Label is required (1–200 characters).");
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch(`/api/admin/players/${playerId}/charges`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: label.trim(),
            amount_cents: Math.round(d * 100),
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? "Couldn’t add the charge.");
          setSubmitting(false);
          return;
        }
        setLabel("");
        setDollars("");
        router.refresh();
      } catch (err) {
        console.error("[ChargesSection] add threw:", err);
        setError("Network error. Try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [dollars, label, playerId, router, submitting],
  );

  const voidCharge = useCallback(
    async (chargeId: string) => {
      if (voidingId) return;
      setVoidingId(chargeId);
      try {
        const res = await fetch(
          `/api/admin/players/${playerId}/charges/${chargeId}`,
          { method: "DELETE" },
        );
        if (res.ok) router.refresh();
        else {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? "Couldn’t void the charge.");
        }
      } catch (err) {
        console.error("[ChargesSection] void threw:", err);
        setError("Network error. Try again.");
      } finally {
        setVoidingId(null);
      }
    },
    [playerId, router, voidingId],
  );

  return (
    <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 md:p-7 space-y-6">
      <header>
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
          One-Off Charges
        </div>
        <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-[#0A0A0B]">
          Charge {playerName} for something extra
        </h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Adds a payable line item to the parent portal, separate from the
          season plan. The parent pays it with one tap; Stripe records it
          automatically.
        </p>
      </header>

      {/* Add form */}
      <form
        onSubmit={addCharge}
        noValidate
        className="rounded-xl border border-[#E5E7EB] p-5 space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
          <label className="block">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-[#6B7280] mb-1">
              Label
            </span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Missed 2 tournaments"
              maxLength={200}
              required
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-[13px] text-[#0A0A0B] placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition-colors"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-[#6B7280] mb-1">
              Amount (USD)
            </span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] text-[13px] pointer-events-none">
                $
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={dollars}
                onChange={(e) => setDollars(e.target.value)}
                placeholder="400"
                required
                className="w-full bg-white border border-[#E5E7EB] rounded-lg pl-6 pr-2.5 py-1.5 text-[13px] text-[#0A0A0B] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition-colors"
              />
            </div>
          </label>
        </div>

        {error && (
          <p role="alert" className="text-[12px] text-[#EF4444]">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {submitting ? "Adding…" : "Add Charge"}
          </button>
        </div>
      </form>

      {/* Existing charges */}
      {charges.length === 0 ? (
        <div className="flex items-center gap-2 text-[13px] text-[#6B7280]">
          <Receipt className="w-4 h-4" />
          No charges yet.
        </div>
      ) : (
        <ul className="divide-y divide-[#E5E7EB] rounded-xl border border-[#E5E7EB] overflow-hidden">
          {charges.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-[#0A0A0B] truncate">
                  {c.label}
                </div>
                <div className="text-[11px] text-[#6B7280]">
                  Added {fmtDate(c.created_at)}
                  {c.status === "paid" && c.paid_at
                    ? ` · Paid ${fmtDate(c.paid_at)}`
                    : ""}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[14px] font-bold tabular-nums text-[#0A0A0B]">
                  {formatDollarsExact(c.amount_cents)}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[c.status]}`}
                >
                  {c.status}
                </span>
                {c.status === "open" && (
                  <button
                    type="button"
                    onClick={() => voidCharge(c.id)}
                    disabled={voidingId === c.id}
                    className="text-[11px] font-semibold text-[#EF4444] hover:text-[#dc2626] disabled:opacity-50 transition-colors"
                  >
                    {voidingId === c.id ? "Voiding…" : "Void"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
