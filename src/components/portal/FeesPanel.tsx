"use client";

import { useRef, useState } from "react";
import { formatCents, type PlayerBalanceRow } from "@/lib/portal-balance";
import {
  buildPlan,
  formatDueDate,
  FINAL_DUE_DATE,
  type PlanChoice,
} from "@/lib/payment-plan";
import { useIsPreview } from "./PortalPreviewContext";
import type { PortalPayment } from "@/lib/portal-tickets";
import type { PortalCharge } from "./PortalContent";

/**
 * Fees.
 *
 * Replaces three stacked gradient hero cards. A parent opens this to answer one
 * question — what do I owe and how do I pay it — and the old surface spent most
 * of its height on decoration before answering. This is a dense panel: the
 * numbers first, then how to settle them.
 *
 * Every amount rendered here comes from player_balances(). Nothing on this page
 * computes money, and the browser cannot influence what Stripe charges — the
 * request carries an intent, never a figure, and /api/checkout re-derives the
 * cents server-side.
 */

const PLAN_LABELS: Record<PlanChoice, string> = {
  full: "Pay in full",
  half: "2 payments",
  quarter: "4 payments",
};

export default function FeesPanel({
  playerId,
  balance,
  payments,
  charges,
  rosterPaidCents,
  rosterDueCents,
}: {
  playerId: string;
  balance: PlayerBalanceRow | null;
  payments: PortalPayment[];
  charges: PortalCharge[];
  rosterPaidCents: number;
  rosterDueCents: number;
}) {
  const isPreview = useIsPreview();
  const [choice, setChoice] = useState<PlanChoice>("full");
  const [loading, setLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inFlight = useRef(false);

  const charged = balance?.charged_cents ?? 0;
  const paid = balance?.paid_cents ?? 0;
  const remaining = balance?.remaining_cents ?? 0;
  const settled = remaining <= 0;

  // Which plans can honestly be offered for this balance.
  const plans: Record<PlanChoice, ReturnType<typeof buildPlan>> = {
    full: buildPlan("full", charged, remaining),
    half: buildPlan("half", charged, remaining),
    quarter: buildPlan("quarter", charged, remaining),
  };
  const offered = (Object.keys(plans) as PlanChoice[]).filter((c) => plans[c]);
  const activePlan = plans[choice] ?? plans.full;

  async function pay(intent: PlanChoice, key: string) {
    if (inFlight.current) return;
    if (isPreview) {
      setErrorMsg("Preview only — checkout is disabled on this screen.");
      return;
    }
    inFlight.current = true;
    setLoading(key);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Intent only. The amount is re-derived server-side.
        body: JSON.stringify({ playerId, category: "summer", intent }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setErrorMsg(
        typeof data.error === "string" ? data.error : "Couldn’t start checkout.",
      );
    } catch {
      setErrorMsg("Network error. Please try again.");
    }
    setLoading(null);
    inFlight.current = false;
  }

  async function payRoster() {
    if (inFlight.current) return;
    if (isPreview) {
      setErrorMsg("Preview only — checkout is disabled on this screen.");
      return;
    }
    inFlight.current = true;
    setLoading("roster");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, category: "roster" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setErrorMsg(
        typeof data.error === "string" ? data.error : "Couldn’t start checkout.",
      );
    } catch {
      setErrorMsg("Network error. Please try again.");
    }
    setLoading(null);
    inFlight.current = false;
  }

  const summerPayments = payments.filter(
    (p) => p.payment_category === "summer" && p.status === "completed",
  );
  const fallPayments = payments.filter(
    (p) => p.payment_category === "fall" && p.status === "completed",
  );
  const openCharges = charges.filter((c) => c.status === "open");

  return (
    <section className="rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-baseline justify-between px-6 pt-5 pb-4 border-b border-[#F0F1F3]">
        <h2 className="text-[15px] font-semibold tracking-tight text-[#1A1A1A]">
          Fees
        </h2>
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#9CA3AF]">
          Season {balance?.season ?? "—"}
        </span>
      </div>

      {/* ── Season tuition ─────────────────────────────────────────────── */}
      <div className="px-6 py-5">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[13px] font-medium text-[#1A1A1A]">
            Summer tuition
          </span>
          {settled ? (
            <span className="text-[12px] font-semibold text-[#0F9D6E]">
              Paid in full
            </span>
          ) : (
            <span className="text-[13px] tabular-nums text-[#6B7280]">
              <span className="font-semibold text-[#1A1A1A]">
                {formatCents(remaining)}
              </span>{" "}
              left
            </span>
          )}
        </div>

        <div className="h-1.5 w-full rounded-full bg-[#F0F1F3] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#34D399] transition-all duration-500"
            style={{ width: `${balance?.percent_paid ?? 0}%` }}
          />
        </div>

        <dl className="mt-3 grid grid-cols-3 gap-2">
          {[
            ["Charged", charged, "#1A1A1A"],
            ["Paid", paid, "#0F9D6E"],
            ["Remaining", remaining, "#1A1A1A"],
          ].map(([label, cents, color]) => (
            <div key={label as string}>
              <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9CA3AF]">
                {label as string}
              </dt>
              <dd
                className="text-[16px] font-semibold tabular-nums"
                style={{ color: color as string }}
              >
                {formatCents(cents as number)}
              </dd>
            </div>
          ))}
        </dl>

        {/* ── Plan selector ────────────────────────────────────────────── */}
        {!settled && offered.length > 0 && (
          <div className="mt-5">
            <div className="inline-flex rounded-lg bg-[#F0F1F3] p-0.5">
              {offered.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChoice(c)}
                  className={`px-3 py-1.5 rounded-[6px] text-[12px] font-semibold transition-colors ${
                    choice === c
                      ? "bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                      : "text-[#6B7280] hover:text-[#1A1A1A]"
                  }`}
                >
                  {PLAN_LABELS[c]}
                </button>
              ))}
            </div>

            {activePlan && (
              <>
                <ol className="mt-3 divide-y divide-[#F0F1F3] border-y border-[#F0F1F3]">
                  {activePlan.installments.map((inst, i) => (
                    <li
                      key={inst.dueDate}
                      className="flex items-center justify-between py-2.5"
                    >
                      <span className="text-[12px] text-[#6B7280]">
                        {activePlan.installments.length > 1 && (
                          <span className="inline-block w-5 text-[#9CA3AF] tabular-nums">
                            {i + 1}.
                          </span>
                        )}
                        Due {formatDueDate(inst.dueDate)}
                      </span>
                      <span className="text-[13px] font-semibold tabular-nums text-[#1A1A1A]">
                        {formatCents(inst.amountCents)}
                      </span>
                    </li>
                  ))}
                </ol>

                <button
                  type="button"
                  onClick={() => pay(choice, choice)}
                  disabled={loading !== null}
                  className="mt-3 w-full px-4 py-2.5 rounded-xl bg-[#4B9CD3] text-white text-[13px] font-semibold hover:bg-[#3D87BC] disabled:opacity-60 transition-colors"
                >
                  {loading === choice
                    ? "Opening checkout…"
                    : `Pay ${formatCents(activePlan.installments[0].amountCents)} now`}
                </button>

                <p className="mt-2 text-[11.5px] leading-relaxed text-[#9CA3AF]">
                  {activePlan.installments.length > 1
                    ? `Each payment is made here when it comes due — nothing is charged automatically. Everything is settled by ${formatDueDate(FINAL_DUE_DATE)}.`
                    : `Everything is settled by ${formatDueDate(FINAL_DUE_DATE)}.`}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Roster fee ─────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-t border-[#F0F1F3] flex items-center justify-between gap-4">
        <div>
          <div className="text-[13px] font-medium text-[#1A1A1A]">Roster fee</div>
          <div className="text-[12px] text-[#9CA3AF] tabular-nums">
            {formatCents(rosterDueCents)}
          </div>
        </div>
        {rosterPaidCents >= rosterDueCents ? (
          <span className="text-[12px] font-semibold text-[#0F9D6E]">Paid</span>
        ) : (
          <button
            type="button"
            onClick={payRoster}
            disabled={loading !== null}
            className="px-3.5 py-2 rounded-lg bg-[#1A1A1A] text-white text-[12px] font-semibold hover:bg-black disabled:opacity-60 transition-colors"
          >
            {loading === "roster" ? "Opening…" : "Pay"}
          </button>
        )}
      </div>

      {/* ── Fall tournaments ───────────────────────────────────────────── */}
      <div className="px-6 py-4 border-t border-[#F0F1F3]">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-medium text-[#1A1A1A]">
            Fall tournaments
          </span>
          <span className="text-[12px] tabular-nums text-[#6B7280]">
            $300 each
          </span>
        </div>
        {fallPayments.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {fallPayments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between text-[12px]"
              >
                <span className="text-[#6B7280]">
                  {p.description ?? "Tournament"}
                </span>
                <span className="font-semibold tabular-nums text-[#0F9D6E]">
                  {formatCents(p.amount_cents)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[12px] text-[#9CA3AF]">
            Billed per tournament once the fall schedule is confirmed.
          </p>
        )}
      </div>

      {/* ── Open one-off charges ───────────────────────────────────────── */}
      {openCharges.length > 0 && (
        <div className="px-6 py-4 border-t border-[#F0F1F3] space-y-2">
          {openCharges.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between text-[13px]"
            >
              <span className="text-[#1A1A1A]">{c.label}</span>
              <span className="font-semibold tabular-nums text-[#1A1A1A]">
                {formatCents(c.amount_cents)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Payments received ──────────────────────────────────────────── */}
      {summerPayments.length > 0 && (
        <div className="px-6 py-4 border-t border-[#F0F1F3]">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#9CA3AF] mb-2">
            Payments received
          </p>
          <ul className="space-y-1.5">
            {summerPayments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between text-[12px]"
              >
                <span className="text-[#6B7280]">
                  {new Date(`${p.payment_date}T12:00:00`).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", year: "numeric" },
                  )}
                </span>
                <span className="font-semibold tabular-nums text-[#0F9D6E]">
                  {formatCents(p.amount_cents)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {errorMsg && (
        <p
          role="alert"
          className="px-6 pb-4 text-[12px] text-[#EF4444]"
        >
          {errorMsg}
        </p>
      )}
    </section>
  );
}
