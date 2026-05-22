"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, Check } from "lucide-react";

export interface SnippetRecord {
  id: string;
  key: string;
  label: string;
  content: string;
  updated_at: string | null;
}

interface Props {
  snippet: SnippetRecord;
}

/**
 * One row in the Reusable Snippets section of /admin/templates.
 * Click Edit → textarea appears with the current content. Save PATCHes
 * the row keyed by `key`. The point of this surface is that Harrison
 * updates the summer schedule once per season and every template that
 * references `{{snippet:summer_schedule}}` reflects the new content
 * on the next render.
 */
export default function SnippetEditor({ snippet }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(snippet.content);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = useCallback(() => {
    setDraft(snippet.content);
    setError(null);
    setEditing(true);
  }, [snippet.content]);

  const cancel = useCallback(() => {
    setDraft(snippet.content);
    setError(null);
    setEditing(false);
  }, [snippet.content]);

  const save = useCallback(async () => {
    setError(null);
    if (draft.length === 0) {
      setError("Content cannot be empty.");
      return;
    }
    if (draft === snippet.content) {
      // Nothing to do.
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/snippets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: snippet.key, content: draft }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Save failed.");
        setSaving(false);
        return;
      }
      setEditing(false);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1500);
      router.refresh();
    } catch (err) {
      console.error("[SnippetEditor] threw:", err);
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }, [draft, snippet.key, snippet.content, router]);

  return (
    <div className="px-6 py-4">
      <header className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-[12px] font-semibold text-[#0A0A0B]">
            {snippet.label}
          </div>
          <div className="text-[10px] font-mono text-[#9CA3AF]">
            {`{{snippet:${snippet.key}}}`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {savedFlash && (
            <span className="inline-flex items-center gap-1 text-[11px] text-[#34D399]">
              <Check className="w-3 h-3" strokeWidth={2.5} />
              Saved
            </span>
          )}
          {!editing && (
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-[#4A90D9] hover:bg-[#4A90D9]/[0.08] transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          )}
        </div>
      </header>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.min(20, Math.max(6, draft.split("\n").length + 1))}
            className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[13px] font-mono leading-relaxed text-[#0A0A0B] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition-colors"
          />
          {error && (
            <p role="alert" className="text-[11px] text-[#EF4444]">
              {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="px-3 py-1.5 rounded-md text-[12px] text-[#6B7280] hover:text-[#0A0A0B] disabled:opacity-60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#4A90D9] text-white text-[12px] font-semibold hover:bg-[#3A7BC8] disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <pre className="whitespace-pre-wrap text-[12px] font-mono leading-relaxed text-[#6B7280] bg-[#F8F9FA] border border-[#E5E7EB] rounded-md px-3 py-2 max-h-[200px] overflow-y-auto">
          {snippet.content}
        </pre>
      )}
    </div>
  );
}
