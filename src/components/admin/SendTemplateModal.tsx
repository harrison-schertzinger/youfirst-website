"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Copy, Check, X } from "lucide-react";
import {
  renderTemplate,
  extractPlaceholders,
  type TemplateContext,
  type SnippetMap,
} from "@/lib/template-render";

/**
 * Compose-an-email-from-template modal. Triggered from a prospect's
 * detail page; renders the selected template with that prospect's
 * info filled in, surfaces unfilled free-text placeholders (like
 * intro_buddies) as input fields above the body, and copies the
 * finished subject + body to the clipboard.
 *
 * No SMTP send. Harrison pastes into Gmail manually until Sprint 11+
 * wires actual sending.
 */

interface TemplateOption {
  id: string;
  name: string;
  type: string;
  subject: string;
  body: string;
}

interface SnippetOption {
  key: string;
  content: string;
}

export interface ProspectContext {
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  parent_first_name: string | null;
  parent_last_name: string | null;
  parent_email: string | null;
}

interface Props {
  onClose: () => void;
  prospect: ProspectContext;
  /** Default season string; can be overridden in the modal. */
  defaultSeason?: string;
}

// Placeholders the modal NEVER prompts for — those have canonical sources
// (prospect record, or N/A for prospect context). intro_buddies, however,
// IS expected to be free-text, so it's not in this set.
const NEVER_PROMPT: ReadonlySet<string> = new Set([
  "player_name",
  "prospect_first_name",
  "parent_first_name",
  "parent_last_name",
  "class",
  "grad_year",
  "season",
  "balance",
  "payment_link",
]);

