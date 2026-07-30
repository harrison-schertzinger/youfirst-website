"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Mark a parent balance question resolved, or reopen it. Who resolved it is
 * taken from the admin session server-side — never sent from here.
 */
export default function ResolveQuestionButton({
  questionId,
  status,
}: {
  questionId: string;
  status: "new" | "resolved";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStatus = status === "resolved" ? "new" : "resolved";

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/balance-questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Update failed.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={[
          "shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          status === "resolved"
            ? "border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6]"
            : "bg-[#1A1A1A] text-white hover:bg-black",
        ].join(" ")}
      >
        {busy
          ? "Saving…"
          : status === "resolved"
            ? "Reopen"
            : "Mark resolved"}
      </button>
      {error && <span className="text-[11px] text-[#EF4444]">{error}</span>}
    </div>
  );
}
