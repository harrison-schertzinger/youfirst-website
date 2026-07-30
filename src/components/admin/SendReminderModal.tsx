"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Loader2, Copy, Check, X } from "lucide-react";
import {
  renderTemplate,
  type TemplateContext,
  type SnippetMap,
} from "@/lib/template-render";

export interface ReminderGuardian {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  is_primary: boolean;
}

interface TemplateOption {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
  parentFirstName: string | null;
  parentLastName: string | null;
  guardians: ReminderGuardian[];
  outstandingCents: number;
  season: string | null;
}

type LinkMode = "none" | "custom";

function dollarsLabel(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function SendReminderModal(props: Props) {
  const {
    open,
    onClose,
    playerId,
    playerName,
    guardians,
    outstandingCents,
    season,
  } = props;

  const [templates, setTemplates] = useState<TemplateOption[] | null>(null);
  const [snippets, setSnippets] = useState<SnippetMap | null>(null);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedGuardianId, setSelectedGuardianId] = useState<string>(
    guardians.find((g) => g.is_primary)?.id ?? guardians[0]?.id ?? "",
  );

  // User-edited subject and body. If they haven't typed, we re-render from the
  // template on every dependency change. Once they edit, the manual state
  // sticks and won't be overwritten by template/context changes (modulo
  // confirm-on-close).
  const [subjectDraft, setSubjectDraft] = useState<string>("");
  const [bodyDraft, setBodyDraft] = useState<string>("");
  const [subjectDirty, setSubjectDirty] = useState(false);
  const [bodyDirty, setBodyDirty] = useState(false);

  const [includeLink, setIncludeLink] = useState(true);
  const [linkMode, setLinkMode] = useState<LinkMode>(
    outstandingCents > 0 ? "none" : "custom",
  );
  const [customDollars, setCustomDollars] = useState<string>("");
  const [generatedUrl, setGeneratedUrl] = useState<string>("");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState<string | null>(null);

  // Hide outright when closed so re-opening starts fresh.
  useEffect(() => {
    if (!open) {
      setCopied(false);
      setCopyFallback(null);
      setLinkError(null);
      setGeneratedUrl("");
      setSubjectDirty(false);
      setBodyDirty(false);
    }
  }, [open]);

  // Fetch payment_reminder templates + snippets on first open.
  useEffect(() => {
    if (!open) return;
    if (templates !== null && snippets !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const [tRes, sRes] = await Promise.all([
          fetch("/api/admin/templates?type=payment_reminder"),
          fetch("/api/admin/snippets"),
        ]);
        if (!tRes.ok) {
          setTemplatesError("Could not load templates.");
          setTemplates([]);
        } else {
          const tData = (await tRes.json()) as { templates: TemplateOption[] };
          if (cancelled) return;
          setTemplates(tData.templates);
          if (tData.templates[0]) setSelectedTemplateId(tData.templates[0].id);
        }
        if (sRes.ok) {
          const sData = (await sRes.json()) as {
            snippets: Array<{ key: string; content: string }>;
          };
          if (cancelled) return;
          const map: Record<string, string> = {};
          for (const s of sData.snippets) map[s.key] = s.content;
          setSnippets(map);
        } else {
          // Snippets are optional — fall back to empty map so render still
          // succeeds (any {{snippet:foo}} stays literal, which is visible).
          setSnippets({});
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[SendReminderModal] load:", err);
        setTemplatesError("Could not load templates.");
        setTemplates([]);
        setSnippets({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, templates, snippets]);

  const selectedGuardian = useMemo(
    () => guardians.find((g) => g.id === selectedGuardianId) ?? null,
    [guardians, selectedGuardianId],
  );

  const selectedTemplate = useMemo(
    () => templates?.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  const paymentLink = generatedUrl;

  const context: TemplateContext = useMemo(
    () => ({
      player_name: playerName,
      parent_first_name: selectedGuardian?.first_name ?? null,
      parent_last_name: selectedGuardian?.last_name ?? null,
      balance: dollarsLabel(outstandingCents),
      payment_link: paymentLink || null,
      season: season,
    }),
    [
      playerName,
      selectedGuardian?.first_name,
      selectedGuardian?.last_name,
      outstandingCents,
      paymentLink,
      season,
    ],
  );

  // Re-render subject/body from template when template/context changes,
  // unless the admin has manually edited that field. Pass snippets so
  // {{snippet:club_links}} etc. expand from the email_snippets table.
  useEffect(() => {
    if (!selectedTemplate || snippets === null) return;
    const rendered = renderTemplate(
      { subject: selectedTemplate.subject, body: selectedTemplate.body },
      context,
      snippets,
    );
    if (!subjectDirty) setSubjectDraft(rendered.subject);
    if (!bodyDirty) {
      // If body has no {{payment_link}} placeholder, append a friendly
      // "Pay here: <url>" line when payment link is set.
      let next = rendered.body;
      if (paymentLink && !selectedTemplate.body.includes("{{payment_link}}")) {
        const suffix = `\n\nPay here: ${paymentLink}`;
        if (!next.endsWith(suffix)) next = next + suffix;
      }
      setBodyDraft(next);
    }
  }, [selectedTemplate, context, snippets, paymentLink, subjectDirty, bodyDirty]);

  // Escape + backdrop close, with dirty-check prompt.
  const tryClose = useCallback(() => {
    if (subjectDirty || bodyDirty) {
      const ok = window.confirm("Discard your edits?");
      if (!ok) return;
    }
    onClose();
  }, [subjectDirty, bodyDirty, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        tryClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, tryClose]);

  const generateLink = useCallback(
    async (amount_cents: number, description: string) => {
      if (amount_cents <= 0) {
        setLinkError("Amount must be greater than zero.");
        return;
      }
      setGeneratingLink(true);
      setLinkError(null);
      try {
        const res = await fetch(`/api/admin/players/${playerId}/payment-link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount_cents,
            description,
            // MUST be "summer": this link is generated against her season
            // balance, and player_balances() credits only 'summer' money
            // against the season plan. Recording it as "custom" left the
            // balance unchanged after she paid — the portal kept showing a Pay
            // button and the next collections wave would have emailed her
            // again for money already received.
            payment_category: "summer",
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setLinkError(data.error ?? "Failed to generate link.");
          return;
        }
        const data = (await res.json()) as { url: string };
        setGeneratedUrl(data.url);
      } catch (err) {
        console.error("[SendReminderModal] link gen:", err);
        setLinkError("Network error.");
      } finally {
        setGeneratingLink(false);
      }
    },
    [playerId],
  );

  const copy = useCallback(async () => {
    setCopyFallback(null);
    const text = `Subject: ${subjectDraft}\n\n${bodyDraft}`;
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
      console.error("[SendReminderModal] copy:", err);
      setCopyFallback(text);
    }
  }, [subjectDraft, bodyDraft]);

  if (!open) return null;

  const noPrimaryGuardian = guardians.length === 0;
  const noTemplates = templates !== null && templates.length === 0;
  const copyDisabled = noPrimaryGuardian || noTemplates;

  const parentName =
    [selectedGuardian?.first_name, selectedGuardian?.last_name]
      .filter(Boolean)
      .join(" ") || (selectedGuardian?.email ?? "Parent");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-reminder-title"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={tryClose}
        aria-hidden
      />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <header className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#E5E7EB]">
          <div>
            <h3 id="send-reminder-title" className="text-[17px] font-semibold text-[#0A0A0B]">
              Send Payment Reminder to {parentName}
            </h3>
            <p className="mt-0.5 text-[12px] text-[#6B7280]">
              {playerName} · {dollarsLabel(outstandingCents)} outstanding
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
          {/* To */}
          <Field label="To">
            <select
              value={selectedGuardianId}
              onChange={(e) => setSelectedGuardianId(e.target.value)}
              disabled={noPrimaryGuardian}
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] disabled:opacity-60"
            >
              {noPrimaryGuardian ? (
                <option value="">No guardians linked</option>
              ) : (
                guardians.map((g) => (
                  <option key={g.id} value={g.id}>
                    {[g.first_name, g.last_name].filter(Boolean).join(" ") ||
                      g.email}{" "}
                    &lt;{g.email}&gt;
                    {g.is_primary ? " · primary" : ""}
                  </option>
                ))
              )}
            </select>
            {noPrimaryGuardian && (
              <p className="mt-1 text-[11px] text-[#F59E0B]">
                Add a guardian first — see the Guardians card on this
                player&apos;s profile.
              </p>
            )}
          </Field>

          {/* Template */}
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
            {templatesError && (
              <p className="mt-1 text-[11px] text-[#EF4444]">
                {templatesError}
              </p>
            )}
          </Field>

          {/* Payment link */}
          <div className="rounded-xl border border-[#E5E7EB] p-4 space-y-3">
            <label className="flex items-center gap-2 text-[12px] font-medium text-[#0A0A0B]">
              <input
                type="checkbox"
                checked={includeLink}
                onChange={(e) => {
                  setIncludeLink(e.target.checked);
                  if (!e.target.checked) setGeneratedUrl("");
                }}
              />
              Include payment link
            </label>

            {includeLink && (
              <div className="space-y-2 pl-1">
                {outstandingCents > 0 && (
                  <label className="flex items-center gap-2 text-[12px]">
                    <input
                      type="radio"
                      name="link-mode"
                      checked={linkMode === "none"}
                      onChange={() => setLinkMode("none")}
                    />
                    <span>
                      Generate new link for outstanding balance (
                      {dollarsLabel(outstandingCents)})
                    </span>
                  </label>
                )}
                <label className="flex items-center gap-2 text-[12px]">
                  <input
                    type="radio"
                    name="link-mode"
                    checked={linkMode === "custom"}
                    onChange={() => setLinkMode("custom")}
                  />
                  <span>Generate new link for custom amount</span>
                  {linkMode === "custom" && (
                    <span className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#6B7280] text-[12px]">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={customDollars}
                        onChange={(e) => setCustomDollars(e.target.value)}
                        placeholder="500"
                        className="ml-1 w-24 bg-white border border-[#E5E7EB] rounded px-2 pl-5 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#4A90D9]"
                      />
                    </span>
                  )}
                </label>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (linkMode === "custom") {
                        const d = Number(customDollars);
                        if (!Number.isFinite(d) || d <= 0) {
                          setLinkError(
                            "Enter a positive dollar amount for the custom link.",
                          );
                          return;
                        }
                        generateLink(
                          Math.round(d * 100),
                          `Reminder for ${playerName}`,
                        );
                      } else {
                        generateLink(
                          outstandingCents,
                          `Outstanding balance for ${playerName}`,
                        );
                      }
                    }}
                    disabled={generatingLink}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A90D9] text-white text-[12px] font-semibold hover:bg-[#3A7BC8] disabled:opacity-60 transition-colors"
                  >
                    {generatingLink && (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    )}
                    {generatedUrl ? "Regenerate Link" : "Generate Link"}
                  </button>
                  {generatedUrl && (
                    <a
                      href={generatedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono text-[#4A90D9] hover:underline truncate flex-1 min-w-0"
                    >
                      {generatedUrl}
                    </a>
                  )}
                </div>
                {linkError && (
                  <p role="alert" className="text-[11px] text-[#EF4444]">
                    {linkError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Subject */}
          <Field label="Subject">
            <input
              type="text"
              value={subjectDraft}
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
              value={bodyDraft}
              onChange={(e) => {
                setBodyDraft(e.target.value);
                setBodyDirty(true);
              }}
              rows={10}
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
            disabled={copyDisabled}
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
