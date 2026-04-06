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

      <div className="relative z-10 mx-auto max-w-lg px-6 py-32">
        {/* ─── Sign-in section ─── */}
        <div className="text-center mb-16">
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
            <span className="gradient-text">Welcome Back</span>
          </h1>

          {/* Subline */}
          <p
            className={`text-base text-[#6B7280] leading-[1.75] mb-10 transition-all duration-800 ${
              loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
            }`}
            style={{ transitionDelay: "300ms" }}
          >
            Your player&apos;s world, all in one place.
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
            <>
              <form
                onSubmit={handleSubmit}
                className={`flex flex-col sm:flex-row gap-3 transition-all duration-800 ${
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
                <p className="text-sm text-red-500 mt-4">{errorMsg}</p>
              )}
            </>
          )}
        </div>

        {/* ─── Registration invitation card ─── */}
        <div
          className={`transition-all duration-800 ${
            loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
          }`}
          style={{ transitionDelay: "700ms" }}
        >
          <div className="gradient-divider mb-16" />

          <div className="relative bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden group hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-500">
            {/* Accent top edge */}
            <div className="h-1 bg-gradient-to-r from-accent-blue via-accent-blue to-accent-green" />

            <div className="p-8 sm:p-10 text-center">
              {/* Welcome icon */}
              <div className="w-14 h-14 rounded-2xl bg-accent-blue/8 flex items-center justify-center mx-auto mb-6 group-hover:bg-accent-blue/12 transition-colors duration-300">
                <svg className="w-7 h-7 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-[#1A1A1A] tracking-tight mb-2">
                New to You<span className="text-accent-blue">.</span> First?
              </h2>
              <p className="text-sm text-[#6B7280] leading-relaxed mb-8 max-w-xs mx-auto">
                Join Cincinnati&apos;s premier college prep lacrosse club.
                Registration takes about 5 minutes.
              </p>

              <button
                type="button"
                onClick={() => setShowRegister(true)}
                className="px-8 py-3.5 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(74,144,217,0.4)] hover:shadow-[0_4px_24px_rgba(74,144,217,0.55)] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                Register Your Player
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Registration modal */}
      {showRegister && (
        <RegistrationModal onClose={() => setShowRegister(false)} />
      )}
    </section>
  );
}
