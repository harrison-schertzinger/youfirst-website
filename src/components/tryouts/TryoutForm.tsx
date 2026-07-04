"use client";

import { useEffect, useMemo, useState } from "react";
import ScrollReveal from "@/components/home/ScrollReveal";
import {
  GRAD_YEAR_OPTIONS,
  MAKEUP_TRYOUT,
  MAKEUP_DATE_OPTIONS,
  TRYOUT_POSITIONS,
  TRYOUT_FEE_LABEL,
  describeTryout,
  isValidMakeupDate,
  tryoutForGradYear,
  type TryoutType,
} from "@/lib/tryouts";

interface FormState {
  tryoutType: TryoutType;
  makeupDate: string;
  playerFullName: string;
  parentName: string;
  email: string;
  phone: string;
  graduationYear: string;
  position: string;
}

const EMPTY: FormState = {
  tryoutType: "scheduled",
  makeupDate: "",
  playerFullName: "",
  parentName: "",
  email: "",
  phone: "",
  graduationYear: "",
  position: "",
};

// High-contrast on dark; 16px text prevents iOS focus-zoom; py-4 = large tap target.
const labelCls =
  "block text-[13px] font-semibold uppercase tracking-[0.12em] text-white/90 mb-2.5";
const fieldCls =
  "w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-4 text-[16px] text-white placeholder:text-white/35 focus:outline-none focus:border-accent-blue focus:bg-white/[0.09] focus:ring-2 focus:ring-accent-blue/40 transition-all duration-200";
const chevronBg = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M5 7.5L10 12.5L15 7.5' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundPosition: "right 0.9rem center",
  backgroundRepeat: "no-repeat",
};

