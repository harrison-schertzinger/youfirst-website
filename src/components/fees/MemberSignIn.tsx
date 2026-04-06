"use client";

import { useState } from "react";
import ScrollReveal from "@/components/home/ScrollReveal";

export default function MemberSignIn() {
  const [email, setEmail] = useState("");
  const [toast, setToast] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setToast(true);
    setEmail("");
    setTimeout(() => setToast(false), 5000);
  }

  return (
    <section className="py-24 sm:py-32 lg:py-40 bg-section-alt" id="member-signin">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <ScrollReveal>
          <div className="max-w-md mx-auto text-center">
            <p className="section-label mb-5">Parent Portal</p>
            <h2 className="text-[2rem] md:text-[2.5rem] font-bold tracking-tight leading-[1.1] text-[#1A1A1A] mb-4">
              Already a Member?
            </h2>
            <p className="text-base text-[#6B7280] leading-[1.75] mb-10">
              Sign in to view your payment history and account balance.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
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
          </div>
        </ScrollReveal>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="flex items-center gap-3 px-6 py-4 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-accent-blue/20 bg-white backdrop-blur-sm">
            <svg className="w-5 h-5 text-accent-blue flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-[#1A1A1A]">
              Parent portal coming soon. Contact{" "}
              <a
                href="mailto:kathleen@youfirstelitelacrosseclub.com"
                className="text-accent-blue underline underline-offset-2"
              >
                kathleen@youfirstelitelacrosseclub.com
              </a>{" "}
              for account inquiries.
            </p>
            <button
              onClick={() => setToast(false)}
              className="ml-2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
