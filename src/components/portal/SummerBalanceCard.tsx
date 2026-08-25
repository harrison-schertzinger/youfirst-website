"use client";

import { useRef, useState } from "react";
import {
  formatCents,
  quarterCount,
  type PlayerBalanceRow,
} from "@/lib/portal-balance";
import { useIsPreview } from "./PaymentDashboard";

/**
 * The summer balance surface.
 *
 * Same card language as every other card on this page — dark gradient header,
 * white body, identical type scale and button styling. What changed is the
 * numbers: charged, paid and remaining are three separate labeled values, and
 * the bar shows where she stands. A parent never has to do arithmetic.
 *
 * The season is over, so there is no due date here and nothing is ever labeled
 * overdue or late.
 *
 * Every figure arrives from `player_balances()` — this component does no money
 * math beyond reading the fields it is handed.
 */
export default function SummerBalanceCard({
  playerId,
  balance,
}: {
  playerId: string;
  balance: PlayerBalanceRow;
}) {
  const [loading, setLoading] = useState<"full" | "quarter" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const isPreview = useIsPreview();

  const settled = balance.is_settled;
  const overpaid = balance.overpaid_cents > 0;
  const hasAdjustment = balance.adjustment_cents > 0;
  const quarters = quarterCount(balance);

  // Bar width only — not a money figure. Clamped so paid + adjusted can never
  // overflow the track.
  const percentAdjusted =
    balance.charged_cents > 0
      ? Math.min(
          Math.round((100 * balance.adjustment_cents) / balance.charged_cents),
          100 - balance.percent_paid,
        )
      : 0;

  // Semantic green is the portal's established "settled" colour.
  const gradientEnd = settled ? "#34D399" : "#4A90D9";
  const gradient = `linear-gradient(135deg, #0A0A0B 0%, #1A1D24 45%, ${gradientEnd} 100%)`;

  async function startCheckout(intent: "full" | "quarter") {
    if (inFlightRef.current) return;
    // Preview screen: the player id is synthetic. This card has its own
    // checkout call and was missed when the other three were guarded.
    if (isPreview) {
      setErrorMsg("Preview only — checkout is disabled on this screen.");
      return;
    }
    inFlightRef.current = true;
    setLoading(intent);
    setErrorMsg(null);
    try {
      // Only the intent is sent. The amount is re-derived server-side from
      // player_balances() — the browser cannot influence what is charged.
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, category: "summer", intent }),
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
    setLoading(null);
    inFlightRef.current = false;
  }

  return (
    <article
      className={[
        "group relative rounded-2xl overflow-hidden bg-white transition-all md:col-span-2",
        "shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)]",
        settled ? "opacity-75 saturate-[0.6]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* ── TOP HALF: gradient ──────────────────────────────────────── */}
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

        {settled && (
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
          Summer Tuition
        </div>
        <h3
          className="relative mt-1.5 text-[22px] sm:text-[24px] font-bold text-white leading-[1.05] tracking-tight uppercase"
          style={{ letterSpacing: "0.01em" }}
        >
          {balance.season ? `Summer ${balance.season}` : "Summer Tuition"}
        </h3>
      </div>

      {/* ── BOTTOM HALF: the progress surface ───────────────────────── */}
      <div className="bg-white p-6">
        {/* Progress bar. The fill is paid / charged, exactly as specified — for
            every family with no adjustment (all but one today) that is the
            whole bar. When a balance HAS been released, the released share is
            drawn as its own segment in the adjustment colour, so the bar can
            never read "3% paid" above a card that says PAID IN FULL. Widths
            only; every figure still comes from player_balances(). */}
        <div
          className="flex h-2.5 w-full rounded-full bg-[#E5E7EB] overflow-hidden"
          role="progressbar"
          aria-valuenow={balance.percent_paid}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Summer tuition paid"
        >
          <div
            className="h-full transition-[width] duration-700 ease-out"
            style={{
              width: `${balance.percent_paid}%`,
              backgroundColor: "#34D399",
            }}
          />
          {hasAdjustment && (
            <div
              className="h-full transition-[width] duration-700 ease-out"
              style={{ width: `${percentAdjusted}%`, backgroundColor: "#4A90D9" }}
            />
          )}
        </div>
        <div className="mt-2 text-[11px] font-semibold tabular-nums text-[#6B7280]">
          {balance.percent_paid}% paid
          {hasAdjustment && ` · ${percentAdjusted}% adjusted`}
        </div>

        {/* Three labeled numbers — no arithmetic required */}
        <dl className="mt-5 grid grid-cols-3 gap-3">
          <div>
            <dt className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
              Charged
            </dt>
            <dd className="mt-1 text-[18px] sm:text-xl font-bold tabular-nums leading-none text-[#1A1A1A]">
              {formatCents(balance.charged_cents)}
            </dd>
          </div>
          <div>
            <dt className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
              Paid
            </dt>
            <dd className="mt-1 text-[18px] sm:text-xl font-bold tabular-nums leading-none text-[#34D399]">
              {formatCents(balance.paid_cents)}
            </dd>
          </div>
          <div>
            <dt className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
              {overpaid ? "Overpaid" : "Remaining"}
            </dt>
            <dd
              className={`mt-1 text-[18px] sm:text-xl font-bold tabular-nums leading-none ${
                overpaid
                  ? "text-[#4A90D9]"
                  : balance.remaining_cents > 0
                    ? "text-[#1A1A1A]"
                    : "text-[#9CA3AF]"
              }`}
            >
              {formatCents(
                overpaid ? balance.overpaid_cents : balance.remaining_cents,
              )}
            </dd>
          </div>
        </dl>

        {/* Adjustment — never let a balance drop without saying why */}
        {hasAdjustment && (
          <div className="mt-5 flex items-start justify-between gap-3 rounded-xl border border-[#4A90D9]/20 bg-[#4A90D9]/5 px-4 py-3">
            <div className="min-w-0">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#4A90D9]">
                Adjustment
              </div>
              <p className="mt-1 text-[13px] leading-snug text-[#1A1A1A]">
                {balance.adjustment_reason}
              </p>
            </div>
            <div className="shrink-0 text-[15px] font-bold tabular-nums text-[#4A90D9]">
              −{formatCents(balance.adjustment_cents)}
            </div>
          </div>
        )}

        {/* Action */}
        {overpaid ? (
          <div className="mt-5 rounded-xl border border-[#4A90D9]/25 bg-[#4A90D9]/5 px-4 py-4 text-center">
            <p className="text-[13px] font-semibold text-[#1A1A1A]">
              You’ve paid {formatCents(balance.overpaid_cents)} more than the
              season total.
            </p>
            <p className="mt-1 text-[12px] text-[#6B7280]">
              Nothing is due. We’ll be in touch to settle the difference — or
              use the box below and we’ll sort it out.
            </p>
          </div>
        ) : settled ? (
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
          <div className="mt-5 space-y-3">
            {/* PRIMARY — pay the whole remaining balance */}
            <button
              type="button"
              onClick={() => startCheckout("full")}
              disabled={loading !== null}
              className={[
                "flex items-center justify-center gap-2 w-full min-h-[48px] px-4 rounded-xl",
                "text-[12px] font-bold uppercase tracking-[0.12em] text-white transition-all",
                "hover:-translate-y-0.5 active:translate-y-0",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                "bg-[#4A90D9] hover:bg-[#3A7BC0] shadow-[0_4px_14px_rgba(74,144,217,0.3)] hover:shadow-[0_8px_24px_rgba(74,144,217,0.5)]",
              ].join(" ")}
            >
              {loading === "full" ? (
                "Redirecting..."
              ) : (
                <>
                  Pay {formatCents(balance.remaining_cents)}
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

            {/* SECONDARY — only when a quarter is a true fraction of the
                remainder. Suppressed entirely otherwise, so a parent is never
                shown an amount that isn't hers. */}
            {balance.quarter_eligible && (
              <>
                <button
                  type="button"
                  onClick={() => startCheckout("quarter")}
                  disabled={loading !== null}
                  className={[
                    "flex items-center justify-center gap-2 w-full min-h-[48px] px-4 rounded-xl",
                    "text-[12px] font-bold uppercase tracking-[0.12em] transition-all",
                    "border border-[#4A90D9]/30 text-[#4A90D9] bg-white",
                    "hover:bg-[#4A90D9]/5 disabled:opacity-60 disabled:cursor-not-allowed",
                  ].join(" ")}
                >
                  {loading === "quarter"
                    ? "Redirecting..."
                    : `Pay ${formatCents(balance.quarter_cents)} Now`}
                </button>
                <p className="text-center text-[11px] leading-snug text-[#6B7280]">
                  Or split the remainder into {quarters} payments of{" "}
                  {formatCents(balance.quarter_cents)}.
                </p>
              </>
            )}

            {errorMsg && (
              <p className="text-center text-[12px] text-[#EF4444]">
                {errorMsg}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
