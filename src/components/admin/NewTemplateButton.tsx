"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { TEMPLATE_TYPES, templateTypeLabel } from "@/lib/email-templates";

export default function NewTemplateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("general");
  const [subject, setSubject] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!subject.trim()) {
      setError("Subject is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          subject: subject.trim(),
          body: "",
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Failed to create template.");
        setSubmitting(false);
        return;
      }
      const data = (await res.json()) as { template_id: string };
      router.push(`/admin/templates/${data.template_id}`);
    } catch (err) {
      console.error("[NewTemplateButton] threw:", err);
      setError("Network error.");
      setSubmitting(false);
    }
  }, [name, type, subject, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError(null);
          setName("");
          setType("general");
          setSubject("");
        }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] transition-colors shadow-sm"
      >
        <Plus className="w-4 h-4" />
        New Template
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !submitting && setOpen(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <h3 className="text-[16px] font-semibold text-[#0A0A0B]">
              New Email Template
            </h3>
            <p className="mt-1 text-[12px] text-[#6B7280]">
              Fill the body on the next screen after you save these basics.
            </p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] mb-1.5">
                  Name
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9]"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] mb-1.5">
                  Type
                </span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9]"
                >
                  {TEMPLATE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {templateTypeLabel[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] mb-1.5">
                  Subject
                </span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9]"
                />
              </label>
            </div>

            {error && (
              <p role="alert" className="mt-3 text-[12px] text-[#EF4444]">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#6B7280] hover:text-[#0A0A0B] disabled:opacity-60 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] disabled:opacity-60 transition-colors"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {submitting ? "Creating…" : "Create + Edit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
