"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import {
  TEMPLATE_TYPES,
  templateTypeLabel,
  type TemplateType,
} from "@/lib/email-templates";

export interface TemplateRecord {
  id: string;
  name: string;
  type: TemplateType;
  subject: string;
  body: string;
  description: string | null;
}

export default function TemplateEditor({
  initial,
}: {
  initial: TemplateRecord;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [type, setType] = useState<TemplateType>(initial.type);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [description, setDescription] = useState(initial.description ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);

  const save = useCallback(async () => {
    setError(null);
    setFieldError(null);
    if (!name.trim()) {
      setFieldError({ field: "name", message: "Name is required." });
      return;
    }
    if (!subject.trim()) {
      setFieldError({ field: "subject", message: "Subject is required." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/templates/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          subject,
          body,
          description: description.trim() === "" ? null : description,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          field?: string;
        };
        if (data.field) {
          setFieldError({ field: data.field, message: data.error ?? "Invalid value." });
        } else {
          setError(data.error ?? "Save failed.");
        }
        setSaving(false);
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    } catch (err) {
      console.error("[TemplateEditor] threw:", err);
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }, [name, type, subject, body, description, initial.id, router]);

  return (
    <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 md:p-8 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Name" error={fieldError?.field === "name" ? fieldError.message : null}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls(fieldError?.field === "name")}
          />
        </Field>
        <Field label="Type">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TemplateType)}
            className={inputCls(false)}
          >
            {TEMPLATE_TYPES.map((t) => (
              <option key={t} value={t}>
                {templateTypeLabel[t]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Subject" error={fieldError?.field === "subject" ? fieldError.message : null}>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={inputCls(fieldError?.field === "subject")}
        />
      </Field>

      <Field label="Body" error={fieldError?.field === "body" ? fieldError.message : null}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={15}
          className={[
            inputCls(fieldError?.field === "body"),
            "font-mono text-[13px] leading-relaxed",
          ].join(" ")}
        />
        <p className="mt-1.5 text-[11px] text-[#6B7280]">
          Placeholders: <code>{"{{player_name}}"}</code>{" "}
          <code>{"{{parent_first_name}}"}</code>{" "}
          <code>{"{{parent_last_name}}"}</code>{" "}
          <code>{"{{balance}}"}</code>{" "}
          <code>{"{{payment_link}}"}</code>{" "}
          <code>{"{{season}}"}</code>
        </p>
      </Field>

      <Field label="Description (internal)">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputCls(false)}
        />
      </Field>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-[#EF4444]/30 bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#EF4444]"
        >
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E5E7EB]">
        {savedAt && Date.now() - savedAt < 3000 && (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#34D399]">
            <Check className="w-3.5 h-3.5" />
            Saved
          </span>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] disabled:opacity-60 transition-colors"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {saving ? "Saving…" : "Save Template"}
        </button>
      </div>
    </section>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] mb-1.5">
        {label}
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

function inputCls(error: boolean): string {
  return [
    "w-full bg-white rounded-lg px-3 py-2 text-[14px] text-[#0A0A0B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9]",
    error ? "border border-[#EF4444]" : "border border-[#E5E7EB]",
  ].join(" ");
}
