"use client";

import { useEffect, useState } from "react";

export default function FeesHero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 lg:pt-48 lg:pb-32 overflow-hidden bg-background">
      {/* Subtle radial background glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(74, 144, 217, 0.06), transparent)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-8 text-center">
        {/* Pill badge */}
        <div
          className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-accent-blue/5 border border-accent-blue/15 mb-10 transition-all duration-700 ${
            loaded
              ? "opacity-100 translate-y-0 blur-0"
              : "opacity-0 translate-y-4 blur-sm"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
          <span className="text-[13px] text-accent-blue tracking-[0.15em] uppercase font-semibold">
            2025–2026 Season
          </span>
        </div>

        {/* Headline */}
        <h1
          className={`mb-6 transition-all duration-800 ${
            loaded
              ? "opacity-100 translate-y-0 blur-0"
              : "opacity-0 translate-y-4 blur-sm"
          }`}
          style={{ transitionDelay: "200ms" }}
        >
          <span className="block text-[2.5rem] sm:text-[3.5rem] md:text-[4.5rem] lg:text-[5.5rem] font-extrabold tracking-[-0.03em] leading-[0.9]">
            <span className="gradient-text">Team Fees</span>
            <span className="gradient-text-blue"> & </span>
            <span className="gradient-text">Payment Plans</span>
          </span>
        </h1>

        {/* Subline */}
        <p
          className={`text-lg sm:text-xl text-[#6B7280] max-w-xl mx-auto font-light leading-[1.75] transition-all duration-800 ${
            loaded
              ? "opacity-100 translate-y-0 blur-0"
              : "opacity-0 translate-y-4 blur-sm"
          }`}
          style={{ transitionDelay: "400ms" }}
        >
          Invest in your daughter&apos;s development. Choose the plan that works for
          your family.
        </p>

        {/* Scroll hint arrow */}
        <div
          className={`mt-14 transition-all duration-700 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDelay: "600ms" }}
        >
          <div className="flex flex-col items-center gap-2 animate-pulse-chevron">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="text-[#9CA3AF]"
            >
              <path
                d="M4 8L10 14L16 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
