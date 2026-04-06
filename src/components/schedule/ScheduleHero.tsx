"use client";

import { useEffect, useState } from "react";

export default function ScheduleHero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* Dark hero band — ensures Navbar text (white on transparent) is readable */}
      <div className="bg-[#0A0A0B] pt-32 pb-20 sm:pt-36 sm:pb-24">
        {/* Subtle blue glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(74,144,217,0.10) 0%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-[1280px] px-6 lg:px-8 text-center">
          <div
            className={`transition-all duration-700 ${
              loaded
                ? "opacity-100 translate-y-0 blur-0"
                : "opacity-0 translate-y-4 blur-sm"
            }`}
          >
            <p className="section-label mb-5">Summer 2026</p>
          </div>

          <h1
            className={`text-[2.5rem] sm:text-[3.5rem] md:text-[4.5rem] lg:text-[5.5rem] font-bold tracking-tight leading-[0.95] mb-6 transition-all duration-800 ${
              loaded
                ? "opacity-100 translate-y-0 blur-0"
                : "opacity-0 translate-y-4 blur-sm"
            }`}
            style={{ transitionDelay: "150ms" }}
          >
            <span className="text-white">Season </span>
            <span className="gradient-text-light">Schedule</span>
          </h1>

          <p
            className={`text-lg sm:text-xl text-white/50 font-light max-w-lg mx-auto transition-all duration-800 ${
              loaded
                ? "opacity-100 translate-y-0 blur-0"
                : "opacity-0 translate-y-4 blur-sm"
            }`}
            style={{ transitionDelay: "300ms" }}
          >
            Your complete guide to the season ahead.
          </p>
        </div>
      </div>
    </section>
  );
}
