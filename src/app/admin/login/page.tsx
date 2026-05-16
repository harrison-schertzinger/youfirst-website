"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { isEmailAllowed } from "@/lib/admin-auth";

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const queryError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  // Translate ?error=… into a friendly banner. The layout redirects here
  // with `not_authorized` when a logged-in user isn't on the allowlist.
  useEffect(() => {
    if (!queryError) return;
    if (queryError === "auth_failed") {
      setError("That sign-in link is invalid or expired. Request a new one.");
    } else if (queryError === "missing_code") {
      setError("Your sign-in link is missing a code. Request a new one.");
    } else if (queryError === "not_authorized") {
      setError("Your account doesn't have access to the Command Center.");
    } else {
      setError("Something went wrong with that sign-in link.");
    }
  }, [queryError]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);

    const trimmed = email.trim().toLowerCase();

    // Defence-in-depth: refuse to even send a magic link to a
    // non-allowlist address. The layout enforces this again server-side
    // for anyone who actually obtains a session.
    if (!isEmailAllowed(trimmed)) {
      setError("This email is not authorized for admin access.");
      setSubmitting(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${window.location.origin}/api/admin/auth/callback`,
        },
      });
      if (otpError) {
        console.error("[admin/login] signInWithOtp failed:", otpError);
        setError(
          "We couldn't send a sign-in link. Try again in a moment, or email kathleen@youfirstlacrosse.com.",
        );
        setSubmitting(false);
        return;
      }
      setSent(true);
    } catch (err) {
      console.error("[admin/login] threw:", err);
      setError("Network error. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[400px]">
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-8">
          <div className="text-center">
            <div className="text-[20px] font-bold tracking-tight text-[#0A0A0B]">
              You. First
            </div>
            <div className="mt-1 text-sm text-[#6B7280]">Command Center</div>
          </div>

          <div className="my-7 h-px w-full bg-[#E5E7EB]" />

          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full mx-auto bg-[#34D399]/10 text-[#10B981] flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="mt-4 text-[17px] font-semibold tracking-tight text-[#0A0A0B]">
                Check your email
              </h1>
              <p className="mt-2 text-sm text-[#6B7280]">
                We sent a sign-in link to <span className="text-[#0A0A0B]">{email.trim().toLowerCase()}</span>. Click the link to access the Command Center.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="mt-6 text-[12px] font-medium text-[#6B7280] hover:text-[#0A0A0B] underline underline-offset-2 transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <label className="block">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] mb-1.5">
                  Email
                </span>
                <input
                  type="email"
                  autoFocus
                  required
                  autoComplete="email"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="you@theyoufirstproject.com"
                  className={`w-full bg-white border rounded-lg px-3 py-2.5 text-[14px] text-[#0A0A0B] placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-2 transition-colors ${
                    error
                      ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20"
                      : "border-[#E5E7EB] focus:border-[#4A90D9] focus:ring-[#4A90D9]/20"
                  }`}
                />
              </label>

              {error && (
                <p role="alert" className="text-[12px] text-[#EF4444]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || email.trim() === ""}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold tracking-wide hover:bg-[#3A7BC8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Sending…" : "Send Sign-In Link"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">
          Authorized access only
        </p>
      </div>
    </main>
  );
}
