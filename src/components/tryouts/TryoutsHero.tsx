"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { TRYOUT_PHOTOS } from "@/lib/tryouts";

export default function TryoutsHero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background photo with Ken Burns */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 animate-ken-burns">
          {/* Hero photo — swap via TRYOUT_PHOTOS.hero in src/lib/tryouts.ts */}
          <Image
            src={TRYOUT_PHOTOS.hero}
            alt="You. First team huddled together on the field"
            fill
            className="object-cover object-[center_30%]"
            sizes="100vw"
            priority
          />
        </div>
      </div>

      {/* Heavy gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom,
            rgba(0,0,0,0.80) 0%,
            rgba(0,0,0,0.70) 25%,
            rgba(0,0,0,0.64) 50%,
            rgba(0,0,0,0.58) 75%,
            rgba(0,0,0,0.70) 100%)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto py-28">
        {/* Glass pill badge */}
        <div
          className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-10 transition-all duration-700 ${
            loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
          <span className="text-[13px] text-white/80 tracking-[0.15em] uppercase font-semibold">
            2026 Tryouts — Completely Free
          </span>
        </div>

        {/* Eyebrow lockup */}
        <p
          className={`text-base sm:text-lg text-white/60 font-light tracking-[0.25em] uppercase mb-5 transition-all duration-700 ${
            loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
          }`}
          style={{ transitionDelay: "150ms", textShadow: "0 1px 12px rgba(0,0,0,0.4)" }}
        >
          YOU<span className="text-accent-blue">.</span> FIRST Elite Lacrosse
        </p>

        {/* Main headline */}
        <h1
          className={`mb-6 transition-all duration-700 ${
            loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
          }`}
          style={{ transitionDelay: "300ms", textShadow: "0 2px 40px rgba(0,0,0,0.5)" }}
        >
          <span className="block text-[3rem] sm:text-[5rem] md:text-[6.5rem] lg:text-[8rem] font-extrabold text-white tracking-[-0.03em] leading-[0.85]">
            TRYOUTS
          </span>
        </h1>

        {/* Subhead */}
        <p
          className={`text-lg sm:text-2xl text-white/85 font-light tracking-[0.1em] uppercase max-w-2xl mx-auto mb-12 transition-all duration-700 ${
            loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
          }`}
          style={{ transitionDelay: "450ms", textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}
        >
          Build &amp; bring the best players together.
        </p>

        {/* CTAs */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 ${
            loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
          }`}
          style={{ transitionDelay: "600ms" }}
        >
          <a
            href="#register"
            className="inline-flex items-center justify-center px-8 py-4 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(74,144,217,0.4)] hover:shadow-[0_4px_24px_rgba(74,144,217,0.55)] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 min-w-[220px]"
          >
            Register — Free
          </a>
          <a
            href="#dates"
            className="inline-flex items-center justify-center px-8 py-4 border border-white/25 text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl hover:bg-white/10 hover:border-white/40 hover:-translate-y-0.5 transition-all duration-300 min-w-[220px] backdrop-blur-sm"
          >
            See the Dates
          </a>
        </div>

        {/* Understated make-up nudge — quiet secondary link; smooth-scrolls
            (globals.css html{scroll-behavior:smooth}) to the make-up section,
            which deep-links into the form's make-up mode. */}
        <div
          className={`mt-7 transition-all duration-700 ${
            loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
          }`}
          style={{ transitionDelay: "780ms" }}
        >
          <a
            href="#youth"
            className="arrow-link inline-flex items-center gap-1.5 text-[13px] text-white/55 hover:text-white/90 transition-colors duration-200"
          >
            Free evaluations every morning through Aug 7 — get evaluated on the
            spot and hear that day. Prefer a set date? Saturday, July 25.
            <span className="arrow">&rarr;</span>
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-10 transition-all duration-700 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        style={{ transitionDelay: "900ms" }}
      >
        <div className="flex flex-col items-center gap-2 animate-pulse-chevron">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium">
            Scroll
          </span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-white/30">
            <path d="M4 8L10 14L16 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </section>
  );
}
