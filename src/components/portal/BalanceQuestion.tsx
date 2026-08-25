"use client";

import { useRef, useState } from "react";
import { useIsPreview } from "./PaymentDashboard";

const MAX_LENGTH = 2000;

/**
 * "Question about your balance?" — the correction channel.
 *
 * Framing is deliberate: we are inviting a correction, not offering a way to
 * defer paying. It is not called a dispute and it does not offer to "request an
 * adjustment".
 *
 * The submission goes to Harrison and Kathleen by email AND lands in the admin
 * queue at /admin/questions. Email is a notification, never the queue.
 */
export default function BalanceQuestion({
  playerId,
  playerFirstName,
}: {
  playerId: string;
  playerFirstName: string;
}) {
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");
  const inFlightRef = useRef(false);

  const trimmed = message.trim();
  const canSubmit = trimmed.length > 0 && state !== "sending";

  const isPreview = useIsPreview();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || inFlightRef.current) return;
    // Preview screen: this would write a real row against a synthetic player.
    if (isPreview) {
      setState("error");
      setErrorMsg("Preview only — sending is disabled on this screen.");
      return;
    }
    inFlightRef.current = true;
    setState("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/portal/balance-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, message: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setState("sent");
        setMessage("");
        inFlightRef.current = false;
        return;
      }
      setState("error");
      setErrorMsg(
        typeof data.error === "string"
          ? data.error
          : "We couldn’t send that. Please try again.",
      );
    } catch {
      setState("error");
      setErrorMsg("Network error. Please try again.");
    }
    inFlightRef.current = false;
  }

  if (state === "sent") {
    return (
      <div className="mt-10 rounded-xl border border-[#34D399]/25 bg-[#34D399]/5 p-6">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 shrink-0 text-[#34D399] mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-[14px] font-semibold text-[#1A1A1A]">
              Got it — this is with Harrison and Kathleen now.
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">
              A real person has {playerFirstName}’s numbers in front of them and
              will get back to you directly. Nothing further to do.
            </p>
            <button
              type="button"
              onClick={() => setState("idle")}
              className="mt-3 text-[12px] font-semibold text-[#4A90D9] underline underline-offset-2 hover:text-[#3A7BC0]"
            >
              Send another note
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10">
      <label
        htmlFor={`balance-question-${playerId}`}
        className="block text-[14px] font-semibold text-[#1A1A1A]"
      >
        Question about your balance?
      </label>
      <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">
        If something here doesn’t match what we agreed, or {playerFirstName}{" "}
        missed part of the season, tell us and we’ll get it right.
      </p>

      <textarea
        id={`balance-question-${playerId}`}
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
        maxLength={MAX_LENGTH}
        rows={4}
        placeholder="Tell us what looks off…"
        className="mt-3 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-[14px] text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:border-[#4A90D9] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 resize-y"
      />

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[11px] tabular-nums text-[#9CA3AF]">
          {trimmed.length}/{MAX_LENGTH}
        </span>
        <button
          type="submit"
          disabled={!canSubmit}
          className={[
            "min-h-[44px] px-6 rounded-xl text-[12px] font-bold uppercase tracking-[0.12em] text-white transition-all",
            "bg-[#1A1A1A] hover:bg-[#000] disabled:opacity-40 disabled:cursor-not-allowed",
          ].join(" ")}
        >
          {state === "sending" ? "Sending…" : "Send"}
        </button>
      </div>

      {state === "error" && (
        <p className="mt-2 text-[12px] text-[#EF4444]">{errorMsg}</p>
      )}
    </form>
  );
}
