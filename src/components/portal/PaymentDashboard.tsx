"use client";

import { createContext, useContext } from "react";

import { useRef, useState } from "react";
import {
  buildRosterTicket,
  buildSummerPaymentLines,
  type PaymentTicket,
  type PortalPayment,
} from "@/lib/portal-tickets";
import { formatCents, type PlayerBalanceRow } from "@/lib/portal-balance";
import SummerBalanceCard from "./SummerBalanceCard";
import BalanceQuestion from "./BalanceQuestion";

/**
 * True on the admin preview screen. Consumed by every card that can start a
 * checkout, so synthetic data cannot reach Stripe.
 */
const PreviewContext = createContext(false);
export function useIsPreview() {
  return useContext(PreviewContext);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatShortDate(iso: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? new Date(`${iso}T12:00:00`)
    : new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Roster ticket card ─────────────────────────────────────────────────────
// Unchanged card language. The roster fee was always settled by money
// received, so it was always honest — the only change is that the value under
// "Amount Paid" is now the money received rather than the ticket's face value.

function TicketCard({ ticket }: { ticket: PaymentTicket }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const isPaid = ticket.status === "paid";

  const gradient =
    "linear-gradient(135deg, #0A0A0B 0%, #1A1D24 45%, #4A90D9 100%)";

  const isPreview = useIsPreview();

  async function handlePay() {
    if (inFlightRef.current) return;
    // Preview screen: synthetic ids must never reach Stripe.
    if (isPreview) {
      setErrorMsg("Preview only — checkout is disabled on this screen.");
      return;
    }
    inFlightRef.current = true;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: ticket.playerId,
          category: ticket.category,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setErrorMsg(
        typeof data.error === "string"
          ? data.error
          : "Couldn't start checkout. Please try again.",
      );
    } catch {
      setErrorMsg("Network error. Please try again.");
    }
    setLoading(false);
    inFlightRef.current = false;
  }

  return (
    <article
      className={[
        "group relative rounded-2xl overflow-hidden bg-white transition-all",
        "shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)]",
        isPaid ? "opacity-75 saturate-[0.6]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="relative h-40 p-6 flex flex-col justify-end"
        style={{ background: gradient }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              "radial-gradient(circle at 85% 15%, rgba(255,255,255,0.18) 0%, transparent 55%)",
          }}
        />
        {isPaid && (
          <div
            aria-hidden="true"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/25"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        )}
        <div className="relative text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
          You. First Elite
        </div>
        <h3
          className="relative mt-1.5 text-[22px] sm:text-[24px] font-bold text-white leading-[1.05] tracking-tight uppercase"
          style={{ letterSpacing: "0.01em" }}
        >
          Roster Fee
        </h3>
      </div>

      <div className="bg-white p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
              {isPaid ? "Amount Paid" : "Amount Due"}
            </div>
            <div
              className={`mt-1 text-2xl font-bold tabular-nums leading-none ${
                isPaid ? "text-[#34D399]" : "text-[#1A1A1A]"
              }`}
            >
              {formatCents(isPaid ? ticket.paidCents : ticket.amountCents)}
            </div>
            <div className="mt-2 text-[12px] text-[#6B7280] tabular-nums">
              {isPaid && ticket.paidDate
                ? `Received ${formatShortDate(ticket.paidDate)}`
                : "Season roster fee"}
            </div>
          </div>
          <StatusBadge status={ticket.status} />
        </div>

        {isPaid ? (
          <div className="mt-5 flex items-center justify-center gap-2 w-full min-h-[48px] px-4 rounded-xl border border-[#34D399]/25 bg-[#34D399]/5 text-[#34D399] text-[12px] font-bold uppercase tracking-[0.12em]">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Paid in Full
          </div>
        ) : (
          <button
            type="button"
            onClick={handlePay}
            disabled={loading}
            className={[
              "mt-5 flex items-center justify-center gap-2 w-full min-h-[48px] px-4 rounded-xl",
              "text-[12px] font-bold uppercase tracking-[0.12em] text-white transition-all",
              "hover:-translate-y-0.5 active:translate-y-0",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              "bg-[#4A90D9] hover:bg-[#3A7BC0] shadow-[0_4px_14px_rgba(74,144,217,0.3)] hover:shadow-[0_8px_24px_rgba(74,144,217,0.5)]",
            ].join(" ")}
          >
            {loading ? (
              "Redirecting..."
            ) : errorMsg ? (
              <span className="text-white text-[11px] normal-case tracking-normal">
                {errorMsg} · Tap to retry
              </span>
            ) : (
              <>
                Pay {formatCents(ticket.amountCents)}
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </>
            )}
          </button>
        )}
      </div>
    </article>
  );
}

// ─── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PaymentTicket["status"] }) {
  if (status === "paid") {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#34D399]/10 text-[#34D399]">
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Paid
      </span>
    );
  }
  return (
    <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#4A90D9]/10 text-[#4A90D9]">
      Due
    </span>
  );
}

// ─── Charge line item ─────────────────────────────────────────────────────────

export interface PortalChargeLine {
  id: string;
  label: string;
  amount_cents: number;
  status: "open" | "paid" | "void";
  paid_at: string | null;
}

function ChargeCard({ charge }: { charge: PortalChargeLine }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const isPaid = charge.status === "paid";

  const gradient =
    "linear-gradient(135deg, #0A0A0B 0%, #1A1D24 45%, #7C5CFB 100%)";

  const isPreview = useIsPreview();

  async function handlePay() {
    if (inFlightRef.current) return;
    // Preview screen: synthetic ids must never reach Stripe.
    if (isPreview) {
      setErrorMsg("Preview only — checkout is disabled on this screen.");
      return;
    }
    inFlightRef.current = true;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/portal/charge-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ charge_id: charge.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setErrorMsg(
        typeof data.error === "string"
          ? data.error
          : "Couldn't start checkout. Please try again.",
      );
    } catch {
      setErrorMsg("Network error. Please try again.");
    }
    setLoading(false);
    inFlightRef.current = false;
  }

  return (
    <article
      className={[
        "group relative rounded-2xl overflow-hidden bg-white transition-all",
        "shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)]",
        isPaid ? "opacity-75 saturate-[0.6]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="relative h-40 p-6 flex flex-col justify-end"
        style={{ background: gradient }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              "radial-gradient(circle at 85% 15%, rgba(255,255,255,0.18) 0%, transparent 55%)",
          }}
        />
        {isPaid && (
          <div
            aria-hidden="true"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/25"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        )}
        <div className="relative text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
          One-Off Charge
        </div>
        <h3 className="relative mt-1.5 text-[20px] sm:text-[22px] font-bold text-white leading-[1.1] tracking-tight">
          {charge.label}
        </h3>
      </div>

      <div className="bg-white p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
              {isPaid ? "Amount Paid" : "Amount Due"}
            </div>
            <div
              className={`mt-1 text-2xl font-bold tabular-nums leading-none ${
                isPaid ? "text-[#34D399]" : "text-[#1A1A1A]"
              }`}
            >
              {formatCents(charge.amount_cents)}
            </div>
            {isPaid && charge.paid_at && (
              <div className="mt-2 text-[12px] text-[#6B7280] tabular-nums">
                Received {formatShortDate(charge.paid_at)}
              </div>
            )}
          </div>
          {isPaid ? (
            <StatusBadge status="paid" />
          ) : (
            <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#7C5CFB]/10 text-[#7C5CFB]">
              Due
            </span>
          )}
        </div>

        {isPaid ? (
          <div className="mt-5 flex items-center justify-center gap-2 w-full min-h-[48px] px-4 rounded-xl border border-[#34D399]/25 bg-[#34D399]/5 text-[#34D399] text-[12px] font-bold uppercase tracking-[0.12em]">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Paid in Full
          </div>
        ) : (
          <button
            type="button"
            onClick={handlePay}
            disabled={loading}
            className={[
              "mt-5 flex items-center justify-center gap-2 w-full min-h-[48px] px-4 rounded-xl",
              "text-[12px] font-bold uppercase tracking-[0.12em] text-white transition-all",
              "hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed",
              "bg-[#7C5CFB] hover:bg-[#6A47F0] shadow-[0_4px_14px_rgba(124,92,251,0.3)] hover:shadow-[0_8px_24px_rgba(124,92,251,0.5)]",
            ].join(" ")}
          >
            {loading ? (
              "Redirecting..."
            ) : errorMsg ? (
              <span className="text-white text-[11px] normal-case tracking-normal">
                {errorMsg} · Tap to retry
              </span>
            ) : (
              <>
                Pay {formatCents(charge.amount_cents)}
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </>
            )}
          </button>
        )}
      </div>
    </article>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function PaymentDashboard({
  playerId,
  playerFirstName,
  payments,
  balance,
  charges = [],
  preview = false,
}: {
  playerId: string;
  playerFirstName: string;
  payments: PortalPayment[];
  balance: PlayerBalanceRow | null;
  charges?: PortalChargeLine[];
  /**
   * Renders against synthetic data on the admin preview screen. Every checkout
   * call is short-circuited: a click here must never reach Stripe with a
   * player id that does not exist.
   */
  preview?: boolean;
}) {
  // Everything below renders inside PreviewContext (see the return).
  const rosterTicket = buildRosterTicket(playerId, payments);
  const summerLines = buildSummerPaymentLines(payments);
  const visibleCharges = charges.filter((c) => c.status !== "void");

  // Totals in cents. The summer figures come straight from player_balances();
  // nothing here re-derives a balance.
  const summerCharged = balance?.charged_cents ?? 0;
  const summerPaid = balance?.paid_cents ?? 0;
  const summerRemaining = balance?.remaining_cents ?? 0;

  const rosterRemaining =
    rosterTicket.status === "paid"
      ? 0
      : Math.max(0, rosterTicket.amountCents - rosterTicket.paidCents);

  const chargeCharged = visibleCharges.reduce((s, c) => s + c.amount_cents, 0);
  const chargePaid = visibleCharges
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + c.amount_cents, 0);
  const chargeRemaining = chargeCharged - chargePaid;

  // A released amount reduces what she was charged, so the strip reconciles:
  // charged − paid − adjustment = remaining. Without netting the adjustment out
  // of `totalCharged`, an adjusted family saw a summary whose three numbers did
  // not add up.
  const summerAdjustment = balance?.adjustment_cents ?? 0;
  const totalCharged =
    summerCharged - summerAdjustment + rosterTicket.amountCents + chargeCharged;
  const totalPaid = summerPaid + rosterTicket.paidCents + chargePaid;
  const totalRemaining = summerRemaining + rosterRemaining + chargeRemaining;

  return (
    <PreviewContext.Provider value={preview}>
    <div className="max-w-2xl mx-auto mt-12">
      <p className="section-label mb-6">Payments</p>

      {/* Summary strip — money in, money owed. Never a counter. */}
      <div className="mb-6 text-sm text-[#6B7280]">
        {totalRemaining > 0 ? (
          <span>
            <span className="font-semibold text-[#1A1A1A]">
              {formatCents(totalRemaining)}
            </span>{" "}
            remaining of{" "}
            <span className="font-semibold text-[#1A1A1A]">
              {formatCents(totalCharged)}
            </span>{" "}
            · {formatCents(totalPaid)} received
          </span>
        ) : (
          <span className="font-semibold text-[#34D399]">
            All payments are settled — nothing due.
          </span>
        )}
      </div>

      {/* Cards — summer balance surface spans the grid, roster beside it */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {balance && (
          <SummerBalanceCard playerId={playerId} balance={balance} />
        )}
        <TicketCard ticket={rosterTicket} />
      </div>

      {/* Summer Payments — titled so nothing is implied that isn't shown.
          Fall money is deliberately not on this page. */}
      {summerLines.length > 0 && (
        <div className="mt-10">
          <p className="section-label mb-4">Summer Payments</p>
          <ul className="rounded-xl border border-[#E5E7EB] bg-white divide-y divide-[#E5E7EB] overflow-hidden">
            {summerLines.map((line) => (
              <li
                key={line.id}
                className="flex items-center justify-between gap-3 px-5 py-3.5"
              >
                <span className="text-[13px] text-[#1A1A1A]">{line.label}</span>
                <span className="text-[14px] font-semibold tabular-nums text-[#34D399]">
                  {formatCents(line.amountCents)}
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 bg-[#F9FAFB] px-5 py-3.5">
              <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                Total received
              </span>
              <span className="text-[15px] font-bold tabular-nums text-[#1A1A1A]">
                {formatCents(summerPaid)}
              </span>
            </li>
          </ul>
        </div>
      )}

      {/* One-off charges — separate from the season */}
      {visibleCharges.length > 0 && (
        <div className="mt-10">
          <p className="section-label mb-6">One-Off Charges</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleCharges.map((charge) => (
              <ChargeCard key={charge.id} charge={charge} />
            ))}
          </div>
        </div>
      )}

      {/* The correction channel */}
      <BalanceQuestion playerId={playerId} playerFirstName={playerFirstName} />
    </div>
    </PreviewContext.Provider>
  );
}
