"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

// ─── One button ──────────────────────────────────────────────────────────────
// The whole interaction. No form, no login, nothing to type. The button
// disables the instant it is pressed, and the server claims the confirmation
// atomically anyway, so a double-tap on a slow phone cannot double-confirm.

const ACCENT = "#4B9CD3";

export default function ConfirmClient({
  token,
  initiallyConfirmed,
  email,
  expiresAt,
}: {
  token: string;
  initiallyConfirmed: boolean;
  email: string;
  expiresAt?: string;
}) {
  const [confirmed, setConfirmed] = useState(initiallyConfirmed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/placement/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error === "expired"
            ? "This link has expired. Reply to our email and we'll get her confirmed."
            : "We couldn't save that. Please try once more.",
        );
      }
      setConfirmed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try once more.");
    } finally {
      setBusy(false);
    }
  }

  if (confirmed) {
    return (
      <div className="mt-8">
        <div
          className="flex items-center gap-2 text-[17px] font-bold"
          style={{ color: ACCENT }}
        >
          <Check className="h-5 w-5" />
          Her spot is confirmed.
        </div>
        <p className="mt-4 text-[16px] leading-relaxed text-[#C9CDD3]">
          The Club Standard is on its way to{" "}
          <span className="text-white">{email}</span> — everything about the
          season, the staff, and what we expect, in one document.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <button
        onClick={confirm}
        disabled={busy}
        style={{ background: ACCENT }}
        className="flex w-full items-center justify-center gap-2 rounded-md px-6 py-[18px] text-[17px] font-bold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-5 w-5 animate-spin" />}
        Confirm her spot
      </button>

      {expiresAt && (
        <p className="mt-4 text-[14px] text-[#8A9099]">
          This link is good through{" "}
          {new Date(expiresAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
          .
        </p>
      )}

      {error && <p className="mt-4 text-[15px] text-[#F87171]">{error}</p>}
    </div>
  );
}
