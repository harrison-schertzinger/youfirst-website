"use client";

import { useState, useCallback, type FormEvent } from "react";
import { Link2, Loader2, Copy, Check, ExternalLink } from "lucide-react";

interface PlanShape {
  total_amount_cents: number | null;
  amount_paid_cents: number | null;
  installments_total: number | null;
  installments_paid: number | null;
}

interface Props {
  playerId: string;
  playerName: string;
  plan: PlanShape | null;
}

interface LinkResult {
  url: string;
  payment_link_id: string;
}

function formatDollarsExact(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export default function PaymentLinksSection({
  playerId,
  playerName,
  plan,
}: Props) {
  const installmentsTotal = plan?.installments_total ?? 0;
  const installmentsPaid = plan?.installments_paid ?? 0;
  const totalCents = plan?.total_amount_cents ?? 0;
  const perInstallmentCents =
    installmentsTotal > 0 ? Math.round(totalCents / installmentsTotal) : 0;
  const nextInstallment =
    installmentsPaid < installmentsTotal ? installmentsPaid + 1 : null;

  return (
    <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 md:p-7 space-y-6">
      <header>
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
          Payment Management
        </div>
        <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-[#0A0A0B]">
          Generate a Stripe payment link
        </h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Send {playerName}&rsquo;s parent a link to pay. Stripe records the
          payment automatically when they complete checkout.
        </p>
      </header>

      {/* ── Subsection A — Next installment quick link ─────────────────── */}
      {nextInstallment !== null && perInstallmentCents > 0 && (
        <QuickLinkBlock
          playerId={playerId}
          amountCents={perInstallmentCents}
          installmentIndex={nextInstallment}
          installmentsTotal={installmentsTotal}
        />
      )}

      {/* ── Subsection B — Custom amount ───────────────────────────────── */}
      <CustomLinkBlock playerId={playerId} />
    </section>
  );
}

// ─── Subsection A: quick installment link ─────────────────────────────────────

function QuickLinkBlock({
  playerId,
  amountCents,
  installmentIndex,
  installmentsTotal,
}: {
  playerId: string;
  amountCents: number;
  installmentIndex: number;
  installmentsTotal: number;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LinkResult | null>(null);

  const create = useCallback(async () => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/players/${playerId}/payment-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_cents: amountCents,
          description: `Installment ${installmentIndex} of ${installmentsTotal} — 2025-26 season`,
          payment_category: "summer",
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Failed to create payment link.");
        setSubmitting(false);
        return;
      }
      const data = (await res.json()) as LinkResult;
      setResult({ url: data.url, payment_link_id: data.payment_link_id });
    } catch (err) {
      console.error("[QuickLinkBlock] threw:", err);
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }, [amountCents, installmentIndex, installmentsTotal, playerId, submitting]);

  return (
    <div className="rounded-xl border border-[#E5E7EB] p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
        Next Installment
      </div>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="text-[20px] font-bold tabular-nums text-[#0A0A0B]">
            {formatDollarsExact(amountCents)}
          </div>
          <div className="text-[12px] text-[#6B7280]">
            Installment {installmentIndex} of {installmentsTotal}
          </div>
        </div>
        {!result && (
          <button
            type="button"
            onClick={create}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Link2 className="w-3.5 h-3.5" />
            )}
            {submitting ? "Creating…" : "Create Payment Link"}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[12px] text-[#EF4444]">
          {error}
        </p>
      )}

      {result && (
        <PaymentLinkResult
          result={result}
          onClear={() => setResult(null)}
        />
      )}
    </div>
  );
}

// ─── Subsection B: custom amount ──────────────────────────────────────────────

