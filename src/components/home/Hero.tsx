"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { MISSION } from "@/lib/program";

export default function Hero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const reveal = `transition-all duration-700 ${
    loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
  }`;

  return (
    <section className="relative min-h-[92vh] flex items-end overflow-hidden bg-[#0A0A0A]">
      {/* Full-bleed game photography — real competition, real uniforms */}
      <div className="absolute inset-0">
        <Image
          src="/images/game/game-dodge.jpg"
          alt="You First player #3 dodging past a defender in a tournament game"
          fill
          className="hidden sm:block object-cover object-[center_22%]"
          sizes="100vw"
          priority
        />
        <Image
          src="/images/game/game-sprint-12.jpg"
          alt="You First player #12 sprinting upfield in the black game uniform"
          fill
          className="sm:hidden object-cover object-[center_30%]"
          sizes="100vw"
          priority
        />
      </div>

      {/* Legibility scrim — black, bottom-weighted */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(10,10,10,0.88) 0%, rgba(10,10,10,0.55) 38%, rgba(10,10,10,0.18) 70%, rgba(10,10,10,0.25) 100%)",
        }}
      />

      {/* Content — anchored low, editorial left on desktop */}
      <div className="relative z-10 w-full mx-auto max-w-[1280px] px-6 lg:px-8 pb-16 sm:pb-20 pt-40">
        <div className="max-w-3xl text-center sm:text-left mx-auto sm:mx-0">
          <div className={reveal}>
            <Link
              href="/tryouts"
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/10 border border-white/25 backdrop-blur-sm mb-7 hover:border-accent-blue transition-colors duration-200"
            >
              <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
              <span className="text-[13px] text-white/90 tracking-[0.12em] uppercase font-semibold">
                Tryouts · Saturday, July 11
              </span>
            </Link>
          </div>

          <h1 className={reveal} style={{ transitionDelay: "150ms" }}>
            <span className="block text-[2.5rem] sm:text-[3.7rem] lg:text-[4.6rem] font-extrabold tracking-[-0.025em] leading-[1.02] text-white text-balance">
              {MISSION.headline}
            </span>
            <span className="block text-[2.5rem] sm:text-[3.7rem] lg:text-[4.6rem] font-extrabold tracking-[-0.025em] leading-[1.02] text-accent-blue text-balance">
              {MISSION.headlineAccent}
            </span>
          </h1>

          <p
            className={`mt-6 text-lg sm:text-xl text-white/85 leading-[1.65] max-w-2xl mx-auto sm:mx-0 ${reveal}`}
            style={{ transitionDelay: "300ms", textShadow: "0 1px 20px rgba(0,0,0,0.4)" }}
          >
            Girls&apos; lacrosse in Cincinnati, built around one promise: every
            price, the whole season, and the full path — published right here.
            No &ldquo;text Coach for details.&rdquo;
          </p>

          <div
            className={`mt-9 flex flex-col sm:flex-row items-center sm:items-start gap-4 ${reveal}`}
            style={{ transitionDelay: "450ms" }}
          >
            <Link
              href="/tryouts"
              className="inline-flex items-center justify-center px-8 py-4 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_20px_rgba(75,156,211,0.5)] hover:bg-accent-blue-hover hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 min-w-[230px]"
            >
              Register for Tryouts — $50
            </Link>
            <a
              href="#programs"
              className="inline-flex items-center justify-center px-8 py-4 border-[1.5px] border-white/35 text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl backdrop-blur-sm hover:bg-white/10 hover:border-white/60 hover:-translate-y-0.5 transition-all duration-300 min-w-[230px]"
            >
              Programs &amp; Pricing
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
