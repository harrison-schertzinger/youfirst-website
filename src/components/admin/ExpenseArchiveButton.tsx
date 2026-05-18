"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2 } from "lucide-react";

interface Props {
  expenseId: string;
  description: string;
  /** When true, the button restores (status='active') instead of archiving. */
  restoreMode?: boolean;
}

export default function ExpenseArchiveButton({
  expenseId,
  description,
  restoreMode = false,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, submitting]);

  const submit = useCallback(async () => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/expenses/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: restoreMode ? "active" : "archived" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Action failed. Try again.");
        setSubmitting(false);
        return;
      }
      router.push(
        restoreMode
          ? `/admin/expenses/${expenseId}`
          : `/admin/expenses?archived=${encodeURIComponent(description.slice(0, 60))}`,
      );
      router.refresh();
    } catch (err) {
      console.error("[ExpenseArchiveButton] threw:", err);
      setError("Network error.");
      setSubmitting(false);
    }
  }, [description, expenseId, restoreMode, router, submitting]);

  const label = restoreMode ? "Restore" : "Archive";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          "inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-colors",
          restoreMode
            ? "border border-[#34D399] text-[#34D399] hover:bg-[#34D399]/[0.08]"
            : "border border-[#EF4444]/40 text-[#EF4444] hover:bg-[#EF4444]/[0.06]",
        ].join(" ")}
      >
        <Archive className="w-3.5 h-3.5" />
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-expense-title"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!submitting) setOpen(false);
            }}
            aria-hidden
          />
          <div className="relative w-full max-w-[440px] rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.18)] p-7">
            <h2
              id="archive-expense-title"
              className="text-[17px] font-semibold tracking-tight text-[#0A0A0B]"
            >
              {restoreMode
                ? "Restore this expense?"
                : "Archive this expense?"}
            </h2>
            <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">
              {restoreMode
                ? "This will add the expense back to the active list and the financials breakdown."
                : "This hides the expense from the default list and the financials breakdown. It can be restored from the detail page."}
            </p>
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
                className={[
                  "inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-[13px] font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-colors",
                  restoreMode
                    ? "border-[#34D399] text-[#34D399] hover:bg-[#34D399]/[0.08]"
                    : "border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/[0.06]",
                ].join(" ")}
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {submitting ? "Working…" : `Confirm ${label}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
