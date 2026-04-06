"use client";

import { useState, useEffect } from "react";

export default function ParentPortal() {
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [toast, setToast] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setToast(true);
    setEmail("");
    setTimeout(() => setToast(false), 5000);
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
          Parent Portal
        </p>

        {/* Headline */}
        <h1
          className={`text-[2.5rem] sm:text-[3.5rem] font-extrabold tracking-[-0.03em] leading-[0.95] mb-5 transition-all duration-800 ${
            loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
          }`}
          style={{ transitionDelay: "150ms" }}
        >
          <span className="gradient-text">Your Account</span>
        </h1>

        {/* Subline */}
        <p
          className={`text-base text-[#6B7280] leading-[1.75] mb-10 transition-all duration-800 ${
            loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
          }`}
          style={{ transitionDelay: "300ms" }}
        >
          Sign in to view your payment history, account balance, and make payments.
        </p>

        {/* Form */}
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
            className="flex-1 px-5 py-3.5 rounded-xl border border-[#E5E7EB] bg-white text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200"
          />
          <button
            type="submit"
            className="px-6 py-3.5 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(74,144,217,0.4)] hover:shadow-[0_4px_24px_rgba(74,144,217,0.55)] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 whitespace-nowrap"
          >
            Send Sign-In Link
          </button>
        </form>

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
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="flex items-center gap-3 px-6 py-4 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-accent-blue/20 bg-white backdrop-blur-sm">
            <svg
              className="w-5 h-5 text-accent-blue flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium text-[#1A1A1A]">
              Parent portal launching soon. Contact{" "}
              <a
                href="mailto:kathleen@youfirstlacrosse.com"
                className="text-accent-blue underline underline-offset-2"
              >
                kathleen@youfirstlacrosse.com
              </a>{" "}
              for account inquiries.
            </p>
            <button
              onClick={() => setToast(false)}
              className="ml-2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
              aria-label="Dismiss"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
