"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function TournamentForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setBannerError(null);
    setFieldErrors({});

    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required.";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          location: location.trim() || null,
          age_group: ageGroup.trim() || null,
          start_date: startDate || null,
          end_date: endDate || null,
          notes: notes.trim() || null,
        }),
      });
      if (res.status === 400) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          field?: string;
        };
        if (data.field)
          setFieldErrors({ [data.field]: data.error ?? "Invalid value." });
        else setBannerError(data.error ?? "Some fields are invalid.");
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setBannerError(data.error ?? "Server error.");
        setSubmitting(false);
        return;
      }
      const data = (await res.json()) as { tournament: { id: string } };
      router.push(`/admin/tournaments/${data.tournament.id}`);
    } catch (err) {
      console.error("[TournamentForm] threw:", err);
      setBannerError("Network error.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-8 space-y-6"
    >
      {bannerError && (
        <div className="rounded-lg border border-[#EF4444]/30 bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#EF4444]">
          {bannerError}
        </div>
      )}
      <Field label="Name" required error={fieldErrors.name}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={200}
          className={inputClass(!!fieldErrors.name)}
          placeholder="e.g. Midwest Showdown"
        />
      </Field>
      <Field label="Location">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={inputClass(false)}
          placeholder="Venue / city"
        />
      </Field>
      <Field
        label="Age Group"
        error={fieldErrors.age_group}
        helper="Which team(s) are going to this tournament."
      >
        <input
          type="text"
          value={ageGroup}
          onChange={(e) => setAgeGroup(e.target.value)}
          maxLength={60}
          className={inputClass(!!fieldErrors.age_group)}
          placeholder="2028, 2029, or 'All teams'"
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Start date" error={fieldErrors.start_date}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass(!!fieldErrors.start_date)}
          />
        </Field>
        <Field label="End date" error={fieldErrors.end_date}>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass(!!fieldErrors.end_date)}
          />
        </Field>
      </div>
      <Field label="Notes">
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${inputClass(false)} resize-y min-h-[80px]`}
        />
      </Field>
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/tournaments")}
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#6B7280] hover:text-[#0A0A0B] disabled:opacity-60 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {submitting ? "Creating…" : "Create Tournament"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  helper,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] mb-1.5">
        {label}
        {required && <span className="text-[#EF4444] ml-1">*</span>}
      </span>
      {children}
      {helper && !error && (
        <span className="mt-1.5 block text-[11px] text-[#6B7280]">
          {helper}
        </span>
      )}
      {error && (
        <span role="alert" className="mt-1.5 block text-[11px] text-[#EF4444]">
          {error}
        </span>
      )}
    </label>
  );
}

function inputClass(hasError: boolean): string {
  return [
    "w-full bg-white border rounded-lg px-3 py-2 text-[14px] text-[#0A0A0B]",
    "placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-2 transition-colors",
    hasError
      ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20"
      : "border-[#E5E7EB] focus:border-[#4A90D9] focus:ring-[#4A90D9]/20",
  ].join(" ");
}
