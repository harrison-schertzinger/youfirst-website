"use client";

import { useMemo, useRef, useState } from "react";
import {
  ROSTER_GRAD_YEAR_OPTIONS,
  ROSTER_TEAM_INFO,
  ROSTER_TEAMS,
  UNIFORM_SIZES,
  normalizeUsPhone,
  teamForGradYear,
  teamNoteForGradYear,
  type RosterTeam,
} from "@/lib/roster";

interface FormState {
  playerFirstName: string;
  playerLastName: string;
  playerGradYear: string;
  team: RosterTeam | "";
  playerPhone: string;
  parent1Name: string;
  parent1Email: string;
  parent1Phone: string;
  parent2Name: string;
  parent2Email: string;
  parent2Phone: string;
  jerseySize: string;
  shortsSize: string;
  sweatshirtSize: string;
  shootingShirtSize: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
}

const EMPTY: FormState = {
  playerFirstName: "",
  playerLastName: "",
  playerGradYear: "",
  team: "",
  playerPhone: "",
  parent1Name: "",
  parent1Email: "",
  parent1Phone: "",
  parent2Name: "",
  parent2Email: "",
  parent2Phone: "",
  jerseySize: "",
  shortsSize: "",
  sweatshirtSize: "",
  shootingShirtSize: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  notes: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same field system as the tryout form — high-contrast on dark; 16px text
// prevents iOS focus-zoom; py-4 = large tap target.
const labelCls =
  "block text-[13px] font-semibold uppercase tracking-[0.12em] text-white/90 mb-2.5";
const fieldCls =
  "w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-4 text-[16px] text-white placeholder:text-white/35 focus:outline-none focus:border-accent-blue focus:bg-white/[0.09] focus:ring-2 focus:ring-accent-blue/40 transition-all duration-200";
const fieldErrCls = "border-red-400/50";
const chevronBg = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M5 7.5L10 12.5L15 7.5' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundPosition: "right 0.9rem center",
  backgroundRepeat: "no-repeat",
};