function CustomLinkBlock({ playerId }: { playerId: string }) {
  const [dollars, setDollars] = useState("");
  const [description, setDescription] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<LinkResult | null>(null);

  const submit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      setFieldError(null);
      setBannerError(null);

      // Client-side validation: dollars must be a positive number, capped at $10,000.
      const d = Number(dollars);
      if (!dollars.trim() || !Number.isFinite(d) || d <= 0) {
        setFieldError("Amount must be a positive dollar value (e.g. 300).");
        return;
      }
      if (d > 10_000) {
        setFieldError("Amount cannot exceed $10,000.");
        return;
      }
      if (!description.trim() || description.trim().length > 200) {
        setFieldError("Description is required (1–200 characters).");
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch(`/api/admin/players/${playerId}/payment-link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount_cents: Math.round(d * 100),
            description: description.trim(),
            payment_category: "custom",
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            field?: string;
          };
          if (data.field) {
            setFieldError(`${data.field}: ${data.error ?? "invalid value"}`);
          } else {
            setBannerError(data.error ?? "Failed to create payment link.");
          }
          setSubmitting(false);
          return;
        }
        const data = (await res.json()) as LinkResult;
        setResult({ url: data.url, payment_link_id: data.payment_link_id });
        // Keep the form open and cleared so admin can build the next one.
        setDollars("");
        setDescription("");
      } catch (err) {
        console.error("[CustomLinkBlock] threw:", err);
        setBannerError("Network error. Try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [description, dollars, playerId, submitting],
  );

  return (
    <div className="rounded-xl border border-[#E5E7EB] p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
        Custom Amount
      </div>
      <p className="mt-1 text-[12px] text-[#6B7280]">
        Create a one-off Stripe Payment Link for any amount.
      </p>

      <form onSubmit={submit} noValidate className="mt-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
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
                placeholder="300"
                required
                className="w-full bg-white border border-[#E5E7EB] rounded-lg pl-6 pr-2.5 py-1.5 text-[13px] text-[#0A0A0B] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition-colors"
              />
            </div>
          </label>
          <label className="block">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-[#6B7280] mb-1">
              Description
            </span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Partial summer payment"
              maxLength={200}
              required
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-[13px] text-[#0A0A0B] placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition-colors"
            />
          </label>
        </div>

        {fieldError && (
          <p role="alert" className="text-[12px] text-[#EF4444]">
            {fieldError}
          </p>
        )}
        {bannerError && (
          <div className="rounded-lg border border-[#EF4444]/30 bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#EF4444]">
            {bannerError}
          </div>
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
              <Link2 className="w-3.5 h-3.5" />
            )}
            {submitting ? "Creating…" : "Create Custom Link"}
          </button>
        </div>
      </form>

      {result && (
        <PaymentLinkResult
          result={result}
          onClear={() => setResult(null)}
        />
      )}
    </div>
  );
}

// ─── Generated link display + Copy button ─────────────────────────────────────

function PaymentLinkResult({
  result,
  onClear,
}: {
  result: LinkResult;
  onClear: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const copy = useCallback(async () => {
    setCopyFailed(false);
    try {
      // navigator.clipboard requires a secure context (HTTPS or localhost).
      // Degrade gracefully if unavailable rather than throw.
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(result.url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      } else {
        setCopyFailed(true);
      }
    } catch (err) {
      console.error("[PaymentLinkResult] clipboard failed:", err);
      setCopyFailed(true);
    }
  }, [result.url]);

  return (
    <div className="mt-4 rounded-lg bg-[#F8F9FA] border border-[#E5E7EB] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[12px] font-semibold text-[#34D399] inline-flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
          Payment link created
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] text-[#6B7280] hover:text-[#0A0A0B] transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="flex items-stretch gap-2">
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-0 px-3 py-2 rounded-md bg-white border border-[#E5E7EB] text-[12px] font-mono text-[#0A0A0B] truncate hover:bg-[#F8F9FA] transition-colors inline-flex items-center gap-1.5"
        >
          <ExternalLink className="w-3 h-3 text-[#6B7280] shrink-0" />
          {result.url}
        </a>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#E5E7EB] text-[12px] font-semibold transition-colors hover:bg-white"
          style={{ color: copied ? "#34D399" : "#0A0A0B" }}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      {copyFailed && (
        <p className="text-[11px] text-[#F59E0B]">
          Clipboard unavailable in this context — select the URL above and copy manually.
        </p>
      )}
      <p className="text-[11px] text-[#6B7280]">
        Send this to the parent. Stripe will record the payment automatically
        when they pay.
      </p>
    </div>
  );
}