export default function TryoutForm({ canceled = false }: { canceled?: boolean }) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deep-link: the make-up section CTA (#makeup) flips the form into make-up
  // mode and scrolls here.
  useEffect(() => {
    const applyHash = () => {
      if (typeof window !== "undefined" && window.location.hash === "#makeup") {
        setForm((f) => (f.tryoutType === "makeup" ? f : { ...f, tryoutType: "makeup" }));
        document.getElementById("register")?.scrollIntoView({ behavior: "smooth" });
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const cohort = useMemo(
    () =>
      form.graduationYear ? tryoutForGradYear(parseInt(form.graduationYear, 10)) : null,
    [form.graduationYear],
  );

  // The render-ready "Her tryout" line — scheduled session or make-up picked date.
  const matchedDisplay = useMemo(() => {
    if (form.tryoutType === "makeup") {
      return isValidMakeupDate(form.makeupDate)
        ? describeTryout({ type: "makeup", isoDate: form.makeupDate })
        : null;
    }
    return cohort
      ? describeTryout({ type: "scheduled", isoDate: cohort.isoDate, group: cohort.id })
      : null;
  }, [form.tryoutType, form.makeupDate, cohort]);

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      if (error) setError(null);
    };

  const setType = (tryoutType: TryoutType) => {
    setForm((f) => ({ ...f, tryoutType }));
    if (error) setError(null);
  };

  const typeOk =
    form.tryoutType === "makeup" ? isValidMakeupDate(form.makeupDate) : !!cohort;

  const canSubmit =
    !!form.playerFullName.trim() &&
    !!form.parentName.trim() &&
    !!form.email.trim() &&
    !!form.phone.trim() &&
    !!form.graduationYear &&
    !!form.position &&
    typeOk &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/tryouts/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(
          data.error ||
            "We couldn't start checkout. Please try again or email kathleen@youfirstlacrosse.com.",
        );
        setSubmitting(false);
        return;
      }

      window.location.href = data.url; // hand off to Stripe Checkout
    } catch {
      setError("Something went wrong reaching the payment system. Please try again.");
      setSubmitting(false);
    }
  }

  const isMakeup = form.tryoutType === "makeup";

  return (
    <section className="relative overflow-hidden bg-[#0A0A0B] pb-28 pt-20 sm:pt-24 sm:pb-36" id="register">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 22%, rgba(74,144,217,0.10), transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[620px] px-6">
        <div className="text-center mb-10 sm:mb-12">
          <ScrollReveal>
            <p className="section-label mb-5">Register</p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h2 className="text-[2.25rem] md:text-[3rem] font-bold leading-[1.05] tracking-tight text-white mb-4">
              Claim Her Spot.
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <p className="text-lg text-white/60 leading-[1.7]">
              One registration per athlete. {TRYOUT_FEE_LABEL} secures her tryout.
            </p>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={150}>
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-white/12 bg-white/[0.04] backdrop-blur-md p-6 sm:p-9"
            noValidate
          >
            {canceled && (
              <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-[14px] text-amber-100">
                Checkout was canceled — no charge was made. Your details are below;
                finish whenever you&apos;re ready.
              </div>
            )}

            {/* Tryout-type toggle */}
            <div className="mb-6">
              <span className={labelCls}>Tryout</span>
              <div
                role="tablist"
                aria-label="Tryout type"
                className="grid grid-cols-2 gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] p-1.5"
              >
                {([
                  { key: "scheduled", label: "Scheduled" },
                  { key: "makeup", label: "Make-up" },
                ] as const).map((opt) => {
                  const active = form.tryoutType === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setType(opt.key)}
                      className={`py-3 rounded-lg text-[13px] font-semibold uppercase tracking-[0.08em] transition-all duration-200 ${
                        active
                          ? "bg-accent-blue text-white shadow-[0_2px_10px_rgba(74,144,217,0.4)]"
                          : "text-white/70 hover:text-white hover:bg-white/[0.06]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2.5 text-[13px] text-white/50 leading-relaxed">
                {isMakeup
                  ? `Can't make July 11 or 25? Pick a make-up day — ${MAKEUP_TRYOUT.rangeLabel}, ${MAKEUP_TRYOUT.time} at ${MAKEUP_TRYOUT.location}. Come see if You First is the right home for you.`
                  : "Your date is set by graduation year — we'll confirm it below the moment you pick her year."}
              </p>
            </div>

            <div className="space-y-5">
              {/* Make-up day picker (make-up mode only) — fixed 5-day block */}
              {isMakeup && (
                <div>
                  <label htmlFor="makeupDate" className={labelCls}>
                    Pick a Make-up Day
                  </label>
                  <select
                    id="makeupDate"
                    value={form.makeupDate}
                    onChange={set("makeupDate")}
                    className={`${fieldCls} appearance-none ${
                      form.makeupDate ? "text-white" : "text-white/40"
                    }`}
                    style={chevronBg}
                  >
                    <option value="" disabled>
                      Select a day
                    </option>
                    {MAKEUP_DATE_OPTIONS.map((d) => (
                      <option key={d.iso} value={d.iso} className="text-black">
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[13px] text-white/45">
                    {MAKEUP_TRYOUT.time} · {MAKEUP_TRYOUT.location}
                  </p>
                </div>
              )}

              {/* Player full name */}
              <div>
                <label htmlFor="playerFullName" className={labelCls}>
                  Player Full Name
                </label>
                <input
                  id="playerFullName"
                  type="text"
                  autoComplete="off"
                  value={form.playerFullName}
                  onChange={set("playerFullName")}
                  className={fieldCls}
                  placeholder="First and last name"
                />
              </div>

              {/* Parent name */}
              <div>
                <label htmlFor="parentName" className={labelCls}>
                  Parent / Guardian Name
                </label>
                <input
                  id="parentName"
                  type="text"
                  autoComplete="name"
                  value={form.parentName}
                  onChange={set("parentName")}
                  className={fieldCls}
                  placeholder="Your full name"
                />
              </div>

              {/* Email + phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="email" className={labelCls}>
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={set("email")}
                    className={fieldCls}
                    placeholder="you@email.com"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className={labelCls}>
                    Phone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={set("phone")}
                    className={fieldCls}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Grad year + position */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="graduationYear" className={labelCls}>
                    Graduation Year
                  </label>
                  <select
                    id="graduationYear"
                    value={form.graduationYear}
                    onChange={set("graduationYear")}
                    className={`${fieldCls} appearance-none ${
                      form.graduationYear ? "text-white" : "text-white/40"
                    }`}
                    style={chevronBg}
                  >
                    <option value="" disabled>
                      Select year
                    </option>
                    {GRAD_YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y} className="text-black">
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="position" className={labelCls}>
                    Position
                  </label>
                  <select
                    id="position"
                    value={form.position}
                    onChange={set("position")}
                    className={`${fieldCls} appearance-none ${
                      form.position ? "text-white" : "text-white/40"
                    }`}
                    style={chevronBg}
                  >
                    <option value="" disabled>
                      Select position
                    </option>
                    {TRYOUT_POSITIONS.map((p) => (
                      <option key={p} value={p} className="text-black">
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Smart touch: matched tryout (scheduled date OR make-up pick) */}
              {matchedDisplay && (
                <div className="flex items-center gap-3 rounded-xl border border-accent-blue/30 bg-accent-blue/[0.10] px-4 py-3.5 animate-fade-in-up">
                  <span className="flex-shrink-0 w-9 h-9 rounded-full bg-accent-blue/20 flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M7 3v2m6-2v2M3.5 8h13M5 5h10a1.5 1.5 0 011.5 1.5V15A1.5 1.5 0 0115 16.5H5A1.5 1.5 0 013.5 15V6.5A1.5 1.5 0 015 5z"
                        stroke="#4B9CD3"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.15em] text-accent-blue font-semibold">
                      Her Tryout
                    </p>
                    <p className="text-[15px] font-semibold text-white leading-snug">
                      {matchedDisplay.dateLine}
                      <span className="text-white/55 font-normal">
                        {" "}· {matchedDisplay.time} · {matchedDisplay.location}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-[14px] text-red-200">
                  {error}
                </div>
              )}

              {/* Fee + submit */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-4 px-1">
                  <span className="text-[14px] text-white/55">Registration fee</span>
                  <span className="text-[20px] font-bold text-white">{TRYOUT_FEE_LABEL}</span>
                </div>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full inline-flex items-center justify-center px-8 py-[18px] bg-accent-blue text-white text-[14px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_18px_rgba(74,144,217,0.45)] hover:shadow-[0_6px_28px_rgba(74,144,217,0.6)] hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_18px_rgba(74,144,217,0.45)]"
                >
                  {submitting
                    ? "Taking you to checkout…"
                    : `Continue to Payment — ${TRYOUT_FEE_LABEL}`}
                </button>
                <p className="text-center text-[12px] text-white/40 mt-4 leading-relaxed">
                  Secure checkout by Stripe. You&apos;ll get a confirmation email the
                  moment payment clears.
                </p>
              </div>
            </div>
          </form>
        </ScrollReveal>
      </div>
    </section>
  );
}
