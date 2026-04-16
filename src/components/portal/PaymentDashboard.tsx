"use client";

import { useState } from "react";
import {
  buildTickets,
  type PaymentTicket,
  type PortalPayment,
  type PortalPaymentPlan,
} from "@/lib/portal-tickets";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(dollars: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dollars % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Gradient config per category ───────────────────────────────────────────

const CATEGORY_STYLE: Record<
  "roster" | "summer",
  { endColor: string; eyebrow: string }
> = {
  roster: { endColor: "#4A90D9", eyebrow: "You. First Elite" },
  summer: { endColor: "#34D399", eyebrow: "Summer Tuition" },
};

function overlayTitle(ticket: PaymentTicket): string {
  if (ticket.category === "summer" && ticket.installmentsTotal && ticket.installmentsTotal > 1) {
    return `SUMMER \u00b7 ${ticket.installmentIndex} OF ${ticket.installmentsTotal}`;
  }
  if (ticket.category === "summer") return "SUMMER TUITION";
  return "ROSTER FEE";
}

// ─── TicketCard ─────────────────────────────────────────────────────────────

function TicketCard({ ticket }: { ticket: PaymentTicket }) {
  const [loading, setLoading] = useState(false);
  const isPaid = ticket.status === "paid";
  const isOverdue = ticket.status === "overdue";
  const { endColor, eyebrow } = CATEGORY_STYLE[ticket.category];

  const gradientEnd = isOverdue ? "#EF4444" : endColor;
  const gradient = `linear-gradient(135deg, #0A0A0B 0%, #1A1D24 45%, ${gradientEnd} 100%)`;

  async function handlePay() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: ticket.playerId,
          ticketId: ticket.ticketId,
          category: ticket.category,
          stripePriceId: ticket.stripePriceId,
          installmentIndex: ticket.installmentIndex,
          installmentsTotal: ticket.installmentsTotal,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <article
      className={[
        "group relative rounded-2xl overflow-hidden bg-white transition-all",
        "shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)]",
        isPaid ? "opacity-75 saturate-[0.6]" : "",
        isOverdue ? "ring-2 ring-[#EF4444]/35" : "",
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

        {isPaid && (
          <div
            aria-hidden="true"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/25"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}

        {isOverdue && (
          <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-[#EF4444] text-[10px] font-bold uppercase tracking-[0.14em] shadow-lg">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-[#EF4444] opacity-75 animate-ping" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
            </span>
            Overdue
          </div>
        )}

        <div className="relative text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
          {eyebrow}
        </div>
        <h3
          className="relative mt-1.5 text-[22px] sm:text-[24px] font-bold text-white leading-[1.05] tracking-tight uppercase"
          style={{ letterSpacing: "0.01em" }}
        >
          {overlayTitle(ticket)}
        </h3>
      </div>

      {/* ── BOTTOM HALF: details ────────────────────────────────────── */}
      <div className="bg-white p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
              {isPaid ? "Amount Paid" : "Amount Due"}
            </div>
            <div
              className={`mt-1 text-2xl font-bold tabular-nums leading-none ${
                isPaid
                  ? "text-[#9CA3AF] line-through decoration-[#9CA3AF]/40"
                  : "text-[#1A1A1A]"
              }`}
            >
              {formatCurrency(ticket.amount)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[#6B7280]">
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="tabular-nums">
                {isPaid && ticket.paidDate
                  ? `Received ${formatShortDate(ticket.paidDate)}`
                  : ticket.dueDateDisplay}
              </span>
            </div>
          </div>
          <StatusBadge status={ticket.status} />
        </div>

        {/* Action */}
        {isPaid ? (
          <div className="mt-5 flex items-center justify-center gap-2 w-full min-h-[48px] px-4 rounded-xl border border-[#34D399]/25 bg-[#34D399]/5 text-[#34D399] text-[12px] font-bold uppercase tracking-[0.12em]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
              isOverdue
                ? "bg-[#EF4444] hover:bg-[#dc2626] shadow-[0_4px_14px_rgba(239,68,68,0.35)] hover:shadow-[0_8px_24px_rgba(239,68,68,0.55)]"
                : "bg-[#4A90D9] hover:bg-[#3A7BC0] shadow-[0_4px_14px_rgba(74,144,217,0.3)] hover:shadow-[0_8px_24px_rgba(74,144,217,0.5)]",
            ].join(" ")}
          >
            {loading ? (
              "Redirecting..."
            ) : isOverdue ? (
              <>
                Pay Now — Overdue
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            ) : (
              <>
                Pay {formatCurrency(ticket.amount)}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
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
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Paid
      </span>
    );
  }
  if (status === "overdue") {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EF4444]/10 text-[#EF4444]">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Overdue
      </span>
    );
  }
  return (
    <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#4A90D9]/10 text-[#4A90D9]">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      Due
    </span>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function PaymentDashboard({
  playerId,
  payments,
  paymentPlan,
}: {
  playerId: string;
  payments: PortalPayment[];
  paymentPlan: PortalPaymentPlan | null;
}) {
  const tickets = buildTickets(playerId, payments, paymentPlan);

  const totalBilled = tickets.reduce((s, t) => s + t.amount, 0);
  const totalPaid = tickets
    .filter((t) => t.status === "paid")
    .reduce((s, t) => s + t.amount, 0);
  const totalRemaining = Math.max(0, totalBilled - totalPaid);

  return (
    <div className="max-w-2xl mx-auto mt-12">
      <p className="section-label mb-6">Payments</p>

      {/* Summary strip */}
      <div className="mb-6 text-sm text-[#6B7280]">
        {totalRemaining > 0 ? (
          <span>
            <span className="font-semibold text-[#1A1A1A]">
              {formatCurrency(totalRemaining)}
            </span>{" "}
            remaining of{" "}
            <span className="font-semibold text-[#1A1A1A]">
              {formatCurrency(totalBilled)}
            </span>{" "}
            total
          </span>
        ) : (
          <span className="font-semibold text-[#34D399]">
            All payments are settled — nothing due.
          </span>
        )}
      </div>

      {/* Ticket grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tickets.map((ticket) => (
          <TicketCard key={ticket.ticketId} ticket={ticket} />
        ))}
      </div>

      {tickets.length === 0 && (
        <div className="p-8 rounded-xl border border-[#E5E7EB] bg-white text-center">
          <p className="text-sm text-[#9CA3AF]">No payments found.</p>
        </div>
      )}
    </div>
  );
}
