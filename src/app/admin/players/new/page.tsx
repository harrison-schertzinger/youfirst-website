"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanType = "lump_sum" | "monthly" | "quarterly";

interface FormState {
  first_name: string;
  last_name: string;
  graduation_year: string;
  position: string;
  jersey_number: string;
  school: string;
  guardian_first_name: string;
  guardian_last_name: string;
  guardian_email: string;
  guardian_phone: string;
  season: string;
  plan_type: PlanType;
  total_amount_dollars: string;
  notes: string;
}

interface SuccessResult {
  player_id: string;
  guardian_id: string;
  invite_sent: boolean;
  guardian_existed: boolean;
  full_name: string;
  guardian_email: string;
}

const INITIAL_FORM: FormState = {
  first_name: "",
  last_name: "",
  graduation_year: "",
  position: "",
  jersey_number: "",
  school: "",
  guardian_first_name: "",
  guardian_last_name: "",
  guardian_email: "",
  guardian_phone: "",
  season: "2025-26",
  plan_type: "lump_sum",
  total_amount_dollars: "1850",
  notes: "",
};

const PLAN_LABELS: Record<PlanType, string> = {
  lump_sum: "1 Payment",
  monthly: "2 Payments",
  quarterly: "4 Payments",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddPlayerPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SuccessResult | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setBannerError(null);
    setFieldErrors({});

    // Convert dollars → cents. Reject empty strings explicitly (Number("") = 0
    // would silently create a $0 plan). Reject non-finite, negative, and
    // anything over the $100k sanity cap (matches the server guard).
    if (form.total_amount_dollars.trim() === "") {
      setFieldErrors({
        total_amount_dollars: "Total amount is required.",
      });
      setSubmitting(false);
      return;
    }
    const dollars = Number(form.total_amount_dollars);
    if (!Number.isFinite(dollars) || dollars < 0) {
      setFieldErrors({
        total_amount_dollars: "Enter a dollar amount (e.g. 1850).",
      });
      setSubmitting(false);
      return;
    }
    if (dollars > 100_000) {
      setFieldErrors({
        total_amount_dollars: "Total amount cannot exceed $100,000.",
      });
      setSubmitting(false);
      return;
    }
    const total_amount_cents = Math.round(dollars * 100);

    const graduation_year = Number(form.graduation_year);
    if (!Number.isFinite(graduation_year) || !Number.isInteger(graduation_year)) {
      setFieldErrors({
        graduation_year: "Enter a 4-digit graduation year (e.g. 2027).",
      });
      setSubmitting(false);
      return;
    }
    if (graduation_year < 2024 || graduation_year > 2035) {
      setFieldErrors({
        graduation_year: "Graduation year must be between 2024 and 2035.",
      });
      setSubmitting(false);
      return;
    }

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      graduation_year,
      position: form.position.trim() || null,
      jersey_number: form.jersey_number.trim() || null,
      school: form.school.trim() || null,
      guardian_first_name: form.guardian_first_name.trim(),
      guardian_last_name: form.guardian_last_name.trim(),
      guardian_email: form.guardian_email.trim().toLowerCase(),
      guardian_phone: form.guardian_phone.trim() || null,
      plan_type: form.plan_type,
      total_amount_cents,
      season: form.season.trim(),
      notes: form.notes.trim() || null,
    };

    try {
      const res = await fetch("/api/admin/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        setBannerError("You're not authorized to add players.");
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setBannerError(
          data.error ??
            "Something went wrong on the server. Your form is preserved — try again.",
        );
        setSubmitting(false);
        return;
      }

      const data = (await res.json()) as {
        success: boolean;
        player_id: string;
        guardian_id: string;
        invite_sent: boolean;
        guardian_existed?: boolean;
      };

      setResult({
        player_id: data.player_id,
        guardian_id: data.guardian_id,
        invite_sent: data.invite_sent,
        guardian_existed: data.guardian_existed === true,
        full_name: `${payload.first_name} ${payload.last_name}`,
        guardian_email: payload.guardian_email,
      });
    } catch (err) {
      console.error("[/admin/players/new] submit threw:", err);
      setBannerError(
        "Network error. Your form is preserved — check your connection and try again.",
      );
      setSubmitting(false);
    }
  }

  function resetForNext() {
    setForm(INITIAL_FORM);
    setResult(null);
    setBannerError(null);
    setFieldErrors({});
    setSubmitting(false);
  }

  // ── Success view ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="max-w-2xl mx-auto">
        <Breadcrumb />
        <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-10 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-[#ECFDF5] text-[#34D399] flex items-center justify-center">
            <Check className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <h1 className="mt-5 text-[22px] font-semibold tracking-tight text-[#0A0A0B]">
            {result.full_name} added to the roster
          </h1>
          <p className="mt-2 text-[13px] text-[#6B7280] max-w-md">
            {result.invite_sent
              ? `Invite sent to ${result.guardian_email}.`
              : `Player created. Invite to ${result.guardian_email} could not be sent — resend manually from Supabase.`}
          </p>

          {result.guardian_existed && (
            <div className="mt-5 max-w-md text-left text-amber-700 bg-amber-50 rounded-lg px-4 py-3 text-sm">
              ⚠ Linked to an existing guardian on file for {result.guardian_email}. Name and phone from this form were not applied — the existing record was kept.
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/admin/players"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] transition-colors"
            >
              Back to Roster
            </Link>
            <button
              type="button"
              onClick={resetForNext}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-[#E5E7EB] text-[#0A0A0B] text-[13px] font-semibold hover:bg-[#F8F9FA] transition-colors"
            >
              Add Another Player
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form view ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      <Breadcrumb />

      <header className="mb-8">
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
          You. First Elite
        </div>
        <h1 className="mt-1 text-[26px] font-bold tracking-tight text-[#0A0A0B]">
          Add Player
        </h1>
        <p className="mt-1 text-[13px] text-[#6B7280] max-w-xl">
          Create a roster entry, attach a guardian, set the fee structure, and
          send the parent a sign-in invite — all in one step.
        </p>
      </header>

      {bannerError && (
        <div className="mb-6 rounded-lg border border-[#EF4444]/30 bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#EF4444]">
          {bannerError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-8 space-y-10"
        noValidate
      >
        {/* ── Section 1: Player Info ─────────────────────────────────────── */}
        <FormSection eyebrow="Section 01" title="Player Info">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="First name" required error={fieldErrors.first_name}>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => update("first_name", e.target.value)}
                required
                className={inputClass(!!fieldErrors.first_name)}
              />
            </Field>
            <Field label="Last name" required error={fieldErrors.last_name}>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => update("last_name", e.target.value)}
                required
                className={inputClass(!!fieldErrors.last_name)}
              />
            </Field>
            <Field
              label="Graduation year"
              required
              error={fieldErrors.graduation_year}
            >
              <input
                type="number"
                inputMode="numeric"
                placeholder="2026"
                value={form.graduation_year}
                onChange={(e) => update("graduation_year", e.target.value)}
                required
                className={inputClass(!!fieldErrors.graduation_year)}
              />
            </Field>
            <Field label="Position">
              <input
                type="text"
                placeholder="Attack · Midfield · Defense · Goalie"
                value={form.position}
                onChange={(e) => update("position", e.target.value)}
                className={inputClass(false)}
              />
            </Field>
            <Field label="Jersey number">
              <input
                type="text"
                value={form.jersey_number}
                onChange={(e) => update("jersey_number", e.target.value)}
                className={inputClass(false)}
              />
            </Field>
            <Field label="School">
              <input
                type="text"
                value={form.school}
                onChange={(e) => update("school", e.target.value)}
                className={inputClass(false)}
              />
            </Field>
          </div>
        </FormSection>

        <Divider />

        {/* ── Section 2: Parent / Guardian ───────────────────────────────── */}
        <FormSection eyebrow="Section 02" title="Parent / Guardian">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              label="First name"
              required
              error={fieldErrors.guardian_first_name}
            >
              <input
                type="text"
                value={form.guardian_first_name}
                onChange={(e) => update("guardian_first_name", e.target.value)}
                required
                className={inputClass(!!fieldErrors.guardian_first_name)}
              />
            </Field>
            <Field
              label="Last name"
              required
              error={fieldErrors.guardian_last_name}
            >
              <input
                type="text"
                value={form.guardian_last_name}
                onChange={(e) => update("guardian_last_name", e.target.value)}
                required
                className={inputClass(!!fieldErrors.guardian_last_name)}
              />
            </Field>
            <Field
              label="Email"
              required
              error={fieldErrors.guardian_email}
              hint="Magic-link invite is sent here on submit."
            >
              <input
                type="email"
                autoComplete="off"
                value={form.guardian_email}
                onChange={(e) => update("guardian_email", e.target.value)}
                required
                className={inputClass(!!fieldErrors.guardian_email)}
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                value={form.guardian_phone}
                onChange={(e) => update("guardian_phone", e.target.value)}
                className={inputClass(false)}
              />
            </Field>
          </div>
        </FormSection>

        <Divider />

        {/* ── Section 3: Fee Structure ───────────────────────────────────── */}
        <FormSection eyebrow="Section 03" title="Fee Structure">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Season" required error={fieldErrors.season}>
              <input
                type="text"
                value={form.season}
                onChange={(e) => update("season", e.target.value)}
                required
                className={inputClass(!!fieldErrors.season)}
              />
            </Field>
            <Field label="Plan" required error={fieldErrors.plan_type}>
              <select
                value={form.plan_type}
                onChange={(e) =>
                  update("plan_type", e.target.value as PlanType)
                }
                className={selectClass(!!fieldErrors.plan_type)}
              >
                <option value="lump_sum">{PLAN_LABELS.lump_sum}</option>
                <option value="monthly">{PLAN_LABELS.monthly}</option>
                <option value="quarterly">{PLAN_LABELS.quarterly}</option>
              </select>
            </Field>
            <Field
              label="Total amount (USD)"
              required
              error={fieldErrors.total_amount_dollars}
              hint="Standard summer tuition: $1,850. Adjust for custom or scholarship pricing."
              className="sm:col-span-2"
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
                  value={form.total_amount_dollars}
                  onChange={(e) =>
                    update("total_amount_dollars", e.target.value)
                  }
                  required
                  className={`${inputClass(!!fieldErrors.total_amount_dollars)} pl-7`}
                />
              </div>
            </Field>
          </div>
        </FormSection>

        <Divider />

        {/* ── Section 4: Notes ──────────────────────────────────────────── */}
        <FormSection eyebrow="Section 04" title="Notes">
          <Field label="Internal notes">
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={4}
              placeholder="Internal notes — not visible to parents."
              className={`${inputClass(false)} resize-y min-h-[96px]`}
            />
          </Field>
          <p className="mt-2 text-sm text-amber-600">
            Notes are not saved yet — this field is coming in a future update.
          </p>
        </FormSection>

        {/* ── Submit ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/players"
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#6B7280] hover:text-[#0A0A0B] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitting ? "Adding…" : "Add Player + Send Invite"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function Breadcrumb() {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex items-center gap-1.5 text-[12px] text-[#6B7280]"
    >
      <Link
        href="/admin/players"
        className="inline-flex items-center gap-1 hover:text-[#0A0A0B] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Players
      </Link>
      <span className="opacity-50">/</span>
      <span className="text-[#0A0A0B] font-medium">Add Player</span>
    </nav>
  );
}

function FormSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6B7280]">
          {eyebrow}
        </div>
        <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-[#0A0A0B]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Divider() {
  return <hr className="border-0 border-t border-[#E5E7EB]" />;
}

function Field({
  label,
  required,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
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
        <span
          role="alert"
          className="mt-1.5 block text-[11px] text-[#EF4444]"
        >
          {error}
        </span>
      )}
      {!error && hint && (
        <span className="mt-1.5 block text-[11px] text-[#6B7280]">{hint}</span>
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

function selectClass(hasError: boolean): string {
  return [
    "w-full bg-white border rounded-lg px-3 py-2 text-[14px] text-[#0A0A0B]",
    "focus:outline-none focus:ring-2 transition-colors",
    hasError
      ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20"
      : "border-[#E5E7EB] focus:border-[#4A90D9] focus:ring-[#4A90D9]/20",
  ].join(" ");
}
