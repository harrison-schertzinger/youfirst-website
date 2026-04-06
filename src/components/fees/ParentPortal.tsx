"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import RegistrationModal from "@/components/portal/RegistrationModal";

export default function ParentPortal() {
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
      setEmail("");
    }
  }

  return (
    <section className="relative min-h-[calc(100vh-80px)] flex items-center justify-center bg-background overflow-hidden">
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(74, 144, 217, 0.05), transparent)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-md px-6 py-32 text-center">
        {/* Section label */}
        <p
          className={`section-label mb-6 transition-all duration-700 ${
            loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
          }`}
        >
          Player Portal
        </p>

        {/* Headline */}
        <h1
          className={`text-[2.5rem] sm:text-[3.5rem] font-extrabold tracking-[-0.03em] leading-[0.95] mb-5 transition-all duration-800 ${
            loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
          }`}
          style={{ transitionDelay: "150ms" }}
        >
          <span className="gradient-text">Player Portal</span>
        </h1>

        {/* Subline */}
        <p
          className={`text-base text-[#6B7280] leading-[1.75] mb-10 transition-all duration-800 ${
            loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
          }`}
          style={{ transitionDelay: "300ms" }}
        >
          Sign in to access your player&apos;s profile, schedule, and payment history.
        </p>

        {status === "sent" ? (
          /* Success state */
          <div
            className={`transition-all duration-800 ${
              loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
            }`}
            style={{ transitionDelay: "450ms" }}
          >
            <div className="flex items-center justify-center gap-3 px-6 py-5 rounded-xl border border-accent-green/20 bg-accent-green/5">
              <svg
                className="w-6 h-6 text-accent-green flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <div className="text-left">
                <p className="text-sm font-semibold text-[#1A1A1A]">Check your email</p>
                <p className="text-sm text-[#6B7280]">
                  We sent a sign-in link. Click it to access your portal.
                </p>
              </div>
            </div>
            <button
              onClick={() => setStatus("idle")}
              className="mt-6 text-sm text-accent-blue hover:text-accent-blue-hover transition-colors duration-200 underline underline-offset-2"
            >
              Use a different email
            </button>
          </div>
        ) : (
          /* Form */
          <>
            <form
              onSubmit={handleSubmit}
              className={`flex flex-col sm:flex-row gap-3 mb-8 transition-all duration-800 ${
                loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
              }`}
              style={{ transitionDelay: "450ms" }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@email.com"
                disabled={status === "sending"}
                className="flex-1 px-5 py-3.5 rounded-xl border border-[#E5E7EB] bg-white text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className="px-6 py-3.5 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(74,144,217,0.4)] hover:shadow-[0_4px_24px_rgba(74,144,217,0.55)] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 whitespace-nowrap disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:scale-100"
              >
                {status === "sending" ? "Sending..." : "Send Sign-In Link"}
              </button>
            </form>

            {status === "error" && (
              <p className="text-sm text-red-500 mb-4">{errorMsg}</p>
            )}

            {/* First time note */}
            <p
              className={`text-sm text-[#9CA3AF] transition-all duration-800 ${
                loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
              }`}
              style={{ transitionDelay: "600ms" }}
            >
              First time?{" "}
              <a
                href="mailto:kathleen@youfirstlacrosse.com"
                className="text-accent-blue hover:text-accent-blue-hover transition-colors duration-200 underline underline-offset-2"
              >
                Contact kathleen@youfirstlacrosse.com
              </a>{" "}
              to set up your account.
            </p>
          </>
        )}

        {/* ─── Register divider ─── */}
        <div
          className={`mt-14 transition-all duration-800 ${
            loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
          }`}
          style={{ transitionDelay: "750ms" }}
        >
          <div className="gradient-divider mb-8" />
          <p className="text-sm font-semibold text-[#1A1A1A] mb-3">
            New to You. First?
          </p>
          <button
            type="button"
            onClick={() => setShowRegister(true)}
            className="px-8 py-3.5 bg-white text-accent-blue text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl border-2 border-accent-blue hover:bg-accent-blue hover:text-white hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300"
          >
            Register Your Player
          </button>
        </div>
      </div>

      {/* Registration modal */}
      {showRegister && (
        <RegistrationModal onClose={() => setShowRegister(false)} />
      )}
    </section>
  );
}
