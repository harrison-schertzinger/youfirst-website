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
  placement,
  season,
  expiresAt,
}: {
  token: string;
  initiallyConfirmed: boolean;
  email: string;
  /** The exact Addendum B2 display string — "2030 Blue", never a paraphrase. */
  placement: string;
  season: string;
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
          She is on <span className="text-white">{placement}</span> for the{" "}
          {season} season. The Club Standard is on its way to{" "}
          <span className="text-white">{email}</span> — the season, the
          structure, the staff, and what is expected, in one document.
        </p>
      </div>
    );
  }

  const deadline = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="mt-8">
      {/* Addendum B3: what happens next, stated as fact. No marketing prose,
          and never a sentence that opens by naming what she did not get. */}
      <div className="mb-8 space-y-3 text-[16px] leading-relaxed text-[#C9CDD3]">
        <p>
          Confirming holds her place on{" "}
          <span className="text-white">{placement}</span> for the {season} season.
        </p>
        <p>
          The Club Standard comes to{" "}
          <span className="text-white">{email}</span> straight away — the season,
          the structure, the staff, and what is expected, in one document.
        </p>
        {deadline && (
          <p>
            Her place is held through{" "}
            <span className="text-white">{deadline}</span>.
          </p>
        )}
      </div>

      <button
        onClick={confirm}
        disabled={busy}
        style={{ background: ACCENT }}
        className="flex w-full items-center justify-center gap-2 rounded-md px-6 py-[18px] text-[17px] font-bold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-5 w-5 animate-spin" />}
        Confirm her spot
      </button>

      {error && <p className="mt-4 text-[15px] text-[#F87171]">{error}</p>}
    </div>
  );
}