export default function SendTemplateModal({
  onClose,
  prospect,
  defaultSeason = "2025-26",
}: Props) {
  // This component is mounted only while the modal is "open" — the parent
  // conditionally renders it. State naturally resets on each open, no
  // setState-in-effect plumbing needed.
  const [templates, setTemplates] = useState<TemplateOption[] | null>(null);
  const [snippets, setSnippets] = useState<SnippetMap | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // Free-text placeholder values keyed by placeholder name (e.g.
  // intro_buddies → "Ashley, Grace H., or Malin"). Merged into context
  // for live re-rendering.
  const [extras, setExtras] = useState<Record<string, string>>({});

  // User-edited drafts + dirty bits. When NOT dirty, we display the
  // rendered template; once the admin types into a field that field
  // stays as their draft and isn't overwritten by re-renders.
  const [subjectDraft, setSubjectDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [subjectDirty, setSubjectDirty] = useState(false);
  const [bodyDirty, setBodyDirty] = useState(false);

  // Compare-prev pattern: when the admin switches templates, reset the
  // dirty bits and free-text extras during render rather than from an
  // effect. React tolerates setState-during-render when guarded by a
  // value comparison.
  const [prevTemplateId, setPrevTemplateId] = useState<string>("");
  if (prevTemplateId !== selectedTemplateId) {
    setPrevTemplateId(selectedTemplateId);
    setSubjectDirty(false);
    setBodyDirty(false);
    setExtras({});
    setSubjectDraft("");
    setBodyDraft("");
  }

  const [season, setSeason] = useState(defaultSeason);

  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState<string | null>(null);

  // Load templates + snippets on mount. Modal mounts on open, unmounts
  // on close, so this fires exactly once per open.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tRes, sRes] = await Promise.all([
          fetch("/api/admin/templates"),
          fetch("/api/admin/snippets"),
        ]);
        if (!tRes.ok || !sRes.ok) {
          if (!cancelled) {
            setLoadError("Could not load templates or snippets.");
            setTemplates([]);
            setSnippets({});
          }
          return;
        }
        const tData = (await tRes.json()) as { templates: TemplateOption[] };
        const sData = (await sRes.json()) as { snippets: SnippetOption[] };
        if (cancelled) return;
        setTemplates(tData.templates);
        const map: Record<string, string> = {};
        for (const s of sData.snippets) map[s.key] = s.content;
        setSnippets(map);
        if (tData.templates[0]) setSelectedTemplateId(tData.templates[0].id);
      } catch (err) {
        if (cancelled) return;
        console.error("[SendTemplateModal] load:", err);
        setLoadError("Could not load templates or snippets.");
        setTemplates([]);
        setSnippets({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTemplate = useMemo(
    () => templates?.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  // Build canonical context from the prospect record + season. Any
  // free-text extras typed in the modal layer on top.
  const context: TemplateContext = useMemo(() => {
    const ctx: TemplateContext = {
      player_name: `${prospect.first_name} ${prospect.last_name}`.trim(),
      prospect_first_name: prospect.first_name,
      parent_first_name: prospect.parent_first_name,
      parent_last_name: prospect.parent_last_name,
      class: prospect.graduation_year != null ? String(prospect.graduation_year) : null,
      grad_year: prospect.graduation_year != null ? String(prospect.graduation_year) : null,
      season,
    };
    for (const [k, v] of Object.entries(extras)) {
      if (v !== "") ctx[k] = v;
    }
    return ctx;
  }, [prospect, season, extras]);

  // The list of placeholder keys we surface as inputs above the body.
  // Anything that isn't already canonically supplied AND isn't a snippet
  // shows up — that's where intro_buddies / any future custom placeholder
  // gets typed.
  const promptKeys = useMemo(() => {
    if (!selectedTemplate) return [] as string[];
    return extractPlaceholders({
      subject: selectedTemplate.subject,
      body: selectedTemplate.body,
    }).filter((k) => !NEVER_PROMPT.has(k));
  }, [selectedTemplate]);

  // Compute the rendered template against current context + snippets.
  // When the admin hasn't edited a field, we display this rendered value
  // directly; once dirty, we display their draft. This avoids the
  // setState-in-effect anti-pattern of mirroring rendered output into
  // draft state on every dependency change.
  const rendered = useMemo(() => {
    if (!selectedTemplate || snippets === null) {
      return { subject: "", body: "" };
    }
    return renderTemplate(
      { subject: selectedTemplate.subject, body: selectedTemplate.body },
      context,
      snippets,
    );
  }, [selectedTemplate, context, snippets]);

  const subjectShown = subjectDirty ? subjectDraft : rendered.subject;
  const bodyShown = bodyDirty ? bodyDraft : rendered.body;

  // Escape closes; if the admin has manually edited subject/body, prompt
  // to discard rather than silently lose work.
  const tryClose = useCallback(() => {
    if (subjectDirty || bodyDirty) {
      const ok = window.confirm("Discard your edits?");
      if (!ok) return;
    }
    onClose();
  }, [subjectDirty, bodyDirty, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        tryClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tryClose]);

  const copy = useCallback(async () => {
    setCopyFallback(null);
    const text = `Subject: ${subjectShown}\n\n${bodyShown}`;
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      } else {
        setCopyFallback(text);
      }
    } catch (err) {
      console.error("[SendTemplateModal] copy:", err);
      setCopyFallback(text);
    }
  }, [subjectShown, bodyShown]);

  const noTemplates = templates !== null && templates.length === 0;
  const recipient =
    [prospect.parent_first_name, prospect.parent_last_name]
      .filter(Boolean)
      .join(" ") ||
    `${prospect.first_name} ${prospect.last_name}`.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-template-title"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={tryClose}
        aria-hidden
      />
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <header className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#E5E7EB]">
          <div>
            <h3
              id="send-template-title"
              className="text-[17px] font-semibold text-[#0A0A0B]"
            >
              Compose Email to {recipient}
            </h3>
            <p className="mt-0.5 text-[12px] text-[#6B7280]">
              Prospect: {prospect.first_name} {prospect.last_name}
              {prospect.graduation_year && ` · Class of ${prospect.graduation_year}`}
            </p>
          </div>
          <button
            type="button"
            onClick={tryClose}
            aria-label="Close"
            className="p-1.5 -mr-1.5 rounded-md text-[#6B7280] hover:text-[#0A0A0B] hover:bg-[#F8F9FA] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="overflow-y-auto px-6 py-5 space-y-5">
          {loadError && (
            <div className="rounded-lg border border-[#EF4444]/30 bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#EF4444]">
              {loadError}
            </div>
          )}

          {/* Template + season */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
            <Field label="Template">
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={!templates || templates.length === 0}
                className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] disabled:opacity-60"
              >
                {templates === null ? (
                  <option value="">Loading…</option>
                ) : templates.length === 0 ? (
                  <option value="">No templates available</option>
                ) : (
                  templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))
                )}
              </select>
              {noTemplates && (
                <p className="mt-1 text-[11px] text-[#F59E0B]">
                  No templates yet — create one at{" "}
                  <Link
                    href="/admin/templates"
                    className="text-[#4A90D9] hover:underline"
                  >
                    /admin/templates
                  </Link>
                  .
                </p>
              )}
            </Field>
            <Field label="Season">
              <input
                type="text"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9]"
              />
            </Field>
          </div>

          {/* Free-text placeholder inputs (intro_buddies, etc.) */}
          {promptKeys.length > 0 && (
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-4 space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                Fill in
              </div>
              {promptKeys.map((key) => (
                <label key={key} className="block">
                  <span className="block text-[11px] font-mono text-[#6B7280] mb-1">
                    {`{{${key}}}`}
                  </span>
                  <input
                    type="text"
                    value={extras[key] ?? ""}
                    onChange={(e) =>
                      setExtras((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder={key === "intro_buddies"
                      ? "e.g. Ashley, Grace H., or Malin"
                      : `value for ${key}`}
                    className="w-full bg-white border border-[#E5E7EB] rounded-md px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#4A90D9] focus:border-[#4A90D9]"
                  />
                </label>
              ))}
              <p className="text-[10px] text-[#9CA3AF]">
                Live-renders into the body below as you type. Anything you
                leave blank stays visible as a literal{" "}
                <code>{"{{placeholder}}"}</code> in the preview.
              </p>
            </div>
          )}

          {/* Subject */}
          <Field label="Subject">
            <input
              type="text"
              value={subjectShown}
              onChange={(e) => {
                setSubjectDraft(e.target.value);
                setSubjectDirty(true);
              }}
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9]"
            />
          </Field>

          {/* Body */}
          <Field label="Body">
            <textarea
              value={bodyShown}
              onChange={(e) => {
                setBodyDraft(e.target.value);
                setBodyDirty(true);
              }}
              rows={18}
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[13px] leading-relaxed text-[#0A0A0B] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] font-mono"
            />
          </Field>

          {copyFallback && (
            <div className="rounded-lg border border-[#F59E0B]/40 bg-[#FFFBEB] p-3 space-y-2">
              <p className="text-[12px] text-[#92400E]">
                Clipboard unavailable in this context — select and copy
                manually:
              </p>
              <textarea
                readOnly
                value={copyFallback}
                rows={6}
                className="w-full bg-white border border-[#E5E7EB] rounded-md px-2 py-1.5 text-[11px] font-mono"
              />
            </div>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={tryClose}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#6B7280] hover:text-[#0A0A0B] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={copy}
            disabled={noTemplates || !selectedTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy to Clipboard
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

