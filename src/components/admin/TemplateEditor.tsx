"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Eye, EyeOff } from "lucide-react";
import {
  TEMPLATE_TYPES,
  templateTypeLabel,
  type TemplateType,
} from "@/lib/email-templates";
import {
  renderTemplate,
  extractPlaceholders,
  TEMPLATE_PLACEHOLDERS,
  type SnippetMap,
  type TemplateContext,
} from "@/lib/template-render";

export interface TemplateRecord {
  id: string;
  name: string;
  type: TemplateType;
  subject: string;
  body: string;
  description: string | null;
}

// Sample context used by the live preview. Mirrors the kind of data a
// real prospect or player would supply, so admins can sanity-check
// that `{{class}}`, `{{intro_buddies}}`, `{{balance}}` etc. land in
// sensible places. The intro_buddies value is intentionally non-trivial
// to show that comma-separated buddies look right inline.
const SAMPLE_CONTEXT: TemplateContext = {
  player_name: "Alexa Smith",
  prospect_first_name: "Alexa",
  parent_first_name: "Jamie",
  parent_last_name: "Smith",
  class: "2029",
  grad_year: "2029",
  season: "2025-26",
  intro_buddies: "Ashley, Grace H., or Malin",
  balance: "$1,850",
  payment_link: "https://buy.stripe.com/sample-payment-link",
};

interface Props {
  initial: TemplateRecord;
  snippets: SnippetMap;
}

export default function TemplateEditor({ initial, snippets }: Props) {
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
  const [showPreview, setShowPreview] = useState(true);

  const preview = useMemo(
    () => renderTemplate({ subject, body }, SAMPLE_CONTEXT, snippets),
    [subject, body, snippets],
  );

  // Catalogue the placeholders this template uses, so the helper line
  // can show "you're using X / Y / Z" rather than just a static list of
  // possibilities. Surfaces typos (e.g. `{{prospect_first}}` would
  // appear here and obviously not be in the known set below).
  const usedPlaceholders = useMemo(
    () => extractPlaceholders({ subject, body }),
    [subject, body],
  );

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

  const knownPlaceholders = useMemo(
    () => new Set<string>(TEMPLATE_PLACEHOLDERS as readonly string[]),
    [],
  );

  return (
    <div className="space-y-5">
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
            rows={18}
            className={[
              inputCls(fieldError?.field === "body"),
              "font-mono text-[13px] leading-relaxed",
            ].join(" ")}
          />
          <PlaceholderHelper
            used={usedPlaceholders}
            known={knownPlaceholders}
            snippets={snippets}
          />
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

      {/* Live preview — renders the current draft against sample context +
          the real snippets, so admins can sanity-check their work without
          opening a separate composer. */}
      <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <header className="px-6 md:px-8 py-3 border-b border-[#E5E7EB] bg-[#F8F9FA] flex items-center justify-between">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
            Live Preview · sample data
          </h2>
          <button
            type="button"
            onClick={() => setShowPreview((s) => !s)}
            className="inline-flex items-center gap-1 text-[11px] text-[#6B7280] hover:text-[#0A0A0B] transition-colors"
          >
            {showPreview ? (
              <>
                <EyeOff className="w-3 h-3" />
                Hide
              </>
            ) : (
              <>
                <Eye className="w-3 h-3" />
                Show
              </>
            )}
          </button>
        </header>
        {showPreview && (
          <div className="px-6 md:px-8 py-5 space-y-3">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF] mb-1">
                Subject
              </div>
              <div className="text-[14px] text-[#0A0A0B]">
                {preview.subject || (
                  <span className="italic text-[#9CA3AF]">(empty)</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF] mb-1">
                Body
              </div>
              <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#0A0A0B] bg-[#F8F9FA] border border-[#E5E7EB] rounded-md px-3 py-2 max-h-[420px] overflow-y-auto">
                {preview.body || "(empty)"}
              </pre>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Placeholder helper ──────────────────────────────────────────────────────

function PlaceholderHelper({
  used,
  known,
  snippets,
}: {
  used: string[];
  known: ReadonlySet<string>;
  snippets: SnippetMap;
}) {
  const knownUsed = used.filter((k) => known.has(k));
  const unknownUsed = used.filter((k) => !known.has(k));

  return (
    <div className="mt-2 space-y-1.5 text-[11px] text-[#6B7280]">
      <div>
        <span className="font-medium text-[#0A0A0B]">Known placeholders:</span>{" "}
        {Array.from(known).map((k) => (
          <code
            key={k}
            className={[
              "inline-block mr-1 px-1.5 py-0.5 rounded",
              knownUsed.includes(k)
                ? "bg-[#4A90D9]/[0.08] text-[#4A90D9]"
                : "bg-[#F8F9FA]",
            ].join(" ")}
          >
            {`{{${k}}}`}
          </code>
        ))}
      </div>
      <div>
        <span className="font-medium text-[#0A0A0B]">Snippets:</span>{" "}
        {Object.keys(snippets).length === 0 ? (
          <span className="italic text-[#9CA3AF]">none defined</span>
        ) : (
          Object.keys(snippets).map((k) => (
            <code
              key={k}
              className="inline-block mr-1 px-1.5 py-0.5 rounded bg-[#F8F9FA]"
            >
              {`{{snippet:${k}}}`}
            </code>
          ))
        )}
      </div>
      {unknownUsed.length > 0 && (
        <div className="text-[#F59E0B]">
          <span className="font-medium">Unknown placeholders in this template:</span>{" "}
          {unknownUsed.map((k) => (
            <code key={k} className="mr-1">
              {`{{${k}}}`}
            </code>
          ))}{" "}
          — these will render as literals unless filled in the composer.
        </div>
      )}
    </div>
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
