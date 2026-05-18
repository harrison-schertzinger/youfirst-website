"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2 } from "lucide-react";

interface Props {
  playerId: string;
  playerName: string;
}

export default function PlayerArchiveButton({ playerId, playerName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  // Close the modal on Escape, restore focus management to the document.
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

  const archive = useCallback(async () => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/players/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "inactive" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Archive failed. Try again.");
        setSubmitting(false);
        return;
      }
      // Hand off to the roster with a banner. router.refresh wouldn't help —
      // the layout above the profile expects an `active` player.
      startTransition(() => {
        router.push(
          `/admin/players?archived=${encodeURIComponent(playerName)}`,
        );
      });
    } catch (err) {
      console.error("[PlayerArchiveButton] threw:", err);
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }, [playerId, playerName, router, startTransition, submitting]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#EF4444]/40 text-[#EF4444] text-[12px] font-semibold hover:bg-[#EF4444]/[0.06] transition-colors"
      >
        <Archive className="w-3.5 h-3.5" />
        Archive
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          aria-modal="true"
          role="dialog"
          aria-labelledby="archive-modal-title"
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
              id="archive-modal-title"
              className="text-[17px] font-semibold tracking-tight text-[#0A0A0B]"
            >
              Archive {playerName}?
            </h2>
            <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">
              This hides them from the active roster. They can be restored
              later by re-running their record through the admin tool.
            </p>

            {error && (
              <p
                role="alert"
                className="mt-3 text-[12px] text-[#EF4444]"
              >
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
                onClick={archive}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#EF4444] text-[#EF4444] text-[13px] font-semibold hover:bg-[#EF4444]/[0.06] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {submitting ? "Archiving…" : "Confirm Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
