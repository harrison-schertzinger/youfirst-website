"use client";

import { useState, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ALLOWED_POSITIONS } from "@/lib/positions";
import { PROSPECT_STAGES, stageLabel } from "@/lib/prospects";

const SOURCES = [
  "Tournament",
  "Referral",
  "Website",
  "Camp",
  "Showcase",
  "Word of mouth",
  "Other",
];

export default function NewProspectPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    graduation_year: "",
    position: "",
    school: "",
    prospect_email: "",
    parent_first_name: "",
    parent_last_name: "",
    parent_email: "",
    parent_phone: "",
    source: "",
    stage: "interested",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);

  const update = useCallback(
    <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
    },
    [],
  );

  const submit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      setError(null);
      setFieldError(null);

      if (!form.first_name.trim() || !form.last_name.trim()) {
        setFieldError({
          field: form.first_name.trim() ? "last_name" : "first_name",
          message: "First and last name are required.",
        });
        return;
      }

      setSubmitting(true);
      try {
        const payload: Record<string, string | null> = {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          stage: form.stage,
        };
        for (const k of [
          "graduation_year",
          "position",
          "school",
          "prospect_email",
          "parent_first_name",
          "parent_last_name",
          "parent_email",
          "parent_phone",
          "source",
          "notes",
        ] as const) {
          const v = form[k].trim();
          payload[k] = v === "" ? null : v;
        }

        const res = await fetch("/api/admin/prospects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            field?: string;
          };
          if (data.field) {
            setFieldError({
              field: data.field,
              message: data.error ?? "Invalid value.",
            });
          } else {
            setError(data.error ?? "Failed to create prospect.");
          }
          setSubmitting(false);
          return;
        }
        const data = (await res.json()) as { prospect_id: string };
        router.push(`/admin/prospects/${data.prospect_id}`);
      } catch (err) {
        console.error("[NewProspect] threw:", err);
        setError("Network error. Try again.");
        setSubmitting(false);
      }
    },
    [form, router, submitting],
  );

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-[12px] text-[#6B7280]">
        <Link
          href="/admin/prospects"
          className="inline-flex items-center gap-1 hover:text-[#0A0A0B] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Prospects
        </Link>
      </nav>

      <header>
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
          New Prospect
        </div>
        <h1 className="mt-1 text-[26px] md:text-[28px] font-bold tracking-tight text-[#0A0A0B]">
          Add a prospect
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Only first and last name are required. Fill in everything you know
          today; you can edit later.
        </p>
      </header>

      <form
        onSubmit={submit}
        noValidate
        className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 md:p-8 space-y-6"
      >
        <Section title="Prospect">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First name" required error={fieldError?.field === "first_name" ? fieldError.message : null}>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => update("first_name", e.target.value)}
                required
                className={inputClass(fieldError?.field === "first_name")}
              />
            </Field>
            <Field label="Last name" required error={fieldError?.field === "last_name" ? fieldError.message : null}>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => update("last_name", e.target.value)}
                required
                className={inputClass(fieldError?.field === "last_name")}
              />
            </Field>
            <Field label="Graduation year" error={fieldError?.field === "graduation_year" ? fieldError.message : null}>
              <input
                type="number"
                min={2024}
                max={2040}
                value={form.graduation_year}
                onChange={(e) => update("graduation_year", e.target.value)}
                className={inputClass(fieldError?.field === "graduation_year")}
              />
            </Field>
            <Field label="Position">
              <select
                value={form.position}
                onChange={(e) => update("position", e.target.value)}
                className={inputClass(false)}
              >
                <option value="">—</option>
                {ALLOWED_POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="School">
              <input
                type="text"
                value={form.school}
                onChange={(e) => update("school", e.target.value)}
                className={inputClass(false)}
              />
            </Field>
            <Field label="Prospect email" error={fieldError?.field === "prospect_email" ? fieldError.message : null}>
              <input
                type="email"
                value={form.prospect_email}
                onChange={(e) => update("prospect_email", e.target.value)}
                className={inputClass(fieldError?.field === "prospect_email")}
              />
            </Field>
          </div>
        </Section>

        <Section title="Parent / Guardian">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Parent first name">
              <input
                type="text"
                value={form.parent_first_name}
                onChange={(e) => update("parent_first_name", e.target.value)}
                className={inputClass(false)}
              />
            </Field>
            <Field label="Parent last name">
              <input
                type="text"
                value={form.parent_last_name}
                onChange={(e) => update("parent_last_name", e.target.value)}
                className={inputClass(false)}
              />
            </Field>
            <Field label="Parent email" error={fieldError?.field === "parent_email" ? fieldError.message : null}>
              <input
                type="email"
                value={form.parent_email}
                onChange={(e) => update("parent_email", e.target.value)}
                className={inputClass(fieldError?.field === "parent_email")}
              />
            </Field>
            <Field label="Parent phone">
              <input
                type="tel"
                value={form.parent_phone}
                onChange={(e) => update("parent_phone", e.target.value)}
                className={inputClass(false)}
              />
            </Field>
          </div>
        </Section>

        <Section title="Pipeline">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Source">
              <select
                value={form.source}
                onChange={(e) => update("source", e.target.value)}
                className={inputClass(false)}
              >
                <option value="">—</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Stage">
              <select
                value={form.stage}
                onChange={(e) => update("stage", e.target.value)}
                className={inputClass(false)}
              >
                {PROSPECT_STAGES.filter((s) => s !== "converted").map((s) => (
                  <option key={s} value={s}>
                    {stageLabel[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes" full>
              <textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={4}
                className={inputClass(false)}
              />
            </Field>
          </div>
        </Section>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-[#EF4444]/30 bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#EF4444]"
          >
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E5E7EB]">
          <Link
            href="/admin/prospects"
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#6B7280] hover:text-[#0A0A0B] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] disabled:opacity-60 transition-colors"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitting ? "Saving…" : "Save Prospect"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  required,
  error,
  children,
  full,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={["block", full ? "sm:col-span-2" : ""].join(" ")}>
      <span className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] mb-1.5">
        {label}
        {required && <span className="text-[#EF4444] ml-0.5">*</span>}
      </span>
      {children}
      {error && (
        <span role="alert" className="block mt-1 text-[11px] text-[#EF4444]">
          {error}
        </span>
      )}
    </label>
  );
}

function inputClass(error: boolean): string {
  return [
    "w-full bg-white rounded-lg px-3 py-2 text-[14px] text-[#0A0A0B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9]",
    error ? "border border-[#EF4444]" : "border border-[#E5E7EB]",
  ].join(" ");
}
