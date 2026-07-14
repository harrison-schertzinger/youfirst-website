"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Sync Now — fires the Roster Command Sheet full sync and shows the engine's
 * plain-English result right on the page.
 */
export default function SheetSyncButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function syncNow() {
    if (busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/roster-sheet", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      setResult({
        ok: !!data.ok,
        message: data.message ?? data.error ?? "No response from the sync engine.",
      });
    } catch {
      setResult({
        ok: false,
        message: "Couldn't reach the sync engine — check your connection and try again.",
      });
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={syncNow}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl bg-[#0B0E12] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#1c2027] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw size={15} strokeWidth={2.5} className={busy ? "animate-spin" : ""} />
        {busy ? "Syncing the Sheet…" : "Sync Sheet Now"}
      </button>
      {result && (
        <p
          className={`max-w-md text-right text-[12px] leading-relaxed ${
            result.ok ? "text-[#177245]" : "text-[#C0392B]"
          }`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