function SectionHeading({ label }: { label: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-blue mb-5">
      {label}
    </p>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-2 text-[13px] text-red-300">{msg}</p>;
}

export default function RosterConfirmForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [showParent2, setShowParent2] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const gradYear = form.playerGradYear ? parseInt(form.playerGradYear, 10) : null;

  const set =
    (key: keyof FormState) =>
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setErrors((errs) => {
        if (!errs[key]) return errs;
        const next = { ...errs };
        delete next[key];
        return next;
      });
      if (apiError) setApiError(null);
    };

  // Picking her class auto-selects the team it maps to; the family confirms
  // (and can switch if the coaches told them something different).
  const setGradYear = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setForm((f) => ({
      ...f,
      playerGradYear: value,
      team: teamForGradYear(parseInt(value, 10)),
    }));
    setErrors((errs) => {
      const next = { ...errs };
      delete next.playerGradYear;
      delete next.team;
      return next;
    });
    if (apiError) setApiError(null);
  };

  const mappedTeam = gradYear ? teamForGradYear(gradYear) : null;

  const teamInfo = useMemo(
    () => (form.team ? ROSTER_TEAM_INFO[form.team] : null),
    [form.team],
  );

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!form.playerFirstName.trim()) errs.playerFirstName = "Her first name is required.";
    if (!form.playerLastName.trim()) errs.playerLastName = "Her last name is required.";
    if (!form.playerGradYear) errs.playerGradYear = "Choose her graduation year.";
    if (!form.team) errs.team = "Confirm her team.";
    if (form.playerPhone.trim() && !normalizeUsPhone(form.playerPhone)) {
      errs.playerPhone = "That doesn't look like a valid US number.";
    }
    if (!form.parent1Name.trim()) errs.parent1Name = "Parent name is required.";
    if (!form.parent1Email.trim() || !EMAIL_RE.test(form.parent1Email.trim())) {
      errs.parent1Email = "A valid email is required.";
    }
    if (!form.parent1Phone.trim() || !normalizeUsPhone(form.parent1Phone)) {
      errs.parent1Phone = "A valid US phone number is required.";
    }
    if (showParent2) {
      const anyP2 =
        form.parent2Name.trim() || form.parent2Email.trim() || form.parent2Phone.trim();
      if (anyP2 && !form.parent2Name.trim()) {
        errs.parent2Name = "Add their name (or remove the second parent).";
      }
      if (form.parent2Email.trim() && !EMAIL_RE.test(form.parent2Email.trim())) {
        errs.parent2Email = "That email doesn't look valid.";
      }
      if (form.parent2Phone.trim() && !normalizeUsPhone(form.parent2Phone)) {
        errs.parent2Phone = "That doesn't look like a valid US number.";
      }
    }
    if (!form.jerseySize) errs.jerseySize = "Choose a jersey size.";
    if (!form.shortsSize) errs.shortsSize = "Choose a shorts size.";
    if (!form.sweatshirtSize) errs.sweatshirtSize = "Choose a sweatshirt size.";
    if (!form.shootingShirtSize) errs.shootingShirtSize = "Choose a shooting shirt size.";
    if (!form.emergencyContactName.trim()) {
      errs.emergencyContactName = "An emergency contact is required.";
    }
    if (
      !form.emergencyContactPhone.trim() ||
      !normalizeUsPhone(form.emergencyContactPhone)
    ) {
      errs.emergencyContactPhone = "A valid US phone number is required.";
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstKey = Object.keys(errs)[0];
      document.getElementById(firstKey)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    setApiError(null);

    try {
      const res = await fetch("/api/roster/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerFirstName: form.playerFirstName,
          playerLastName: form.playerLastName,
          playerGradYear: form.playerGradYear,
          team: form.team,
          playerPhone: form.playerPhone,
          parent1Name: form.parent1Name,
          parent1Email: form.parent1Email,
          parent1Phone: form.parent1Phone,
          parent2Name: showParent2 ? form.parent2Name : "",
          parent2Email: showParent2 ? form.parent2Email : "",
          parent2Phone: showParent2 ? form.parent2Phone : "",
          jerseySize: form.jerseySize,
          shortsSize: form.shortsSize,
          sweatshirtSize: form.sweatshirtSize,
          shootingShirtSize: form.shootingShirtSize,
          emergencyContactName: form.emergencyContactName,
          emergencyContactPhone: form.emergencyContactPhone,
          notes: form.notes,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setApiError(
          data.error ||
            "We couldn't save her details. Please try again or email kathleen@youfirstlacrosse.com.",
        );
        setSubmitting(false);
        return;
      }

      setDone(true);
      setSubmitting(false);
      requestAnimationFrame(() => {
        cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch {
      setApiError("Something went wrong saving her details. Please try again.");
      setSubmitting(false);
    }
  }

  // ── Success — her spot is confirmed, no payment at this step ────────
  if (done) {
    return (
      <div
        ref={cardRef}
        className="rounded-2xl border border-white/12 bg-white/[0.04] backdrop-blur-md p-8 sm:p-12 text-center"
      >
        <div className="mx-auto mb-7 w-16 h-16 rounded-full bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="#4B9CD3"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h3 className="text-[2rem] sm:text-[2.5rem] font-bold leading-[1.05] tracking-tight text-white mb-5">
          Her Spot Is <span className="gradient-text-blue">Confirmed.</span>
        </h3>
        <p className="text-lg text-white/65 leading-[1.7] mb-8">
          <strong className="text-white">
            {form.playerFirstName.trim()} {form.playerLastName.trim()}
          </strong>{" "}
          is locked onto the {teamInfo?.name} roster. Welcome to the team. 🥍
        </p>

        {teamInfo && (
          <div className="rounded-xl border border-accent-blue/30 bg-accent-blue/[0.10] px-6 py-5 mb-8 text-left">
            <p className="text-[11px] uppercase tracking-[0.15em] text-accent-blue font-semibold mb-1">
              Her Team
            </p>
            <p className="text-[1.6rem] font-extrabold text-white leading-tight">
              {teamInfo.name}
            </p>
            <p className="text-[14px] text-white/55 mt-1">{teamInfo.classes}</p>
          </div>
        )}

        <div className="text-left">
          <p className="text-[12px] uppercase tracking-[0.15em] text-white/45 font-semibold mb-3">
            What happens next
          </p>
          <ul className="space-y-2.5">
            {[
              "We'll be in touch with team details.",
              ...(teamInfo ? [teamInfo.nextLine] : []),
              "A gear confirmation with the first charge will follow separately by email or text.",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-[15px] text-white/85 leading-relaxed"
              >
                <span className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-accent-blue/20 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12.5l4.5 4.5L19 7.5"
                      stroke="#4B9CD3"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[13px] text-white/40 mt-8 leading-relaxed">
          Questions? Email{" "}
          <a
            href="mailto:kathleen@youfirstlacrosse.com"
            className="text-white/60 hover:text-accent-blue transition-colors"
          >
            kathleen@youfirstlacrosse.com
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/12 bg-white/[0.04] backdrop-blur-md p-6 sm:p-9"
      noValidate
    >
      {/* ── Player ─────────────────────────────────────────────────── */}
      <SectionHeading label="Player" />
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="playerFirstName" className={labelCls}>
              First Name
            </label>
            <input
              id="playerFirstName"
              type="text"
              autoComplete="off"
              value={form.playerFirstName}
              onChange={set("playerFirstName")}
              className={`${fieldCls} ${errors.playerFirstName ? fieldErrCls : ""}`}
              placeholder="Her first name"
            />
            <FieldError msg={errors.playerFirstName} />
          </div>
          <div>
            <label htmlFor="playerLastName" className={labelCls}>
              Last Name
            </label>
            <input
              id="playerLastName"
              type="text"
              autoComplete="off"
              value={form.playerLastName}
              onChange={set("playerLastName")}
              className={`${fieldCls} ${errors.playerLastName ? fieldErrCls : ""}`}
              placeholder="Her last name"
            />
            <FieldError msg={errors.playerLastName} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="playerGradYear" className={labelCls}>
              Graduation Year
            </label>
            <select
              id="playerGradYear"
              value={form.playerGradYear}
              onChange={setGradYear}
              className={`${fieldCls} appearance-none ${
                form.playerGradYear ? "text-white" : "text-white/40"
              } ${errors.playerGradYear ? fieldErrCls : ""}`}
              style={chevronBg}
            >
              <option value="" disabled>
                Select year
              </option>
              {ROSTER_GRAD_YEAR_OPTIONS.map((y) => (
                <option key={y} value={y} className="text-black">
                  {y}
                </option>
              ))}
            </select>
            <FieldError msg={errors.playerGradYear} />
          </div>
          <div>
            <label htmlFor="playerPhone" className={labelCls}>
              Player Phone{" "}
              <span className="normal-case tracking-normal text-white/45 font-normal">
                (optional)
              </span>
            </label>
            <input
              id="playerPhone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={form.playerPhone}
              onChange={set("playerPhone")}
              className={`${fieldCls} ${errors.playerPhone ? fieldErrCls : ""}`}
              placeholder="(555) 123-4567"
            />
            <FieldError msg={errors.playerPhone} />
          </div>
        </div>

        {/* Her team — auto-mapped from grad year, confirmed by the family */}
        {gradYear && (
          <div className="animate-fade-in-up" id="team">
            <span className={labelCls}>Her Team</span>
            <div
              role="tablist"
              aria-label="Team"
              className="grid grid-cols-2 gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] p-1.5"
            >
              {ROSTER_TEAMS.map((key) => {
                const active = form.team === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setForm((f) => ({ ...f, team: key }));
                      setErrors((errs) => {
                        const next = { ...errs };
                        delete next.team;
                        return next;
                      });
                    }}
                    className={`py-3 rounded-lg text-[13px] font-semibold uppercase tracking-[0.08em] transition-all duration-200 ${
                      active
                        ? "bg-accent-blue text-white shadow-[0_2px_10px_rgba(74,144,217,0.4)]"
                        : "text-white/70 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    {ROSTER_TEAM_INFO[key].name}
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 text-[13px] text-white/50 leading-relaxed">
              {teamNoteForGradYear(gradYear)}
              {teamInfo && (
                <span className="text-white/40"> {teamInfo.classes}.</span>
              )}
              {mappedTeam && form.team && form.team !== mappedTeam && (
                <span className="block mt-1 text-accent-blue/90">
                  Different from the usual mapping — keep whichever team she was
                  offered.
                </span>
              )}
            </p>
            <FieldError msg={errors.team} />
          </div>
        )}
      </div>

      {/* ── Parent / Guardian ──────────────────────────────────────── */}
      <div className="mt-9 pt-8 border-t border-white/10">
        <SectionHeading label="Parent / Guardian" />
        <div className="space-y-5">
          <div>
            <label htmlFor="parent1Name" className={labelCls}>
              Name
            </label>
            <input
              id="parent1Name"
              type="text"
              autoComplete="name"
              value={form.parent1Name}
              onChange={set("parent1Name")}
              className={`${fieldCls} ${errors.parent1Name ? fieldErrCls : ""}`}
              placeholder="Your full name"
            />
            <FieldError msg={errors.parent1Name} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="parent1Email" className={labelCls}>
                Email
              </label>
              <input
                id="parent1Email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={form.parent1Email}
                onChange={set("parent1Email")}
                className={`${fieldCls} ${errors.parent1Email ? fieldErrCls : ""}`}
                placeholder="you@email.com"
              />
              <FieldError msg={errors.parent1Email} />
            </div>
            <div>
              <label htmlFor="parent1Phone" className={labelCls}>
                Phone
              </label>
              <input
                id="parent1Phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.parent1Phone}
                onChange={set("parent1Phone")}
                className={`${fieldCls} ${errors.parent1Phone ? fieldErrCls : ""}`}
                placeholder="(555) 123-4567"
              />
              <FieldError msg={errors.parent1Phone} />
            </div>
          </div>

          {showParent2 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-5 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-white/60">
                  Second Parent / Guardian
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowParent2(false);
                    setForm((f) => ({
                      ...f,
                      parent2Name: "",
                      parent2Email: "",
                      parent2Phone: "",
                    }));
                    setErrors((errs) => {
                      const next = { ...errs };
                      delete next.parent2Name;
                      delete next.parent2Email;
                      delete next.parent2Phone;
                      return next;
                    });
                  }}
                  className="text-[13px] text-white/45 hover:text-white transition-colors"
                >
                  Remove
                </button>
              </div>
              <div>
                <label htmlFor="parent2Name" className={labelCls}>
                  Name
                </label>
                <input
                  id="parent2Name"
                  type="text"
                  autoComplete="off"
                  value={form.parent2Name}
                  onChange={set("parent2Name")}
                  className={`${fieldCls} ${errors.parent2Name ? fieldErrCls : ""}`}
                  placeholder="Their full name"
                />
                <FieldError msg={errors.parent2Name} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="parent2Email" className={labelCls}>
                    Email{" "}
                    <span className="normal-case tracking-normal text-white/45 font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="parent2Email"
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    value={form.parent2Email}
                    onChange={set("parent2Email")}
                    className={`${fieldCls} ${errors.parent2Email ? fieldErrCls : ""}`}
                    placeholder="them@email.com"
                  />
                  <FieldError msg={errors.parent2Email} />
                </div>
                <div>
                  <label htmlFor="parent2Phone" className={labelCls}>
                    Phone{" "}
                    <span className="normal-case tracking-normal text-white/45 font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="parent2Phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    value={form.parent2Phone}
                    onChange={set("parent2Phone")}
                    className={`${fieldCls} ${errors.parent2Phone ? fieldErrCls : ""}`}
                    placeholder="(555) 123-4567"
                  />
                  <FieldError msg={errors.parent2Phone} />
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowParent2(true)}
              className="w-full rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-4 py-3.5 text-[14px] font-medium text-white/60 hover:text-white hover:border-white/35 hover:bg-white/[0.05] transition-all duration-200"
            >
              + Add another parent
            </button>
          )}
        </div>
      </div>

      {/* ── Uniform — all four pieces, 2×2 ─────────────────────────── */}
      <div className="mt-9 pt-8 border-t border-white/10">
        <SectionHeading label="Uniform" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {(
            [
              ["jerseySize", "Jersey Size"],
              ["shortsSize", "Shorts Size"],
              ["sweatshirtSize", "Sweatshirt Size"],
              ["shootingShirtSize", "Shooting Shirt Size"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label htmlFor={key} className={labelCls}>
                {label}
              </label>
              <select
                id={key}
                value={form[key]}
                onChange={set(key)}
                className={`${fieldCls} appearance-none ${
                  form[key] ? "text-white" : "text-white/40"
                } ${errors[key] ? fieldErrCls : ""}`}
                style={chevronBg}
              >
                <option value="" disabled>
                  Select size
                </option>
                {UNIFORM_SIZES.map((s) => (
                  <option key={s.value} value={s.value} className="text-black">
                    {s.label}
                  </option>
                ))}
              </select>
              <FieldError msg={errors[key]} />
            </div>
          ))}
        </div>
        <p className="mt-3 text-[13px] text-white/45 leading-relaxed">
          Not sure? Youth sizes run YS–YL, adult XS–XXL — when in doubt, size
          up. She&apos;ll grow into it.
        </p>
      </div>

      {/* ── Emergency Contact ──────────────────────────────────────── */}
      <div className="mt-9 pt-8 border-t border-white/10">
        <SectionHeading label="Emergency Contact" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="emergencyContactName" className={labelCls}>
              Name
            </label>
            <input
              id="emergencyContactName"
              type="text"
              autoComplete="off"
              value={form.emergencyContactName}
              onChange={set("emergencyContactName")}
              className={`${fieldCls} ${errors.emergencyContactName ? fieldErrCls : ""}`}
              placeholder="Who we call if we can't reach you"
            />
            <FieldError msg={errors.emergencyContactName} />
          </div>
          <div>
            <label htmlFor="emergencyContactPhone" className={labelCls}>
              Phone
            </label>
            <input
              id="emergencyContactPhone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={form.emergencyContactPhone}
              onChange={set("emergencyContactPhone")}
              className={`${fieldCls} ${errors.emergencyContactPhone ? fieldErrCls : ""}`}
              placeholder="(555) 123-4567"
            />
            <FieldError msg={errors.emergencyContactPhone} />
          </div>
        </div>
      </div>

      {/* ── Notes ──────────────────────────────────────────────────── */}
      <div className="mt-9 pt-8 border-t border-white/10">
        <label htmlFor="notes" className={labelCls}>
          Anything We Should Know?{" "}
          <span className="normal-case tracking-normal text-white/45 font-normal">
            (optional)
          </span>
        </label>
        <textarea
          id="notes"
          rows={3}
          value={form.notes}
          onChange={set("notes")}
          className={`${fieldCls} resize-none`}
          placeholder="Number requests, sizing notes, schedule conflicts…"
        />
      </div>

      {/* ── Confirm — no payment at this step ──────────────────────── */}
      <div className="mt-9 pt-8 border-t border-white/10">
        {apiError && (
          <div className="mb-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-[14px] text-red-200">
            {apiError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center px-8 py-[18px] bg-accent-blue text-white text-[14px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_18px_rgba(74,144,217,0.45)] hover:shadow-[0_6px_28px_rgba(74,144,217,0.6)] hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_18px_rgba(74,144,217,0.45)]"
        >
          {submitting ? "Confirming her spot…" : "Confirm Her Spot"}
        </button>
        <p className="text-center text-[12px] text-white/40 mt-4 leading-relaxed">
          Nothing due today. A gear confirmation with the first charge follows
          separately.
        </p>
      </div>
    </form>
  );
}
