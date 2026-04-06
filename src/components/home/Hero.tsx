"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Hero() {
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
          <Image
            src="/images/team/DWW07274.JPG"
            alt="You. First Elite Lacrosse players in light blue jerseys raising their sticks to the sky"
            fill
            className="object-cover object-[center_40%]"
            sizes="100vw"
            priority
          />
        </div>
      </div>

      {/* Heavy gradient overlay — text area gets maximum coverage */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(to bottom,
              rgba(0,0,0,0.75) 0%,
              rgba(0,0,0,0.65) 25%,
              rgba(0,0,0,0.55) 50%,
              rgba(0,0,0,0.3) 75%,
              rgba(0,0,0,0.45) 100%
            )
          `,
        }}
      />

      {/* Content — staggered reveal */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Pill badge — matches youprjct "DEFAULT MODE: EXCELLENCE" */}
        <div
          className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-10 transition-all duration-700 ${
            loaded
              ? "opacity-100 translate-y-0 blur-0"
              : "opacity-0 translate-y-4 blur-sm"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
          <span className="text-[13px] text-white/80 tracking-[0.15em] uppercase font-semibold">
            Southern Ohio&apos;s Premier College Prep Club
          </span>
        </div>

        {/* Main headline — MASSIVE */}
        <h1
          className={`mb-6 transition-all duration-800 ${
            loaded
              ? "opacity-100 translate-y-0 blur-0"
              : "opacity-0 translate-y-4 blur-sm"
          }`}
          style={{ transitionDelay: "200ms", textShadow: "0 2px 40px rgba(0,0,0,0.5)" }}
        >
          <span className="block text-[3.5rem] sm:text-[4.5rem] md:text-[5.5rem] lg:text-[7rem] font-extrabold text-white tracking-[-0.02em] leading-[0.9]">
            YOU
            <span className="text-accent-blue">.</span>
            {" "}FIRST
          </span>
        </h1>

        {/* Elite Lacrosse — bigger, more visible */}
        <p
          className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extralight text-white/70 tracking-[0.2em] uppercase mb-6 transition-all duration-800 ${
            loaded
              ? "opacity-100 translate-y-0 blur-0"
              : "opacity-0 translate-y-4 blur-sm"
          }`}
          style={{ transitionDelay: "350ms", textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}
        >
          Elite Lacrosse
        </p>

        {/* Tagline — readable */}
        <p
          className={`text-base sm:text-lg text-white/60 font-light tracking-[0.15em] uppercase max-w-xl mx-auto mb-14 transition-all duration-800 ${
            loaded
              ? "opacity-100 translate-y-0 blur-0"
              : "opacity-0 translate-y-4 blur-sm"
          }`}
          style={{ transitionDelay: "500ms", textShadow: "0 1px 12px rgba(0,0,0,0.4)" }}
        >
          Build &amp; Bring the Best Together
        </p>

        {/* CTA buttons */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-800 ${
            loaded
              ? "opacity-100 translate-y-0 blur-0"
              : "opacity-0 translate-y-4 blur-sm"
          }`}
          style={{ transitionDelay: "650ms" }}
        >
          <Link
            href="/schedule"
            className="inline-flex items-center justify-center px-8 py-4 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(74,144,217,0.4)] hover:shadow-[0_4px_24px_rgba(74,144,217,0.55)] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 min-w-[200px]"
          >
            View Schedule
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 border border-white/25 text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl hover:bg-white/10 hover:border-white/40 hover:-translate-y-0.5 transition-all duration-300 min-w-[200px] backdrop-blur-sm"
          >
            Join the Family
          </Link>
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
